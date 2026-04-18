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

		// Check if start_time has passed
		if !room.StartTime.Valid || room.StartTime.Time.After(now) {
			continue
		}

		log.Printf("Starting room %d", room.RoomID)

		// Change status to 'playing'
		_, err := queries.SetRoomStatus(context.Background(), repository.SetRoomStatusParams{
			RoomID: room.RoomID,
			Status: "playing",
		})
		if err != nil {
			log.Printf("Failed to set room %d to playing: %v", room.RoomID, err)
			continue
		}

		// Count current players
		currentPlayers, err := queries.CountRoomPlayers(context.Background(), repository.CountRoomPlayersParams{
			RoomID: room.RoomID,
		})
		if err != nil {
			log.Printf("Failed to count players in room %d: %v", room.RoomID, err)
			continue
		}

		// Calculate how many bots to add
		botsNeeded := int(room.PlayersNeeded) - int(currentPlayers)
		if botsNeeded <= 0 {
			log.Printf("Room %d already has enough players", room.RoomID)
			continue
		}

		log.Printf("Adding %d bots to room %d", botsNeeded, room.RoomID)

		// Get bots with sufficient balance
		bots, err := queries.GetBotsWithMinBalance(context.Background(), repository.GetBotsWithMinBalanceParams{
			Balance: room.EntryCost,
			Limit:   int32(botsNeeded),
		})
		if err != nil {
			log.Printf("Failed to get bots: %v", err)
			continue
		}

		if len(bots) == 0 {
			log.Printf("No bots with sufficient balance available for room %d", room.RoomID)
			continue
		}

		// Add bots to the room
		addedBots := 0
		for _, bot := range bots {
			_, err := queries.BotJoinRoom(context.Background(), repository.BotJoinRoomParams{
				RoomID: room.RoomID,
				ID:     bot.ID,
				Places: nil, // No specific place preference
			})
			if err != nil {
				log.Printf("Failed to add bot %s (ID: %d) to room %d: %v", bot.Name, bot.ID, room.RoomID, err)
				continue
			}
			addedBots++
			log.Printf("Added bot %s to room %d", bot.Name, room.RoomID)
		}

		log.Printf("Room %d started with %d/%d bots added", room.RoomID, addedBots, botsNeeded)
	}

	return nil
}
