package main

import (
	"context"
	"os/signal"
	"syscall"

	"github.com/SomeSuperCoder/OnlineShop/internal/crons"
	"github.com/hx/eon"
)

func main() {
	// Create a context that listens for OS interrupt signals (like CTRL+C)
	ctx, _ := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)

	// Create a new scheduler that will manage your jobs
	scheduler := eon.NewScheduler(ctx)

	// Run a simple, one-off job
	scheduler.Run(ctx, &eon.Job{
		Runner: crons.BotManager,
	})

	// Keep the application running until a signal is received
	<-ctx.Done()
}
