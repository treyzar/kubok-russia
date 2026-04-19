package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal"
	"github.com/SomeSuperCoder/OnlineShop/internal/crons"
	"github.com/hx/eon"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// Load config
	config := internal.LoadAppConfig()

	// Initialize database connection pool once
	pool, err := pgxpool.New(context.Background(), config.PostgresURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	log.Println("Room Manager: Database connection pool initialized")

	// Create a context that listens for OS interrupt signals (like CTRL+C)
	ctx, _ := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)

	// Create a new scheduler that will manage your jobs
	scheduler := eon.NewScheduler(ctx)

	// Run room starter every 1 second to check for rooms that need to start
	scheduler.Schedule(ctx, time.Second, 1*time.Second, &eon.Job{
		Runner: crons.RoomStarter(pool),
	})

	log.Println("Room Manager: Cron jobs scheduled and running")

	// Keep the application running until a signal is received
	<-ctx.Done()

	log.Println("Room Manager: Shutting down gracefully...")
}
