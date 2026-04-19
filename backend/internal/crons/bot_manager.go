package crons

import (
	"context"
	"fmt"
	"log"
	"math/rand"

	"github.com/SomeSuperCoder/OnlineShop/internal"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/hx/eon"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Russian first names for bot generation
var russianNames = []string{
	"Александр", "Дмитрий", "Максим", "Сергей", "Андрей",
	"Алексей", "Артём", "Илья", "Кирилл", "Михаил",
	"Никита", "Матвей", "Роман", "Егор", "Арсений",
	"Иван", "Денис", "Евгений", "Даниил", "Тимофей",
	"Владимир", "Павел", "Руслан", "Марк", "Глеб",
	"Анна", "Мария", "Елена", "Ольга", "Наталья",
	"Татьяна", "Ирина", "Екатерина", "Светлана", "Юлия",
}

func generateRandomRussianName() string {
	return russianNames[rand.Intn(len(russianNames))]
}

func BotManager(pool *pgxpool.Pool, config *internal.AppConfig) func(*eon.Context) error {
	return func(ctx *eon.Context) error {
		queries := repository.New(pool)

		// Get the existing bot count
		existingBotCount, err := queries.CountBots(context.Background())
		if err != nil {
			return err
		}

		log.Printf("Existing bot count: %d, Desired: %d", existingBotCount, config.DesiredBotCount)

		// Create bots if needed
		botsToCreate := int64(config.DesiredBotCount) - existingBotCount
		if botsToCreate > 0 {
			log.Printf("Creating %d new bots", botsToCreate)
			for i := int64(0); i < botsToCreate; i++ {
				// Generate random Russian name with number suffix for uniqueness
				name := fmt.Sprintf("%s_%d", generateRandomRussianName(), rand.Intn(10000))

				// Create bot with initial balance of 500 (game currency)
				_, err := queries.CreateBot(context.Background(), repository.CreateBotParams{
					Name:    name,
					Balance: 500,
				})
				if err != nil {
					log.Printf("Failed to create bot: %v", err)
					continue
				}
				log.Printf("Created bot: %s", name)
			}
		}

		// Increase balance by 200 for bots with balance < 500
		err = queries.IncreaseBalanceForLowBalanceBots(context.Background(), repository.IncreaseBalanceForLowBalanceBotsParams{
			Balance:   200,
			Balance_2: 500,
		})
		if err != nil {
			return err
		}

		log.Println("Increased balance for low-balance bots")
		return nil
	}
}
