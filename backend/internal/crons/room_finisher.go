package crons

import (
	"context"
	"log"
	"math/rand"

	"github.com/SomeSuperCoder/OnlineShop/internal/events"
	"github.com/SomeSuperCoder/OnlineShop/internal/rng"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/hx/eon"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RoomFinisher(pool *pgxpool.Pool, publisher *events.EventPublisher, rngClient *rng.RNGClient) func(*eon.Context) error {
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

			// Select winner using RNGClient (external with fallback)
			winnerID := selectWinner(context.Background(), players, room.RoomID, rngClient)
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

			// Publish game_finished event with winner and prize info
			publisher.PublishGameFinished(context.Background(), room.RoomID, result.UserID, prize)
		}

		return nil
	}
}

// selectWinner picks a winner by weighted probability using the provided RNGClient.
// The RNGClient handles external vs fallback RNG transparently and logs the source.
func selectWinner(ctx context.Context, players []repository.GetPlayersWithStakesRow, roomID int32, rngClient *rng.RNGClient) int32 {
	// Compute total stake across all players
	var totalStake int32
	for _, p := range players {
		totalStake += p.TotalStake
	}

	if totalStake <= 0 {
		return players[rand.Intn(len(players))].UserID
	}

	roll, err := rngClient.SelectRandom(ctx, totalStake, roomID, int32(len(players)))
	if err != nil {
		log.Printf("[RoomFinisher] ❌ RNG error for room %d: %v", roomID, err)
		return 0
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
