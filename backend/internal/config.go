package internal

import (
	"log"
	"time"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

type AppConfig struct {
	PostgresURL string `envconfig:"GOOSE_DBSTRING"`
	RedisURL    string `envconfig:"REDIS_URL"`

	AccessTokenSecret  []byte        `envconfig:"ACCESS_TOKEN_SECRET"`
	RefreshTokenSecret []byte        `envconfig:"REFRESH_TOKEN_SECRET"`
	AccessTokenExpiry  time.Duration `envconfig:"ACCESS_TOKEN_EXPIRY"`
	RefreshTokenExpiry time.Duration `envconfig:"REFRESH_TOKEN_EXPIRY"`

	Port     string `envconfig:"PORT"`
	TestMode bool   `envconfig:"API_TEST"`
}

func LoadAppConfig() *AppConfig {
	if err := godotenv.Load(); err != nil {
		log.Printf(".env not loaded: %v", err)
	}

	cfg := new(AppConfig)
	if err := envconfig.Process("", cfg); err != nil {
		log.Fatalf("failed to load env vars: %v", err)
	}
	return cfg
}
