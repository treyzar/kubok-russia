package crons

import (
	"context"
	"log"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/hx/eon"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RoomStarter(ctx *eon.Context) error {
	// Load config
	config := internal.LoadAppConfig()

	// Connect to database
	pool, err := pgxpool.New(context.Background(), config.PostgresURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	queries := repository.New(pool)

	// Get all rooms with status 'starting_soon'
	rooms, err := queries.ListRooms(context.Background())
	if err != nil {
		return err
	}

	now := time.Now()

	for _, room := range rooms {
		// Skip if not starting_soon
		if room.Status != "starting_soon" {
			continue
		}

		// Check if start_time is valid and has passed
		if !room.StartTime.Valid {
			log.Printf("Room %d has invalid start_time, skipping", room.RoomID)
			continue
		}

		if room.StartTime.Time.After(now) {
			continue
		}

		log.Printf("Starting room %d", room.RoomID)

		// Start a transaction for atomic operations
		tx, err := pool.Begin(context.Background())
		if err != nil {
			log.Printf("Failed to start transaction for room %d: %v", room.RoomID, err)
			continue
		}

		txQueries := queries.WithTx(tx)

		// Count current players
		currentPlayers, err := txQueries.CountRoomPlayers(context.Background(), repository.CountRoomPlayersParams{
			RoomID: room.RoomID,
		})
		if err != nil {
			log.Printf("Failed to count players in room %d: %v", room.RoomID, err)
			tx.Rollback(context.Background())
			continue
		}

		// Calculate how many bots to add
		botsNeeded := int(room.PlayersNeeded) - int(currentPlayers)

		if botsNeeded < 0 {
			botsNeeded = 0
		}

		log.Printf("Room %d needs %d bots (has %d/%d players)", room.RoomID, botsNeeded, currentPlayers, room.PlayersNeeded)

		// Get available bots (excluding those already in the room)
		var bots []repository.GetAvailableBotsForRoomRow
		if botsNeeded > 0 {
			bots, err = txQueries.GetAvailableBotsForRoom(context.Background(), repository.GetAvailableBotsForRoomParams{
				Balance: room.EntryCost,
				RoomID:  room.RoomID,
				Limit:   int32(botsNeeded),
			})
			if err != nil {
				log.Printf("Failed to get bots: %v", err)
				tx.Rollback(context.Background())
				continue
			}

			// Check if we have enough bots
			if len(bots) < botsNeeded {
				log.Printf("Not enough bots available for room %d (need %d, found %d). Room will not start.",
					room.RoomID, botsNeeded, len(bots))
				tx.Rollback(context.Background())
				continue
			}
		}

		// Add bots to the room
		addedBots := 0
		for _, bot := range bots {
			_, err := txQueries.BotJoinRoom(context.Background(), repository.BotJoinRoomParams{
				RoomID: room.RoomID,
				ID:     bot.ID,
				Places: nil,
			})
			if err != nil {
				log.Printf("Failed to add bot %s (ID: %d) to room %d: %v", bot.Name, bot.ID, room.RoomID, err)
				// Rollback the entire transaction if any bot fails to join
				tx.Rollback(context.Background())
				goto nextRoom
			}
			addedBots++
			log.Printf("Added bot %s to room %d", bot.Name, room.RoomID)
		}

		// Verify we added all needed bots
		if addedBots != botsNeeded {
			log.Printf("Failed to add all bots to room %d (added %d/%d), rolling back",
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
			log.Printf("Failed to set room %d to playing: %v", room.RoomID, err)
			tx.Rollback(context.Background())
			continue
		}

		// Commit the transaction
		err = tx.Commit(context.Background())
		if err != nil {
			log.Printf("Failed to commit transaction for room %d: %v", room.RoomID, err)
			continue
		}

		log.Printf("Room %d successfully started with %d bots added", room.RoomID, addedBots)

	nextRoom:
		// Continue to next room
	}

	return nil
}
