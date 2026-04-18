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
}
