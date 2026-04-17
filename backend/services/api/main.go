package main

import (
	"context"
	"fmt"
	"net/http"

	"backend/handlers"
	"backend/internal"
	"backend/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	ctx := context.Background()
	cfg := internal.LoadAppConfig()
	pool, repo, redisClient := internal.DatabaseConnect(ctx, cfg)
	defer pool.Close()

	r := gin.Default()
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "X-User-ID"}
	r.Use(cors.New(corsConfig))
	r.Use(internal.AuthMiddleware(repo))

	apiGroup := r.Group("/api/v1")
	humaConfig := huma.DefaultConfig("backend API", "1.0.0")
	humaConfig.Servers = []*huma.Server{{URL: "http://localhost:8888/api/v1", Description: "Local API v1"}}
	api := humagin.NewWithGroup(r, apiGroup, humaConfig)

	MountRoutes(api, repo, pool, redisClient, cfg)
	_ = r.Run(fmt.Sprintf(":%s", cfg.Port))
}

func MountRoutes(api huma.API, repo *repository.Queries, pool *pgxpool.Pool, redisClient *redis.Client, cfg *internal.AppConfig) {
	authHandler := handlers.AuthHandler{Repo: repo, Pool: pool}
	huma.Register(api, huma.Operation{OperationID: "login", Method: http.MethodPost, Path: "/auth/login", Tags: []string{"Auth"}}, authHandler.Login)

	ticketHandler := handlers.TicketHandler{Repo: repo, Pool: pool}
	huma.Register(api, huma.Operation{OperationID: "create-ticket", Method: http.MethodPost, Path: "/public/tickets", Tags: []string{"Tickets"}}, ticketHandler.Post)
	huma.Register(api, huma.Operation{OperationID: "list-tickets", Method: http.MethodGet, Path: "/tickets", Tags: []string{"Tickets"}}, ticketHandler.List)
	huma.Register(api, huma.Operation{OperationID: "get-ticket", Method: http.MethodGet, Path: "/tickets/{id}", Tags: []string{"Tickets"}}, ticketHandler.Get)
	huma.Register(api, huma.Operation{OperationID: "update-ticket", Method: http.MethodPatch, Path: "/tickets/{id}", Tags: []string{"Tickets"}}, ticketHandler.Update)

	statsHandler := handlers.StatisticsHandler{Repo: repo}
	huma.Register(api, huma.Operation{OperationID: "stats-summary", Method: http.MethodGet, Path: "/statistics/summary", Tags: []string{"Statistics"}}, statsHandler.GetSummary)

	heatmapHandler := handlers.HeatmapHandler{Repo: repo, Pool: pool}
	huma.Register(api, huma.Operation{OperationID: "heatmap-points", Method: http.MethodGet, Path: "/heatmap/points", Tags: []string{"Heatmap"}}, heatmapHandler.GetPoints)

	monitoringHandler := handlers.MonitoringHandler{Repo: repo}
	huma.Register(api, huma.Operation{OperationID: "monitoring-kpi", Method: http.MethodGet, Path: "/monitoring/kpi", Tags: []string{"Monitoring"}}, monitoringHandler.GetKPI)
}
