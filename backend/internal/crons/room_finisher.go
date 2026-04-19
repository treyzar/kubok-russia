package crons

import (
	"context"
	"log"
	"math/rand"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/hx/eon"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RoomFinisher(pool *pgxpool.Pool) func(*eon.Context) error {
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

			// Select winner by weighted probability: stake / jackpot
			winnerID := selectWeightedWinner(players, room.Jackpot)
			if winnerID == 0 {
				log.Printf("[RoomFinisher] ❌ Failed to select winner for room %d", room.RoomID)
				continue
			}

			log.Printf("[RoomFinisher] 🎲 Selected winner user ID %d for room %d", winnerID, room.RoomID)

			// Atomically: set room to finished + award winner 80% of jackpot
			result, err := queries.FinishRoomAndAwardWinner(context.Background(), repository.FinishRoomAndAwardWinnerParams{
				RoomID:  room.RoomID,
				Column2: room.Jackpot,
				ID:      winnerID,
			})
			if err != nil {
				log.Printf("[RoomFinisher] ❌ Failed to finish room %d: %v", room.RoomID, err)
				continue
			}

			prize := room.Jackpot * 80 / 100
			log.Printf("[RoomFinisher] 🏆 Room %d finished! Winner: user %d, Prize: %d (80%% of jackpot %d)", room.RoomID, result.UserID, prize, room.Jackpot)
		}

		return nil
	}
}

// selectWeightedWinner picks a winner where each player's probability = their_stake / jackpot
func selectWeightedWinner(players []repository.GetPlayersWithStakesRow, jackpot int32) int32 {
	if jackpot <= 0 {
		// Fallback: uniform random if jackpot is 0
		return players[rand.Intn(len(players))].UserID
	}

	// Build cumulative weights
	type entry struct {
		userID     int32
		cumulative int32
	}

	entries := make([]entry, 0, len(players))
	var cumulative int32
	for _, p := range players {
		cumulative += p.TotalStake
		entries = append(entries, entry{userID: p.UserID, cumulative: cumulative})
	}

	// Pick a random value in [0, total_stake)
	roll := rand.Int31n(cumulative)
	for _, e := range entries {
		if roll < e.cumulative {
			return e.userID
		}
	}

	// Fallback
	return players[len(players)-1].UserID
}
