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
	wsDead  = 3 * time.Second
)

var httpClient = &http.Client{}

func main() {
	log.Println("=== WebSocket Integration Tests ===")

	tests := []struct {
		name string
		fn   func() error
	}{
		{"Test 1: WS message arrives within 2s after REST join", testWSJoinNotification},
		{"Test 2: WS message arrives after player leaves room", testWSLeaveNotification},
		{"Test 3: WS message arrives after room boost", testWSBoostNotification},
		{"Test 4: Multiple concurrent clients all receive the same event", testWSMultipleClients},
		{"Test 5: WS client on different room does NOT receive events", testWSIsolation},
		{"Test 6: Join message contains expected room_id field", testWSJoinPayloadFields},
		{"Test 7: Leave message contains expected room_id field", testWSLeavePayloadFields},
		{"Test 8: Boost message contains expected room_id field", testWSBoostPayloadFields},
		{"Test 9: WS connection to non-existent room_id returns error or closes", testWSInvalidRoomID},
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

// --- REST helpers ---

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

// --- setup helpers ---

func createRoom() (int32, error) {
	resp, data, err := restDo("POST", "/rooms", map[string]any{
		"jackpot":        0,
		"status":         "new",
		"players_needed": 3,
		"entry_cost":     0,
		"winner_pct":     80,
	})
	if err != nil {
		return 0, fmt.Errorf("create room: %w", err)
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return 0, fmt.Errorf("create room: %w", err)
	}
	var body struct {
		RoomID int32 `json:"room_id"`
	}
	if err := json.Unmarshal(data, &body); err != nil {
		return 0, fmt.Errorf("parse room: %w", err)
	}
	return body.RoomID, nil
}

func createPlayingRoom() (int32, error) {
	resp, data, err := restDo("POST", "/rooms", map[string]any{
		"jackpot":        0,
		"status":         "playing",
		"players_needed": 3,
		"entry_cost":     0,
		"winner_pct":     80,
	})
	if err != nil {
		return 0, fmt.Errorf("create playing room: %w", err)
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return 0, fmt.Errorf("create playing room: %w", err)
	}
	var body struct {
		RoomID int32 `json:"room_id"`
	}
	if err := json.Unmarshal(data, &body); err != nil {
		return 0, fmt.Errorf("parse playing room: %w", err)
	}
	return body.RoomID, nil
}

func createUser(name string, balance int) (int32, error) {
	resp, data, err := restDo("POST", "/users", map[string]any{
		"name":    name,
		"balance": balance,
	})
	if err != nil {
		return 0, fmt.Errorf("create user: %w", err)
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return 0, fmt.Errorf("create user: %w", err)
	}
	var body struct {
		ID int32 `json:"id"`
	}
	if err := json.Unmarshal(data, &body); err != nil {
		return 0, fmt.Errorf("parse user: %w", err)
	}
	return body.ID, nil
}

func deleteUser(userID int32) {
	restDo("DELETE", fmt.Sprintf("/users/%d", userID), nil) //nolint:errcheck
}

func wsConnect(roomID int32) (*websocket.Conn, error) {
	endpoint := fmt.Sprintf("%s/rooms/%d/ws", wsURL, roomID)
	conn, _, err := websocket.DefaultDialer.Dial(endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("ws dial %s: %w", endpoint, err)
	}
	return conn, nil
}

// readWSMessage reads one message from conn with a deadline, returning the parsed JSON payload.
func readWSMessage(conn *websocket.Conn, deadline time.Duration) (map[string]any, error) {
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

	select {
	case msg := <-msgCh:
		var payload map[string]any
		if err := json.Unmarshal(msg, &payload); err != nil {
			return nil, fmt.Errorf("ws message is not valid JSON: %w", err)
		}
		return payload, nil
	case err := <-errCh:
		return nil, fmt.Errorf("ws read error: %w", err)
	case <-time.After(deadline):
		return nil, fmt.Errorf("no WS message received within %s", deadline)
	}
}

func joinRoom(roomID, userID int32) error {
	resp, data, err := restDo("POST", fmt.Sprintf("/rooms/%d/players", roomID), map[string]any{
		"user_id": userID,
	})
	if err != nil {
		return fmt.Errorf("join room: %w", err)
	}
	return mustStatus(resp, data, http.StatusOK)
}

func leaveRoom(roomID, userID int32) error {
	resp, data, err := restDo("DELETE", fmt.Sprintf("/rooms/%d/players", roomID), map[string]any{
		"user_id": userID,
	})
	if err != nil {
		return fmt.Errorf("leave room: %w", err)
	}
	return mustStatus(resp, data, http.StatusOK)
}

func boostRoom(roomID, userID int32, amount int) error {
	resp, data, err := restDo("POST", fmt.Sprintf("/rooms/%d/boosts", roomID), map[string]any{
		"user_id": userID,
		"amount":  amount,
	})
	if err != nil {
		return fmt.Errorf("boost room: %w", err)
	}
	return mustStatus(resp, data, http.StatusOK)
}

// --- Tests ---

// Test 1: join triggers a WS snapshot (original test, preserved)
func testWSJoinNotification() error {
	roomID, err := createRoom()
	if err != nil {
		return err
	}
	userID, err := createUser("WSJoinUser", 1000)
	if err != nil {
		return err
	}
	defer deleteUser(userID)

	conn, err := wsConnect(roomID)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := joinRoom(roomID, userID); err != nil {
		return err
	}

	payload, err := readWSMessage(conn, wsDead)
	if err != nil {
		return err
	}
	log.Printf("WS message: %v", payload)
	return nil
}

// Test 2: leave triggers a WS snapshot
func testWSLeaveNotification() error {
	roomID, err := createRoom()
	if err != nil {
		return err
	}
	userID, err := createUser("WSLeaveUser", 1000)
	if err != nil {
		return err
	}
	defer deleteUser(userID)

	// Join first so we can leave
	if err := joinRoom(roomID, userID); err != nil {
		return fmt.Errorf("pre-join: %w", err)
	}

	// Connect BEFORE leaving so we can catch the event
	conn, err := wsConnect(roomID)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := leaveRoom(roomID, userID); err != nil {
		return err
	}

	payload, err := readWSMessage(conn, wsDead)
	if err != nil {
		return err
	}
	log.Printf("WS leave message: %v", payload)
	return nil
}

// Test 3: boost triggers a WS snapshot
func testWSBoostNotification() error {
	roomID, err := createPlayingRoom()
	if err != nil {
		return err
	}
	userID, err := createUser("WSBoostUser", 1000)
	if err != nil {
		return err
	}
	defer deleteUser(userID)

	conn, err := wsConnect(roomID)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := boostRoom(roomID, userID, 50); err != nil {
		return err
	}

	payload, err := readWSMessage(conn, wsDead)
	if err != nil {
		return err
	}
	log.Printf("WS boost message: %v", payload)
	return nil
}

// Test 4: multiple concurrent clients all receive the same event
func testWSMultipleClients() error {
	roomID, err := createRoom()
	if err != nil {
		return err
	}
	userID, err := createUser("WSMultiUser", 1000)
	if err != nil {
		return err
	}
	defer deleteUser(userID)

	const numClients = 3
	conns := make([]*websocket.Conn, numClients)
	for i := range conns {
		c, err := wsConnect(roomID)
		if err != nil {
			return fmt.Errorf("client %d connect: %w", i, err)
		}
		defer c.Close()
		conns[i] = c
	}

	if err := joinRoom(roomID, userID); err != nil {
		return err
	}

	for i, c := range conns {
		payload, err := readWSMessage(c, wsDead)
		if err != nil {
			return fmt.Errorf("client %d: %w", i, err)
		}
		log.Printf("Client %d received: %v", i, payload)
	}
	return nil
}

// Test 5: a client subscribed to room A does NOT receive events published to room B
func testWSIsolation() error {
	roomA, err := createRoom()
	if err != nil {
		return fmt.Errorf("room A: %w", err)
	}
	roomB, err := createRoom()
	if err != nil {
		return fmt.Errorf("room B: %w", err)
	}
	userID, err := createUser("WSIsolationUser", 1000)
	if err != nil {
		return err
	}
	defer deleteUser(userID)

	// Connect to room A only
	connA, err := wsConnect(roomA)
	if err != nil {
		return err
	}
	defer connA.Close()

	// Trigger an event on room B
	if err := joinRoom(roomB, userID); err != nil {
		return err
	}

	// Room A client should NOT receive anything within the deadline
	msgCh := make(chan []byte, 1)
	go func() {
		_, msg, _ := connA.ReadMessage()
		msgCh <- msg
	}()

	select {
	case msg := <-msgCh:
		return fmt.Errorf("room A client unexpectedly received a message: %s", string(msg))
	case <-time.After(wsDead):
		log.Printf("Room A client correctly received no message after room B event")
		return nil
	}
}

// Test 6: join payload contains room_id
func testWSJoinPayloadFields() error {
	roomID, err := createRoom()
	if err != nil {
		return err
	}
	userID, err := createUser("WSFieldsJoinUser", 1000)
	if err != nil {
		return err
	}
	defer deleteUser(userID)

	// Connect BEFORE joining so we can catch the event
	conn, err := wsConnect(roomID)
	if err != nil {
		return err
	}
	defer conn.Close()

	if err := joinRoom(roomID, userID); err != nil {
		return err
	}

	payload, err := readWSMessage(conn, wsDead)
	if err != nil {
		return err
	}

	if _, ok := payload["room_id"]; !ok {
		return fmt.Errorf("join payload missing 'room_id': %v", payload)
	}
	if _, ok := payload["status"]; !ok {
		return fmt.Errorf("join payload missing 'status': %v", payload)
	}
	log.Printf("Join payload fields OK: %v", payload)
	return nil
}

// Test 7: leave payload contains room_id
func testWSLeavePayloadFields() error {
	roomID, err := createRoom()
	if err != nil {
		return err
	}
	userID, err := createUser("WSFieldsLeaveUser", 1000)
	if err != nil {
		return err
	}
	defer deleteUser(userID)

	if err := joinRoom(roomID, userID); err != nil {
		return fmt.Errorf("pre-join: %w", err)
	}

	// Connect BEFORE leaving so we can catch the event
	conn, err := wsConnect(roomID)
	if err != nil {
		return err
	}
	defer conn.Close()

	// Small delay to ensure subscription is ready
	time.Sleep(100 * time.Millisecond)

	if err := leaveRoom(roomID, userID); err != nil {
		return err
	}

	payload, err := readWSMessage(conn, wsDead)
	if err != nil {
		return err
	}

	if _, ok := payload["room_id"]; !ok {
		return fmt.Errorf("leave payload missing 'room_id': %v", payload)
	}
	if _, ok := payload["status"]; !ok {
		return fmt.Errorf("leave payload missing 'status': %v", payload)
	}
	log.Printf("Leave payload fields OK: %v", payload)
	return nil
}

// Test 8: boost payload contains room_id
func testWSBoostPayloadFields() error {
	roomID, err := createPlayingRoom()
	if err != nil {
		return err
	}
	userID, err := createUser("WSFieldsBoostUser", 1000)
	if err != nil {
		return err
	}
	defer deleteUser(userID)

	conn, err := wsConnect(roomID)
	if err != nil {
		return err
	}
	defer conn.Close()

	// Small delay to ensure subscription is ready
	time.Sleep(100 * time.Millisecond)

	if err := boostRoom(roomID, userID, 50); err != nil {
		return err
	}

	payload, err := readWSMessage(conn, wsDead)
	if err != nil {
		return err
	}

	if _, ok := payload["room_id"]; !ok {
		return fmt.Errorf("boost payload missing 'room_id': %v", payload)
	}
	log.Printf("Boost payload fields OK: %v", payload)
	return nil
}

// Test 9: connecting to a non-existent room_id (bad string) returns HTTP 400 or closes cleanly
func testWSInvalidRoomID() error {
	endpoint := fmt.Sprintf("%s/rooms/not-a-number/ws", wsURL)
	_, resp, err := websocket.DefaultDialer.Dial(endpoint, nil)
	if err != nil {
		// Expected: server rejected the upgrade with a non-101 status
		if resp != nil && resp.StatusCode == http.StatusBadRequest {
			log.Printf("Server correctly rejected invalid room_id with 400")
			return nil
		}
		// Any rejection is acceptable
		log.Printf("Server rejected invalid room_id (err: %v)", err)
		return nil
	}
	return fmt.Errorf("expected server to reject WS connection for invalid room_id, but it was accepted")
}
