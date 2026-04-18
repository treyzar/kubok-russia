package internal

import (
	"context"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func DatabaseConnect(ctx context.Context, config *AppConfig) (*pgxpool.Pool, *repository.Queries, *redis.Client) {
	// ===== Postgres =====
	pool, err := pgxpool.New(ctx, config.PostgresURL)
	if err != nil {
		panic(err)
	}
	err = pool.Ping(ctx)
	if err != nil {
		panic(err)
	}
	repo := repository.New(pool)

	// ====== Redis =====
	rdb := redis.NewClient(&redis.Options{
		Addr:     config.RedisURL,
		Password: "",
		DB:       0,
	})
	_, err = rdb.Ping(ctx).Result()
	if err != nil {
		panic(err)
	}

	return pool, repo, rdb
}
