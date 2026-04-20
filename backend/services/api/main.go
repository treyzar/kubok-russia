package main

import (
	"context"
	"fmt"

	"github.com/SomeSuperCoder/OnlineShop/handlers"
	"github.com/SomeSuperCoder/OnlineShop/internal"
	"github.com/SomeSuperCoder/OnlineShop/internal/handler"
	"github.com/SomeSuperCoder/OnlineShop/internal/redisclient"
	"github.com/SomeSuperCoder/OnlineShop/internal/service"
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

	pubSub := redisclient.New(redisClient)
	MountRoutes(api, r, repo, pool, redisClient, pubSub, appConfig)

	r.Run(fmt.Sprintf(":%s", appConfig.Port))
}

func MountRoutes(api huma.API, r *gin.Engine, repo *repository.Queries, pool *pgxpool.Pool, redisClient *redis.Client, pubSub *redisclient.PubSub, appConfig *internal.AppConfig) {
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

	huma.Register(api, huma.Operation{
		OperationID: "list-users",
		Method:      "GET",
		Path:        "/users",
	}, userHandler.List)

	huma.Register(api, huma.Operation{
		OperationID: "update-user-balance",
		Method:      "PATCH",
		Path:        "/users/{id}/balance",
	}, userHandler.UpdateBalance)

	huma.Register(api, huma.Operation{
		OperationID: "increase-user-balance",
		Method:      "POST",
		Path:        "/users/{id}/balance/increase",
	}, userHandler.IncreaseBalance)

	huma.Register(api, huma.Operation{
		OperationID: "decrease-user-balance",
		Method:      "POST",
		Path:        "/users/{id}/balance/decrease",
	}, userHandler.DecreaseBalance)

	huma.Register(api, huma.Operation{
		OperationID: "set-user-balance",
		Method:      "PUT",
		Path:        "/users/{id}/balance",
	}, userHandler.SetBalance)

	roomHandler := handlers.RoomHandler{Repo: repo, Pool: pool, PubSub: pubSub}
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
		OperationID: "validate-room",
		Method:      "POST",
		Path:        "/rooms/validate",
	}, roomHandler.Validate)
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

	// rounds
	roundHandler := handlers.RoundHandler{Repo: repo, Pool: pool}
	huma.Register(api, huma.Operation{
		OperationID: "list-rounds",
		Method:      "GET",
		Path:        "/rounds",
	}, roundHandler.List)
	huma.Register(api, huma.Operation{
		OperationID: "get-round",
		Method:      "GET",
		Path:        "/rounds/{room_id}",
	}, roundHandler.Get)

	// room templates
	templateHandler := handlers.TemplateHandler{Repo: repo, Pool: pool}
	huma.Register(api, huma.Operation{
		OperationID: "create-room-template",
		Method:      "POST",
		Path:        "/room-templates",
	}, templateHandler.Create)
	huma.Register(api, huma.Operation{
		OperationID: "list-room-templates",
		Method:      "GET",
		Path:        "/room-templates",
	}, templateHandler.List)
	huma.Register(api, huma.Operation{
		OperationID: "get-room-template",
		Method:      "GET",
		Path:        "/room-templates/{template_id}",
	}, templateHandler.Get)
	huma.Register(api, huma.Operation{
		OperationID: "update-room-template",
		Method:      "PUT",
		Path:        "/room-templates/{template_id}",
	}, templateHandler.Update)
	huma.Register(api, huma.Operation{
		OperationID: "delete-room-template",
		Method:      "DELETE",
		Path:        "/room-templates/{template_id}",
	}, templateHandler.Delete)

	// WebSocket — registered on raw Gin router (Huma doesn't support WS upgrades)
	wsHandler := handlers.WSHandler{PubSub: pubSub}
	r.GET("/api/v1/rooms/:room_id/ws", wsHandler.Handle)

	// Provably fair rooms
	fairHandler := &handler.FairRoomHandler{Service: service.NewRoomService(pool)}
	huma.Register(api, huma.Operation{
		OperationID: "create-fair-room",
		Method:      "POST",
		Path:        "/fair-rooms",
	}, fairHandler.Create)
	huma.Register(api, huma.Operation{
		OperationID: "list-fair-rooms",
		Method:      "GET",
		Path:        "/fair-rooms",
	}, fairHandler.List)
	huma.Register(api, huma.Operation{
		OperationID: "get-fair-room",
		Method:      "GET",
		Path:        "/fair-rooms/{id}",
	}, fairHandler.Get)
	huma.Register(api, huma.Operation{
		OperationID: "join-fair-room",
		Method:      "POST",
		Path:        "/fair-rooms/{id}/join",
	}, fairHandler.Join)
	huma.Register(api, huma.Operation{
		OperationID: "start-fair-room",
		Method:      "POST",
		Path:        "/fair-rooms/{id}/start",
	}, fairHandler.Start)
}
