package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/websocket"
)

const (
	baseURL = "http://localhost:8888/api/v1"
	wsURL   = "ws://localhost:8888/api/v1"
)

var httpClient = &http.Client{}

func main() {
	log.Println("=== WebSocket Integration Tests ===")

	tests := []struct {
		name string
		fn   func() error
	}{
		{"Test 1: WS message arrives within 2s after REST join", testWSJoinNotification},
	}

	passed, failed := 0, 0
	for _, t := range tests {
		log.Printf("\n--- Running: %s ---", t.name)
		if err := t.fn(); err != nil {
			log.Printf("❌ FAILED: %s — %v", t.name, err)
			failed++
		} else {
			log.Printf("✅ PASSED: %s", t.name)
			passed++
		}
	}

	log.Printf("\n=== Results: %d passed, %d failed ===", passed, failed)
	if failed > 0 {
		os.Exit(1)
	}
}

// --- helpers ---

func restDo(method, path string, body any) (*http.Response, []byte, error) {
	var r io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, nil, err
		}
		r = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, baseURL+path, r)
	if err != nil {
		return nil, nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	return resp, data, err
}

func mustStatus(resp *http.Response, data []byte, expected int) error {
	if resp.StatusCode != expected {
		return fmt.Errorf("expected HTTP %d, got %d: %s", expected, resp.StatusCode, string(data))
	}
	return nil
}

// testWSJoinNotification:
//  1. Creates a room and a user via REST.
//  2. Opens a WebSocket connection to /api/v1/rooms/{room_id}/ws.
//  3. Triggers a join via REST.
//  4. Asserts a WS message arrives within 2 seconds.
//  5. Cleans up.
func testWSJoinNotification() error {
	// --- setup: create room ---
	resp, data, err := restDo("POST", "/rooms", map[string]any{
		"jackpot":        0,
		"status":         "new",
		"players_needed": 2,
		"entry_cost":     0,
		"winner_pct":     80,
	})
	if err != nil {
		return fmt.Errorf("create room: %w", err)
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return fmt.Errorf("create room: %w", err)
	}
	var roomBody struct {
		RoomID int32 `json:"room_id"`
	}
	if err := json.Unmarshal(data, &roomBody); err != nil {
		return fmt.Errorf("parse room: %w", err)
	}
	roomID := roomBody.RoomID
	log.Printf("Created room ID=%d", roomID)

	// --- setup: create user ---
	resp, data, err = restDo("POST", "/users", map[string]any{
		"name":    "WSTestUser",
		"balance": 1000,
	})
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	var userBody struct {
		ID int32 `json:"id"`
	}
	if err := json.Unmarshal(data, &userBody); err != nil {
		return fmt.Errorf("parse user: %w", err)
	}
	userID := userBody.ID
	log.Printf("Created user ID=%d", userID)

	// --- cleanup deferred ---
	defer func() {
		restDo("DELETE", fmt.Sprintf("/users/%d", userID), nil) //nolint:errcheck
	}()

	// --- connect WebSocket ---
	wsEndpoint := fmt.Sprintf("%s/rooms/%d/ws", wsURL, roomID)
	conn, _, err := websocket.DefaultDialer.Dial(wsEndpoint, nil)
	if err != nil {
		return fmt.Errorf("ws dial %s: %w", wsEndpoint, err)
	}
	defer conn.Close()
	log.Printf("WebSocket connected to %s", wsEndpoint)

	// Channel to receive the first WS message
	msgCh := make(chan []byte, 1)
	errCh := make(chan error, 1)
	go func() {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			errCh <- err
			return
		}
		msgCh <- msg
	}()

	// --- trigger join via REST ---
	resp, data, err = restDo("POST", fmt.Sprintf("/rooms/%d/players", roomID), map[string]any{
		"user_id": userID,
	})
	if err != nil {
		return fmt.Errorf("join room: %w", err)
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return fmt.Errorf("join room: %w", err)
	}
	log.Printf("User %d joined room %d via REST", userID, roomID)

	// --- assert WS message arrives within 2 seconds ---
	select {
	case msg := <-msgCh:
		log.Printf("✅ WS message received within deadline: %s", string(msg))
		// Basic sanity: message should be valid JSON containing room_id
		var payload map[string]any
		if err := json.Unmarshal(msg, &payload); err != nil {
			return fmt.Errorf("ws message is not valid JSON: %w", err)
		}
		return nil
	case err := <-errCh:
		return fmt.Errorf("ws read error: %w", err)
	case <-time.After(2 * time.Second):
		return fmt.Errorf("no WS message received within 2 seconds after REST join")
	}
}
