package internal

import (
	"log"
	"time"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

type AppConfig struct {
	// DB stuff
	PostgresURL string `envconfig:"GOOSE_DBSTRING"`
	RedisURL    string `envconfig:"REDIS_URL"`
	// JWT stuff
	AccessTokenSecret  []byte        `envconfig:"ACCESS_TOKEN_SECRET"`
	RefreshTokenSecret []byte        `envconfig:"REFRESH_TOKEN_SECRET"`
	AccessTokenExpiry  time.Duration `envconfig:"ACCESS_TOKEN_EXPIRY"`
	RefreshTokenExpiry time.Duration `envconfig:"REFRESH_TOKEN_EXPIRY"`
	// API stuff
	Port     string `envconfig:"PORT"`
	TestMode bool   `envconfig:"API_TEST"`
	// User Experience
	UserCartExpiry time.Duration `envconfig:"USER_CART_EXPIRY" default:"720h"`
	// Bot Manager
	DesiredBotCount int `envconfig:"DESIRED_BOT_COUNT" default:"10"`
	// RNG
	RNGURL string `envconfig:"RNG_URL"`
}

func LoadAppConfig() *AppConfig {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Faild to load .env due to: %s", err.Error())
	}
	appConfig := new(AppConfig)
	err = envconfig.Process("", appConfig)
	if err != nil {
		log.Fatalf("Failed to load environment variables due to: %s", err.Error())
	}

	return appConfig
}
