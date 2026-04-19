package crons

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal"
	"github.com/SomeSuperCoder/OnlineShop/internal/redisclient"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/hx/eon"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RoomFinisher(pool *pgxpool.Pool, config *internal.AppConfig, pubSub *redisclient.PubSub) func(*eon.Context) error {
	return func(ctx *eon.Context) error {
		queries := repository.New(pool)

		// Get all playing rooms whose start_time + 30 seconds has passed
		rooms, err := queries.ListPlayingRoomsReadyToFinish(context.Background())
		if err != nil {
			log.Printf("[RoomFinisher] Error listing rooms: %v", err)
			return err
		}

		for _, room := range rooms {
			log.Printf("[RoomFinisher] ⏰ Room %d is ready to finish (jackpot: %d)", room.RoomID, room.Jackpot)

			// Get all players with their stakes
			players, err := queries.GetPlayersWithStakes(context.Background(), repository.GetPlayersWithStakesParams{
				RoomID: room.RoomID,
			})
			if err != nil {
				log.Printf("[RoomFinisher] ❌ Failed to get players for room %d: %v", room.RoomID, err)
				continue
			}

			if len(players) == 0 {
				log.Printf("[RoomFinisher] ⚠️  Room %d has no players, skipping", room.RoomID)
				continue
			}

			// Select winner using configurable RNG
			winnerID := selectWinner(players, room.Jackpot, config.RNGURL)
			if winnerID == 0 {
				log.Printf("[RoomFinisher] ❌ Failed to select winner for room %d", room.RoomID)
				continue
			}

			log.Printf("[RoomFinisher] 🎲 Selected winner user ID %d for room %d", winnerID, room.RoomID)

			// Atomically: set room to finished + award winner using room's winner_pct
			result, err := queries.FinishRoomAndAwardWinnerPct(context.Background(), repository.FinishRoomAndAwardWinnerPctParams{
				RoomID: room.RoomID,
				ID:     winnerID,
			})
			if err != nil {
				log.Printf("[RoomFinisher] ❌ Failed to finish room %d: %v", room.RoomID, err)
				continue
			}

			prize := room.Jackpot * room.WinnerPct / 100
			log.Printf("[RoomFinisher] 🏆 Room %d finished! Winner: user %d, Prize: %d (%d%% of jackpot %d)", room.RoomID, result.UserID, prize, room.WinnerPct, room.Jackpot)

			// Publish finished room snapshot
			if pubSub != nil {
				snapshot := map[string]interface{}{
					"room_id":    room.RoomID,
					"status":     "finished",
					"jackpot":    room.Jackpot,
					"winner_pct": room.WinnerPct,
					"winner_id":  result.UserID,
					"prize":      prize,
					"updated_at": time.Now(),
				}
				if payload, err := json.Marshal(snapshot); err == nil {
					pubSub.Publish(context.Background(), room.RoomID, payload)
				}
			}
		}

		return nil
	}
}

// selectWinner picks a winner by weighted probability.
// When rngURL is set it calls the external RNG API; on any error it falls back to local math/rand.
func selectWinner(players []repository.GetPlayersWithStakesRow, jackpot int32, rngURL string) int32 {
	// Compute total stake across all players
	var totalStake int32
	for _, p := range players {
		totalStake += p.TotalStake
	}

	if totalStake <= 0 {
		return players[rand.Intn(len(players))].UserID
	}

	var roll int32

	if rngURL != "" {
		result, err := callExternalRNG(rngURL, totalStake)
		if err != nil {
			log.Printf("[RoomFinisher] ⚠️  External RNG failed (%v), falling back to local rand", err)
			roll = rand.Int31n(totalStake)
		} else {
			roll = result
		}
	} else {
		roll = rand.Int31n(totalStake)
	}

	// Walk cumulative weights to find the winner
	var cumulative int32
	for _, p := range players {
		cumulative += p.TotalStake
		if roll < cumulative {
			return p.UserID
		}
	}

	return players[len(players)-1].UserID
}

// callExternalRNG calls GET {rngURL}?max={max} and expects {"result": N} in [0, max).
func callExternalRNG(rngURL string, max int32) (int32, error) {
	url := fmt.Sprintf("%s?max=%d", rngURL, max)
	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return 0, fmt.Errorf("http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	var body struct {
		Result int32 `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return 0, fmt.Errorf("decode response: %w", err)
	}

	if body.Result < 0 || body.Result >= max {
		return 0, fmt.Errorf("result %d out of range [0, %d)", body.Result, max)
	}

	return body.Result, nil
}
