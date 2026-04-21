package crons

import (
	"context"
	"log"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal/events"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/hx/eon"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RoomStarter(pool *pgxpool.Pool, publisher *events.EventPublisher) func(*eon.Context) error {
	executionCount := 0
	return func(ctx *eon.Context) error {
		executionCount++
		queries := repository.New(pool)

		rooms, err := queries.ListRooms(context.Background())
		if err != nil {
			log.Printf("[RoomStarter] Error listing rooms: %v", err)
			return err
		}

		now := time.Now()
		roomsToStart := 0

		for _, room := range rooms {
			if room.Status == "starting_soon" && room.StartTime.Valid && !room.StartTime.Time.After(now) {
				roomsToStart++
			}
		}

		if executionCount%10 == 0 {
			log.Printf("[RoomStarter] Execution #%d: Found %d rooms, %d ready to start", executionCount, len(rooms), roomsToStart)
		}

		for _, room := range rooms {
			if room.Status != "starting_soon" {
				continue
			}

			if !room.StartTime.Valid {
				log.Printf("[RoomStarter] Room %d has invalid start_time, skipping", room.RoomID)
				continue
			}

			timeUntilStart := room.StartTime.Time.Sub(now)
			if room.StartTime.Time.After(now) {
				if timeUntilStart < 5*time.Second {
					log.Printf("[RoomStarter] Room %d will start in %.1f seconds", room.RoomID, timeUntilStart.Seconds())
				}
				publisher.PublishRoomStarting(context.Background(), room.RoomID, room.StartTime.Time)
				continue
			}

			log.Printf("[RoomStarter] Starting room %d (start_time was %v)", room.RoomID, room.StartTime.Time.Format("15:04:05"))

			tx, err := pool.Begin(context.Background())
			if err != nil {
				log.Printf("[RoomStarter] Failed to start transaction for room %d: %v", room.RoomID, err)
				continue
			}

			txQueries := queries.WithTx(tx)

			currentPlayers, err := txQueries.CountRoomPlayers(context.Background(), repository.CountRoomPlayersParams{
				RoomID: room.RoomID,
			})
			if err != nil {
				log.Printf("[RoomStarter] Failed to count players in room %d: %v", room.RoomID, err)
				tx.Rollback(context.Background())
				continue
			}

			botsNeeded := int(room.PlayersNeeded) - int(currentPlayers)
			if botsNeeded < 0 {
				botsNeeded = 0
			}

			log.Printf("[RoomStarter] Room %d needs %d bots (has %d/%d players)", room.RoomID, botsNeeded, currentPlayers, room.PlayersNeeded)

			var bots []repository.GetAvailableBotsForRoomRow
			if botsNeeded > 0 {
				bots, err = txQueries.GetAvailableBotsForRoom(context.Background(), repository.GetAvailableBotsForRoomParams{
					Balance: room.EntryCost,
					RoomID:  room.RoomID,
					Limit:   int32(botsNeeded),
				})
				if err != nil {
					log.Printf("[RoomStarter] Failed to get bots: %v", err)
					tx.Rollback(context.Background())
					continue
				}

				if len(bots) < botsNeeded {
					log.Printf("[RoomStarter] Not enough bots for room %d (need %d, found %d)", room.RoomID, botsNeeded, len(bots))
					tx.Rollback(context.Background())
					continue
				}
			}

			addedBots := 0
			for _, bot := range bots {
				rows, err := txQueries.BotJoinRoom(context.Background(), repository.BotJoinRoomParams{
					RoomID: room.RoomID,
					ID:     bot.ID,
				})
				if err != nil {
					log.Printf("[RoomStarter] Failed to add bot %d to room %d: %v", bot.ID, room.RoomID, err)
					tx.Rollback(context.Background())
					goto nextRoom
				}
				if len(rows) == 0 {
					log.Printf("[RoomStarter] Bot %d failed to join room %d", bot.ID, room.RoomID)
					tx.Rollback(context.Background())
					goto nextRoom
				}

				nextPlaceIndex, err := txQueries.GetNextPlaceIndex(context.Background(), repository.GetNextPlaceIndexParams{
					RoomID: room.RoomID,
				})
				if err != nil {
					log.Printf("[RoomStarter] Failed to get next place index for bot %d in room %d: %v", bot.ID, room.RoomID, err)
					tx.Rollback(context.Background())
					goto nextRoom
				}

				_, err = txQueries.InsertRoomPlace(context.Background(), repository.InsertRoomPlaceParams{
					RoomID:     room.RoomID,
					UserID:     bot.ID,
					PlaceIndex: nextPlaceIndex,
				})
				if err != nil {
					log.Printf("[RoomStarter] Failed to insert place for bot %d in room %d: %v", bot.ID, room.RoomID, err)
					tx.Rollback(context.Background())
					goto nextRoom
				}

				addedBots++
				log.Printf("[RoomStarter] Added bot %s to room %d with place index %d", bot.Name, room.RoomID, nextPlaceIndex)
			}

			if addedBots != botsNeeded {
				log.Printf("[RoomStarter] Failed to add all bots to room %d (added %d/%d), rolling back", room.RoomID, addedBots, botsNeeded)
				tx.Rollback(context.Background())
				continue
			}

			_, err = txQueries.SetRoomStatus(context.Background(), repository.SetRoomStatusParams{
				RoomID: room.RoomID,
				Status: "playing",
			})
			if err != nil {
				log.Printf("[RoomStarter] Failed to set room %d to playing: %v", room.RoomID, err)
				tx.Rollback(context.Background())
				continue
			}

			err = tx.Commit(context.Background())
			if err != nil {
				log.Printf("[RoomStarter] Failed to commit transaction for room %d: %v", room.RoomID, err)
				continue
			}

			log.Printf("[RoomStarter] Room %d successfully started with %d bots added", room.RoomID, addedBots)
			publisher.PublishGameStarted(context.Background(), room.RoomID)

		nextRoom:
		}

		return nil
	}
}
