package main

import (
	"context"
	"fmt"

	"github.com/SomeSuperCoder/OnlineShop/handlers"
	"github.com/SomeSuperCoder/OnlineShop/internal"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	ctx := context.Background()
	appConfig := internal.LoadAppConfig()
	pool, repo, redisClient := internal.DatabaseConnect(ctx, appConfig)
	defer pool.Close()

	r := gin.Default()

	apiGroup := r.Group("/api/v1")
	humaConfig := huma.DefaultConfig(
		"Ticket Huma + Gin API",
		"1.0.0",
	)
	humaConfig.Servers = []*huma.Server{
		{URL: "http://localhost:8888/api/v1", Description: "Local API version 1"},
	}
	api := humagin.NewWithGroup(r, apiGroup, humaConfig)

	MountRoutes(api, repo, pool, redisClient, appConfig)

	r.Run(fmt.Sprintf(":%s", appConfig.Port))
}

func MountRoutes(api huma.API, repo *repository.Queries, pool *pgxpool.Pool, redisClient *redis.Client, appConfig *internal.AppConfig) {
	helloHandler := handlers.HelloHandler{Repo: repo, Pool: pool}
	huma.Register(api, huma.Operation{
		OperationID: "get-hello",
		Method:      "GET",
		Path:        "/hello",
	}, helloHandler.Get)

	userHandler := handlers.UserHandler{Repo: repo, Pool: pool}
	huma.Register(api, huma.Operation{
		OperationID: "create-user",
		Method:      "POST",
		Path:        "/users",
	}, userHandler.Create)

	huma.Register(api, huma.Operation{
		OperationID: "get-user",
		Method:      "GET",
		Path:        "/users/{id}",
	}, userHandler.Get)

	huma.Register(api, huma.Operation{
		OperationID: "delete-user",
		Method:      "DELETE",
		Path:        "/users/{id}",
	}, userHandler.Delete)

	roomHandler := handlers.RoomHandler{Repo: repo, Pool: pool}
	// rooms
	huma.Register(api, huma.Operation{
		OperationID: "create-room",
		Method:      "POST",
		Path:        "/rooms",
	}, roomHandler.Create)
	huma.Register(api, huma.Operation{
		OperationID: "list-rooms",
		Method:      "GET",
		Path:        "/rooms",
	}, roomHandler.List)
	huma.Register(api, huma.Operation{
		OperationID: "get-room",
		Method:      "GET",
		Path:        "/rooms/{room_id}",
	}, roomHandler.Get)

	// room_players
	huma.Register(api, huma.Operation{
		OperationID: "join-room",
		Method:      "POST",
		Path:        "/rooms/{room_id}/players",
	}, roomHandler.JoinRoom)
	huma.Register(api, huma.Operation{
		OperationID: "leave-room",
		Method:      "DELETE",
		Path:        "/rooms/{room_id}/players",
	}, roomHandler.LeaveRoom)
	huma.Register(api, huma.Operation{
		OperationID: "list-room-players",
		Method:      "GET",
		Path:        "/rooms/{room_id}/players",
	}, roomHandler.ListRoomPlayers)

	// room_winners
	huma.Register(api, huma.Operation{
		OperationID: "list-room-winners",
		Method:      "GET",
		Path:        "/rooms/{room_id}/winners",
	}, roomHandler.ListRoomWinners)
	huma.Register(api, huma.Operation{
		OperationID: "get-room-winner",
		Method:      "GET",
		Path:        "/rooms/{room_id}/winners/{user_id}",
	}, roomHandler.GetRoomWinner)

	// room_boosts
	huma.Register(api, huma.Operation{
		OperationID: "boost-room",
		Method:      "POST",
		Path:        "/rooms/{room_id}/boosts",
	}, roomHandler.BoostRoom)
	huma.Register(api, huma.Operation{
		OperationID: "list-room-boosts",
		Method:      "GET",
		Path:        "/rooms/{room_id}/boosts",
	}, roomHandler.ListRoomBoosts)
	huma.Register(api, huma.Operation{
		OperationID: "calc-boost-probability",
		Method:      "GET",
		Path:        "/rooms/{room_id}/boosts/calc/probability",
	}, roomHandler.CalcProbability)
	huma.Register(api, huma.Operation{
		OperationID: "calc-boost-amount",
		Method:      "GET",
		Path:        "/rooms/{room_id}/boosts/calc/boost",
	}, roomHandler.CalcBoost)
}
