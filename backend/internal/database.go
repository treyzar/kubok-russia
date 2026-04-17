package internal

import (
	"context"

	"backend/repository"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func DatabaseConnect(ctx context.Context, cfg *AppConfig) (*pgxpool.Pool, *repository.Queries, *redis.Client) {
	pool, err := pgxpool.New(ctx, cfg.PostgresURL)
	if err != nil {
		panic(err)
	}
	if err := pool.Ping(ctx); err != nil {
		panic(err)
	}

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisURL})
	if _, err := rdb.Ping(ctx).Result(); err != nil {
		panic(err)
	}

	return pool, repository.New(pool), rdb
}
