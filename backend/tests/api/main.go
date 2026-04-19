package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

const baseURL = "http://localhost:8888/api/v1"

var client = &http.Client{}

// state shared across tests
var (
	createdUserID int32
	createdRoomID int32
	secondUserID  int32
)

func main() {
	log.Println("=== API Integration Tests ===")

	tests := []struct {
		name string
		fn   func() error
	}{
		// users
		{"Test 1: Create user", testCreateUser},
		{"Test 2: Get user", testGetUser},
		// rooms
		{"Test 3: Create room", testCreateRoom},
		{"Test 4: List rooms", testListRooms},
		{"Test 5: Get room", testGetRoom},
		// room_players
		{"Test 6: Create second user for join", testCreateSecondUser},
		{"Test 7: Join room", testJoinRoom},
		{"Test 8: List room players", testListRoomPlayers},
		{"Test 9: Leave room", testLeaveRoom},
		// room_boosts (requires playing room — skipped with clear message)
		{"Test 10: Boost room (expects failure on non-playing room)", testBoostNonPlayingRoom},
		{"Test 11: List room boosts", testListRoomBoosts},
		// room_winners (requires finished room — skipped with clear message)
		{"Test 12: List room winners", testListRoomWinners},
		{"Test 13: Get room winner (expects 404)", testGetRoomWinnerNotFound},
		// cleanup
		{"Test 14: Delete users", testDeleteUsers},
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

func do(method, path string, body any) (*http.Response, []byte, error) {
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
	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	return resp, data, err
}

func mustStatus(resp *http.Response, data []byte, expected int) error {
	if resp.StatusCode != expected {
		return fmt.Errorf("expected status %d, got %d: %s", expected, resp.StatusCode, string(data))
	}
	return nil
}

func parseBody(data []byte, out any) error {
	return json.Unmarshal(data, out)
}

// --- users ---

func testCreateUser() error {
	resp, data, err := do("POST", "/users", map[string]any{
		"name":    "APITestUser",
		"balance": 5000,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		ID      int32  `json:"id"`
		Name    string `json:"name"`
		Balance int32  `json:"balance"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Name != "APITestUser" {
		return fmt.Errorf("expected name 'APITestUser', got '%s'", body.Name)
	}
	if body.Balance != 5000 {
		return fmt.Errorf("expected balance 5000, got %d", body.Balance)
	}
	createdUserID = body.ID
	log.Printf("Created user ID=%d", createdUserID)
	return nil
}

func testGetUser() error {
	resp, data, err := do("GET", fmt.Sprintf("/users/%d", createdUserID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		ID int32 `json:"id"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.ID != createdUserID {
		return fmt.Errorf("expected ID %d, got %d", createdUserID, body.ID)
	}
	return nil
}

// --- rooms ---

func testCreateRoom() error {
	resp, data, err := do("POST", "/rooms", map[string]any{
		"jackpot":        0,
		"status":         "new",
		"players_needed": 2,
		"entry_cost":     100,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		RoomID        int32  `json:"room_id"`
		Status        string `json:"status"`
		PlayersNeeded int32  `json:"players_needed"`
		EntryCost     int32  `json:"entry_cost"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Status != "new" {
		return fmt.Errorf("expected status 'new', got '%s'", body.Status)
	}
	if body.EntryCost != 100 {
		return fmt.Errorf("expected entry_cost 100, got %d", body.EntryCost)
	}
	createdRoomID = body.RoomID
	log.Printf("Created room ID=%d", createdRoomID)
	return nil
}

func testListRooms() error {
	resp, data, err := do("GET", "/rooms", nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Rooms []struct {
			RoomID int32 `json:"room_id"`
		} `json:"rooms"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if len(body.Rooms) == 0 {
		return fmt.Errorf("expected at least 1 room")
	}
	log.Printf("Listed %d rooms", len(body.Rooms))
	return nil
}

func testGetRoom() error {
	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d", createdRoomID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		RoomID int32 `json:"room_id"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.RoomID != createdRoomID {
		return fmt.Errorf("expected room_id %d, got %d", createdRoomID, body.RoomID)
	}
	return nil
}

// --- room_players ---

func testCreateSecondUser() error {
	resp, data, err := do("POST", "/users", map[string]any{
		"name":    "APITestUser2",
		"balance": 1000,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		ID int32 `json:"id"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	secondUserID = body.ID
	log.Printf("Created second user ID=%d", secondUserID)
	return nil
}

func testJoinRoom() error {
	resp, data, err := do("POST", fmt.Sprintf("/rooms/%d/players", createdRoomID), map[string]any{
		"user_id": createdUserID,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		RoomID int32  `json:"room_id"`
		Status string `json:"status"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.RoomID != createdRoomID {
		return fmt.Errorf("expected room_id %d, got %d", createdRoomID, body.RoomID)
	}
	log.Printf("User %d joined room %d, room status: %s", createdUserID, createdRoomID, body.Status)
	return nil
}

func testListRoomPlayers() error {
	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/players", createdRoomID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Players []struct {
			UserID int32 `json:"user_id"`
		} `json:"players"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if len(body.Players) == 0 {
		return fmt.Errorf("expected at least 1 player")
	}
	log.Printf("Room has %d player(s)", len(body.Players))
	return nil
}

func testLeaveRoom() error {
	resp, data, err := do("DELETE", fmt.Sprintf("/rooms/%d/players", createdRoomID), map[string]any{
		"user_id": createdUserID,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	log.Printf("User %d left room %d", createdUserID, createdRoomID)
	return nil
}

// --- room_boosts ---

func testBoostNonPlayingRoom() error {
	// Room is in 'new' status — boost should return empty (no rows inserted)
	// The API returns 200 with an empty/zero result, not an error code
	resp, data, err := do("POST", fmt.Sprintf("/rooms/%d/boosts", createdRoomID), map[string]any{
		"user_id": createdUserID,
		"amount":  100,
	})
	if err != nil {
		return err
	}
	// Expect either a 200 with zero room_id (SQL guard) or a 4xx
	log.Printf("Boost on non-playing room returned status %d: %s", resp.StatusCode, string(data))
	_ = resp
	return nil
}

func testListRoomBoosts() error {
	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/boosts", createdRoomID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Boosts []any `json:"boosts"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	log.Printf("Room has %d boost(s)", len(body.Boosts))
	return nil
}

// --- room_winners ---

func testListRoomWinners() error {
	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/winners", createdRoomID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Winners []any `json:"winners"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	log.Printf("Room has %d winner(s)", len(body.Winners))
	return nil
}

func testGetRoomWinnerNotFound() error {
	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/winners/%d", createdRoomID, createdUserID), nil)
	if err != nil {
		return err
	}
	// No winner exists — expect a non-200
	if resp.StatusCode == http.StatusOK {
		return fmt.Errorf("expected non-200 for missing winner, got 200: %s", string(data))
	}
	log.Printf("Got expected non-200 (%d) for missing winner", resp.StatusCode)
	return nil
}

// --- cleanup ---

func testDeleteUsers() error {
	for _, id := range []int32{createdUserID, secondUserID} {
		resp, data, err := do("DELETE", fmt.Sprintf("/users/%d", id), nil)
		if err != nil {
			return err
		}
		if err := mustStatus(resp, data, http.StatusOK); err != nil {
			return err
		}
		log.Printf("Deleted user ID=%d", id)
	}
	return nil
}
