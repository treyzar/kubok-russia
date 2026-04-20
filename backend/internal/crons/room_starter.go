package crons

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal/redisclient"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/hx/eon"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RoomStarter(pool *pgxpool.Pool, pubSub *redisclient.PubSub) func(*eon.Context) error {
	executionCount := 0
	return func(ctx *eon.Context) error {
		executionCount++
		queries := repository.New(pool)

		// Get all rooms with status 'starting_soon'
		rooms, err := queries.ListRooms(context.Background())
		if err != nil {
			log.Printf("[RoomStarter] Error listing rooms: %v", err)
			return err
		}

		now := time.Now()
		roomsToStart := 0

		// Count rooms that need to start
		for _, room := range rooms {
			if room.Status == "starting_soon" && room.StartTime.Valid && !room.StartTime.Time.After(now) {
				roomsToStart++
			}
		}

		// Log periodic status every 10 executions (10 seconds)
		if executionCount%10 == 0 {
			log.Printf("[RoomStarter] Execution #%d: Found %d rooms, %d ready to start", executionCount, len(rooms), roomsToStart)
		}

		for _, room := range rooms {
			// Skip if not starting_soon
			if room.Status != "starting_soon" {
				continue
			}

			// Check if start_time is valid and has passed
			if !room.StartTime.Valid {
				log.Printf("[RoomStarter] Room %d has invalid start_time, skipping", room.RoomID)
				continue
			}

			timeUntilStart := room.StartTime.Time.Sub(now)
			if room.StartTime.Time.After(now) {
				if timeUntilStart < 5*time.Second {
					log.Printf("[RoomStarter] Room %d will start in %.1f seconds", room.RoomID, timeUntilStart.Seconds())
				}
				continue
			}

			log.Printf("[RoomStarter] ⏰ Starting room %d (start_time was %v)", room.RoomID, room.StartTime.Time.Format("15:04:05"))

			// Start a transaction for atomic operations
			tx, err := pool.Begin(context.Background())
			if err != nil {
				log.Printf("[RoomStarter] ❌ Failed to start transaction for room %d: %v", room.RoomID, err)
				continue
			}

			txQueries := queries.WithTx(tx)

			// Count current players
			currentPlayers, err := txQueries.CountRoomPlayers(context.Background(), repository.CountRoomPlayersParams{
				RoomID: room.RoomID,
			})
			if err != nil {
				log.Printf("[RoomStarter] ❌ Failed to count players in room %d: %v", room.RoomID, err)
				tx.Rollback(context.Background())
				continue
			}

			// Calculate how many bots to add
			botsNeeded := int(room.PlayersNeeded) - int(currentPlayers)

			if botsNeeded < 0 {
				botsNeeded = 0
			}

			log.Printf("[RoomStarter] 🤖 Room %d needs %d bots (has %d/%d players)", room.RoomID, botsNeeded, currentPlayers, room.PlayersNeeded)

			// Get available bots (excluding those already in the room)
			var bots []repository.GetAvailableBotsForRoomRow
			if botsNeeded > 0 {
				bots, err = txQueries.GetAvailableBotsForRoom(context.Background(), repository.GetAvailableBotsForRoomParams{
					Balance: room.EntryCost,
					RoomID:  room.RoomID,
					Limit:   int32(botsNeeded),
				})
				if err != nil {
					log.Printf("[RoomStarter] ❌ Failed to get bots: %v", err)
					tx.Rollback(context.Background())
					continue
				}

				// Check if we have enough bots
				if len(bots) < botsNeeded {
					log.Printf("[RoomStarter] ⚠️  Not enough bots available for room %d (need %d, found %d). Room will not start.",
						room.RoomID, botsNeeded, len(bots))
					tx.Rollback(context.Background())
					continue
				}
			}

			// Add bots to the room
			addedBots := 0
			for _, bot := range bots {
				// Join the room (this updates room_players, user balance, and room jackpot)
				rows, err := txQueries.BotJoinRoom(context.Background(), repository.BotJoinRoomParams{
					RoomID: room.RoomID,
					ID:     bot.ID,
				})
				if err != nil {
					log.Printf("[RoomStarter] ❌ Failed to add bot %s (ID: %d) to room %d: %v", bot.Name, bot.ID, room.RoomID, err)
					tx.Rollback(context.Background())
					goto nextRoom
				}
				if len(rows) == 0 {
					log.Printf("[RoomStarter] ❌ Bot %s (ID: %d) failed to join room %d (conditions not met)", bot.Name, bot.ID, room.RoomID)
					tx.Rollback(context.Background())
					goto nextRoom
				}

				// Get next available place_index for the room
				nextPlaceIndex, err := txQueries.GetNextPlaceIndex(context.Background(), repository.GetNextPlaceIndexParams{
					RoomID: room.RoomID,
				})
				if err != nil {
					log.Printf("[RoomStarter] ❌ Failed to get next place index for bot %s (ID: %d) in room %d: %v", bot.Name, bot.ID, room.RoomID, err)
					tx.Rollback(context.Background())
					goto nextRoom
				}

				// Insert a single place record for the bot (bots join with 1 place by default)
				_, err = txQueries.InsertRoomPlace(context.Background(), repository.InsertRoomPlaceParams{
					RoomID:     room.RoomID,
					UserID:     bot.ID,
					PlaceIndex: nextPlaceIndex,
				})
				if err != nil {
					log.Printf("[RoomStarter] ❌ Failed to insert place for bot %s (ID: %d) in room %d: %v", bot.Name, bot.ID, room.RoomID, err)
					tx.Rollback(context.Background())
					goto nextRoom
				}

				addedBots++
				log.Printf("[RoomStarter] ✅ Added bot %s to room %d with place index %d", bot.Name, room.RoomID, nextPlaceIndex)
			}

			// Verify we added all needed bots
			if addedBots != botsNeeded {
				log.Printf("[RoomStarter] ❌ Failed to add all bots to room %d (added %d/%d), rolling back",
					room.RoomID, addedBots, botsNeeded)
				tx.Rollback(context.Background())
				continue
			}

			// Now change status to 'playing' (only after all bots are successfully added)
			_, err = txQueries.SetRoomStatus(context.Background(), repository.SetRoomStatusParams{
				RoomID: room.RoomID,
				Status: "playing",
			})
			if err != nil {
				log.Printf("[RoomStarter] ❌ Failed to set room %d to playing: %v", room.RoomID, err)
				tx.Rollback(context.Background())
				continue
			}

			// Commit the transaction
			err = tx.Commit(context.Background())
			if err != nil {
				log.Printf("[RoomStarter] ❌ Failed to commit transaction for room %d: %v", room.RoomID, err)
				continue
			}

			log.Printf("[RoomStarter] 🎮 Room %d successfully started with %d bots added", room.RoomID, addedBots)

			// Publish playing room snapshot
			if pubSub != nil {
				snapshot := map[string]interface{}{
					"room_id":        room.RoomID,
					"status":         "playing",
					"jackpot":        room.Jackpot,
					"players_needed": room.PlayersNeeded,
					"entry_cost":     room.EntryCost,
					"updated_at":     time.Now(),
				}
				if payload, err := json.Marshal(snapshot); err == nil {
					pubSub.Publish(context.Background(), room.RoomID, payload)
				}
			}

		nextRoom:
			// Continue to next room
		}

		return nil
	}
}
