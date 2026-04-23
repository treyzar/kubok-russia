package rng

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
)

// RNGClient selects random numbers using an optional external RNG service,
// falling back to local math/rand on any error or when no URL is configured.
type RNGClient struct {
	baseURL string
	client  *http.Client
}

// NewRNGClient creates a new RNGClient. baseURL may be empty, in which case
// the local fallback is always used.
func NewRNGClient(baseURL string) *RNGClient {
	return &RNGClient{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 2 * time.Second},
	}
}

// SelectRandom returns a random number in [0, max) using the external RNG
// service when configured, falling back to local math/rand on any error.
// roomID and playerCount are passed as context to the external service.
func (c *RNGClient) SelectRandom(ctx context.Context, max, roomID, playerCount int32) (int32, error) {
	if max <= 0 {
		return 0, fmt.Errorf("max must be positive, got %d", max)
	}

	if c.baseURL != "" {
		result, err := c.callExternalRNG(ctx, max, roomID, playerCount)
		if err != nil {
			log.Printf("[RNGClient] ⚠️  External RNG failed (%v), falling back to local rand", err)
			return c.fallbackRandom(max), nil
		}
		log.Printf("[RNGClient] ✅ Used external RNG for room %d (result: %d)", roomID, result)
		return result, nil
	}

	result := c.fallbackRandom(max)
	log.Printf("[RNGClient] 🎲 Used local RNG for room %d (result: %d)", roomID, result)
	return result, nil
}

// callExternalRNG calls GET {baseURL}?max={max}&room_id={roomID}&player_count={playerCount}
// and expects {"result": N} where N is in [0, max).
func (c *RNGClient) callExternalRNG(ctx context.Context, max, roomID, playerCount int32) (int32, error) {
	url := fmt.Sprintf("%s?max=%d&room_id=%d&player_count=%d", c.baseURL, max, roomID, playerCount)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, fmt.Errorf("create request: %w", err)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	var body struct {
		Result int32 `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return 0, fmt.Errorf("decode response: %w", err)
	}

	if body.Result < 0 || body.Result >= max {
		return 0, fmt.Errorf("result %d out of range [0, %d)", body.Result, max)
	}

	return body.Result, nil
}

// fallbackRandom returns a random number in [0, max) using local math/rand.
func (c *RNGClient) fallbackRandom(max int32) int32 {
	return rand.Int31n(max)
}
