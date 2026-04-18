package crons

import (
	"fmt"

	"github.com/hx/eon"
)

func BotManager(ctx *eon.Context) error {
	_, err := fmt.Println("Hello, world from eon!")
	return err
}
