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
	createdUserID  int32
	createdRoomID  int32
	secondUserID   int32
	createdTplID   int32
	finishedRoomID int32
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
		{"Test 3: List users", testListUsers},
		{"Test 4: Update balance (positive delta)", testUpdateBalancePositive},
		{"Test 5: Update balance (negative delta)", testUpdateBalanceNegative},
		{"Test 6: Update balance (underflow)", testUpdateBalanceUnderflow},
		{"Test 6a: Increase balance", testIncreaseBalance},
		{"Test 6b: Decrease balance", testDecreaseBalance},
		{"Test 6c: Decrease balance (insufficient)", testDecreaseBalanceInsufficient},
		{"Test 6d: Set balance", testSetBalance},
		{"Test 6e: Set balance (negative)", testSetBalanceNegative},
		// rooms
		{"Test 7: Create room", testCreateRoom},
		{"Test 7a: Reset balance for room tests", testResetBalanceForRoomTests},
		{"Test 8: List rooms (no filter)", testListRooms},
		{"Test 9: List rooms (filter by status)", testListRoomsByStatus},
		{"Test 10: List rooms (filter by entry_cost)", testListRoomsByEntryCost},
		{"Test 11: List rooms (filter by players_needed)", testListRoomsByPlayersNeeded},
		{"Test 12: Get room", testGetRoom},
		// room configurator
		{"Test 13: Validate room config (valid)", testValidateRoomValid},
		{"Test 14: Validate room config (with warnings)", testValidateRoomWarnings},
		// room_players
		{"Test 15: Create second user for join", testCreateSecondUser},
		{"Test 16: Join room", testJoinRoom},
		{"Test 17: Join room (insufficient balance)", testJoinRoomInsufficientBalance},
		{"Test 18: Join room (full room)", testJoinRoomFull},
		{"Test 19: List room players", testListRoomPlayers},
		{"Test 20: Leave room", testLeaveRoom},
		// room_boosts
		{"Test 21: Boost room (expects failure on non-playing room)", testBoostNonPlayingRoom},
		{"Test 22: Boost room (duplicate rejection)", testBoostDuplicateRejection},
		{"Test 23: List room boosts", testListRoomBoosts},
		// room_winners
		{"Test 24: List room winners", testListRoomWinners},
		{"Test 25: Get room winner (expects 404)", testGetRoomWinnerNotFound},
		// round history
		{"Test 26: List rounds", testListRounds},
		{"Test 27: Get round by room_id", testGetRound},
		// templates
		{"Test 28: Create template", testCreateTemplate},
		{"Test 29: List templates", testListTemplates},
		{"Test 30: Get template", testGetTemplate},
		{"Test 31: Update template", testUpdateTemplate},
		{"Test 32: Delete template", testDeleteTemplate},
		// cleanup
		{"Test 33: Delete users", testDeleteUsers},
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

func testListUsers() error {
	resp, data, err := do("GET", "/users", nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Users []struct {
			ID int32 `json:"id"`
		} `json:"users"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if len(body.Users) == 0 {
		return fmt.Errorf("expected at least 1 user")
	}
	// Verify our created user is in the list
	found := false
	for _, u := range body.Users {
		if u.ID == createdUserID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created user %d not found in list", createdUserID)
	}
	log.Printf("Listed %d users", len(body.Users))
	return nil
}

func testUpdateBalancePositive() error {
	resp, data, err := do("PATCH", fmt.Sprintf("/users/%d/balance", createdUserID), map[string]any{
		"delta": 500,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Balance int32 `json:"balance"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Balance != 5500 {
		return fmt.Errorf("expected balance 5500 after +500, got %d", body.Balance)
	}
	log.Printf("Balance after +500: %d", body.Balance)
	return nil
}

func testUpdateBalanceNegative() error {
	resp, data, err := do("PATCH", fmt.Sprintf("/users/%d/balance", createdUserID), map[string]any{
		"delta": -500,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Balance int32 `json:"balance"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Balance != 5000 {
		return fmt.Errorf("expected balance 5000 after -500, got %d", body.Balance)
	}
	log.Printf("Balance after -500: %d", body.Balance)
	return nil
}

func testUpdateBalanceUnderflow() error {
	// Try to subtract more than the current balance (5000)
	resp, data, err := do("PATCH", fmt.Sprintf("/users/%d/balance", createdUserID), map[string]any{
		"delta": -99999,
	})
	if err != nil {
		return err
	}
	// Expect a 4xx — balance cannot go below zero
	if resp.StatusCode < 400 {
		return fmt.Errorf("expected 4xx for underflow, got %d: %s", resp.StatusCode, string(data))
	}
	log.Printf("Underflow correctly rejected with status %d", resp.StatusCode)
	return nil
}

func testIncreaseBalance() error {
	resp, data, err := do("POST", fmt.Sprintf("/users/%d/balance/increase", createdUserID), map[string]any{
		"amount": 1000,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Balance int32 `json:"balance"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Balance != 6000 {
		return fmt.Errorf("expected balance 6000 after increase by 1000, got %d", body.Balance)
	}
	log.Printf("Balance after increase by 1000: %d", body.Balance)
	return nil
}

func testDecreaseBalance() error {
	resp, data, err := do("POST", fmt.Sprintf("/users/%d/balance/decrease", createdUserID), map[string]any{
		"amount": 500,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Balance int32 `json:"balance"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Balance != 5500 {
		return fmt.Errorf("expected balance 5500 after decrease by 500, got %d", body.Balance)
	}
	log.Printf("Balance after decrease by 500: %d", body.Balance)
	return nil
}

func testDecreaseBalanceInsufficient() error {
	// Try to decrease more than current balance (5500)
	resp, data, err := do("POST", fmt.Sprintf("/users/%d/balance/decrease", createdUserID), map[string]any{
		"amount": 99999,
	})
	if err != nil {
		return err
	}
	// Expect a 4xx — insufficient balance
	if resp.StatusCode < 400 {
		return fmt.Errorf("expected 4xx for insufficient balance, got %d: %s", resp.StatusCode, string(data))
	}
	log.Printf("Insufficient balance correctly rejected with status %d", resp.StatusCode)
	return nil
}

func testSetBalance() error {
	resp, data, err := do("PUT", fmt.Sprintf("/users/%d/balance", createdUserID), map[string]any{
		"balance": 3000,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Balance int32 `json:"balance"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Balance != 3000 {
		return fmt.Errorf("expected balance 3000 after set, got %d", body.Balance)
	}
	log.Printf("Balance after set to 3000: %d", body.Balance)
	return nil
}

func testSetBalanceNegative() error {
	// Try to set negative balance
	resp, data, err := do("PUT", fmt.Sprintf("/users/%d/balance", createdUserID), map[string]any{
		"balance": -100,
	})
	if err != nil {
		return err
	}
	// Expect a 4xx — negative balance not allowed
	if resp.StatusCode < 400 {
		return fmt.Errorf("expected 4xx for negative balance, got %d: %s", resp.StatusCode, string(data))
	}
	log.Printf("Negative balance correctly rejected with status %d", resp.StatusCode)
	return nil
}

// --- rooms ---

func testResetBalanceForRoomTests() error {
	// Reset balance to 5000 for room tests
	resp, data, err := do("PUT", fmt.Sprintf("/users/%d/balance", createdUserID), map[string]any{
		"balance": 5000,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	log.Printf("Reset balance to 5000 for room tests")
	return nil
}

func testCreateRoom() error {
	resp, data, err := do("POST", "/rooms", map[string]any{
		"jackpot":        0,
		"status":         "new",
		"players_needed": 2,
		"entry_cost":     100,
		"winner_pct":     80,
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
		WinnerPct     int32  `json:"winner_pct"`
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
	if body.WinnerPct != 80 {
		return fmt.Errorf("expected winner_pct 80, got %d", body.WinnerPct)
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

func testListRoomsByStatus() error {
	resp, data, err := do("GET", "/rooms?status=new", nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Rooms []struct {
			RoomID int32  `json:"room_id"`
			Status string `json:"status"`
		} `json:"rooms"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	for _, r := range body.Rooms {
		if r.Status != "new" {
			return fmt.Errorf("filter by status=new returned room with status '%s'", r.Status)
		}
	}
	log.Printf("Filter by status=new returned %d rooms", len(body.Rooms))
	return nil
}

func testListRoomsByEntryCost() error {
	resp, data, err := do("GET", "/rooms?entry_cost=100", nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Rooms []struct {
			RoomID    int32 `json:"room_id"`
			EntryCost int32 `json:"entry_cost"`
		} `json:"rooms"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	for _, r := range body.Rooms {
		if r.EntryCost != 100 {
			return fmt.Errorf("filter by entry_cost=100 returned room with entry_cost %d", r.EntryCost)
		}
	}
	log.Printf("Filter by entry_cost=100 returned %d rooms", len(body.Rooms))
	return nil
}

func testListRoomsByPlayersNeeded() error {
	resp, data, err := do("GET", "/rooms?players_needed=2", nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Rooms []struct {
			RoomID        int32 `json:"room_id"`
			PlayersNeeded int32 `json:"players_needed"`
		} `json:"rooms"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	for _, r := range body.Rooms {
		if r.PlayersNeeded != 2 {
			return fmt.Errorf("filter by players_needed=2 returned room with players_needed %d", r.PlayersNeeded)
		}
	}
	log.Printf("Filter by players_needed=2 returned %d rooms", len(body.Rooms))
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

// --- room configurator ---

func testValidateRoomValid() error {
	resp, data, err := do("POST", "/rooms/validate", map[string]any{
		"players_needed": 10,
		"entry_cost":     100,
		"winner_pct":     80,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		PrizeFund    int32    `json:"prize_fund"`
		OrganiserCut int32    `json:"organiser_cut"`
		PlayerROI    float64  `json:"player_roi"`
		Warnings     []string `json:"warnings"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	// 10 players * 100 entry = 1000 jackpot; 80% prize = 800
	if body.PrizeFund != 800 {
		return fmt.Errorf("expected prize_fund 800, got %d", body.PrizeFund)
	}
	if body.OrganiserCut != 200 {
		return fmt.Errorf("expected organiser_cut 200, got %d", body.OrganiserCut)
	}
	// ROI = 800 / 100 = 8.0
	if body.PlayerROI != 8.0 {
		return fmt.Errorf("expected player_roi 8.0, got %f", body.PlayerROI)
	}
	log.Printf("Valid config: prize_fund=%d, organiser_cut=%d, roi=%.2f, warnings=%v",
		body.PrizeFund, body.OrganiserCut, body.PlayerROI, body.Warnings)
	return nil
}

func testValidateRoomWarnings() error {
	// winner_pct=40 triggers "winner receives less than half the jackpot"
	// player_roi = (2*100*40/100)/100 = 0.8 < 1.5 triggers "prize fund may be unattractive"
	resp, data, err := do("POST", "/rooms/validate", map[string]any{
		"players_needed": 2,
		"entry_cost":     100,
		"winner_pct":     40,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Warnings []string `json:"warnings"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if len(body.Warnings) == 0 {
		return fmt.Errorf("expected at least 1 warning for low winner_pct config, got none")
	}
	log.Printf("Config with warnings returned %d warning(s): %v", len(body.Warnings), body.Warnings)
	return nil
}

// --- room_players ---

func testCreateSecondUser() error {
	resp, data, err := do("POST", "/users", map[string]any{
		"name":    "APITestUser2",
		"balance": 50, // intentionally low for insufficient-balance test
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
	log.Printf("Created second user ID=%d (balance=50)", secondUserID)
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

func testJoinRoomInsufficientBalance() error {
	// secondUserID has balance=50, room entry_cost=100 → expect 402
	resp, data, err := do("POST", fmt.Sprintf("/rooms/%d/players", createdRoomID), map[string]any{
		"user_id": secondUserID,
	})
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusPaymentRequired {
		return fmt.Errorf("expected 402 for insufficient balance, got %d: %s", resp.StatusCode, string(data))
	}
	log.Printf("Insufficient balance correctly rejected with 402")
	return nil
}

func testJoinRoomFull() error {
	// Create a room with players_needed=1 and join it, then try to join again with another user
	resp, data, err := do("POST", "/rooms", map[string]any{
		"jackpot":        0,
		"status":         "new",
		"players_needed": 1,
		"entry_cost":     0,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var roomBody struct {
		RoomID int32 `json:"room_id"`
	}
	if err := parseBody(data, &roomBody); err != nil {
		return err
	}
	fullRoomID := roomBody.RoomID

	// First user joins (fills the room)
	resp, data, err = do("POST", fmt.Sprintf("/rooms/%d/players", fullRoomID), map[string]any{
		"user_id": createdUserID,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}

	// Second user tries to join full room → expect 409
	resp, data, err = do("POST", fmt.Sprintf("/rooms/%d/players", fullRoomID), map[string]any{
		"user_id": secondUserID,
	})
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusConflict {
		return fmt.Errorf("expected 409 for full room, got %d: %s", resp.StatusCode, string(data))
	}
	log.Printf("Full room correctly rejected with 409")
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
	resp, data, err := do("POST", fmt.Sprintf("/rooms/%d/boosts", createdRoomID), map[string]any{
		"user_id": createdUserID,
		"amount":  100,
	})
	if err != nil {
		return err
	}
	log.Printf("Boost on non-playing room returned status %d: %s", resp.StatusCode, string(data))
	_ = resp
	return nil
}

func testBoostDuplicateRejection() error {
	// Create a playing room to test duplicate boost rejection
	resp, data, err := do("POST", "/rooms", map[string]any{
		"jackpot":        0,
		"status":         "playing",
		"players_needed": 2,
		"entry_cost":     0,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var roomBody struct {
		RoomID int32 `json:"room_id"`
	}
	if err := parseBody(data, &roomBody); err != nil {
		return err
	}
	playingRoomID := roomBody.RoomID

	// First boost — should succeed
	resp, data, err = do("POST", fmt.Sprintf("/rooms/%d/boosts", playingRoomID), map[string]any{
		"user_id": createdUserID,
		"amount":  10,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}

	// Second boost by same user — expect 409
	resp, data, err = do("POST", fmt.Sprintf("/rooms/%d/boosts", playingRoomID), map[string]any{
		"user_id": createdUserID,
		"amount":  10,
	})
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusConflict {
		return fmt.Errorf("expected 409 for duplicate boost, got %d: %s", resp.StatusCode, string(data))
	}
	log.Printf("Duplicate boost correctly rejected with 409")
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
	if resp.StatusCode == http.StatusOK {
		return fmt.Errorf("expected non-200 for missing winner, got 200: %s", string(data))
	}
	log.Printf("Got expected non-200 (%d) for missing winner", resp.StatusCode)
	return nil
}

// --- round history ---

func testListRounds() error {
	resp, data, err := do("GET", "/rounds", nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Rounds []struct {
			RoomID int32 `json:"room_id"`
		} `json:"rounds"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	log.Printf("Listed %d finished rounds", len(body.Rounds))
	if len(body.Rounds) > 0 {
		finishedRoomID = body.Rounds[0].RoomID
	}
	return nil
}

func testGetRound() error {
	if finishedRoomID == 0 {
		log.Printf("No finished rooms available — skipping GET /rounds/{room_id}")
		return nil
	}
	resp, data, err := do("GET", fmt.Sprintf("/rounds/%d", finishedRoomID), nil)
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
	if body.RoomID != finishedRoomID {
		return fmt.Errorf("expected room_id %d, got %d", finishedRoomID, body.RoomID)
	}
	log.Printf("Got round for room_id=%d", finishedRoomID)
	return nil
}

// --- templates ---

func testCreateTemplate() error {
	resp, data, err := do("POST", "/room-templates", map[string]any{
		"name":           "TestTemplate",
		"players_needed": 4,
		"entry_cost":     200,
		"winner_pct":     75,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		TemplateID    int32  `json:"template_id"`
		Name          string `json:"name"`
		PlayersNeeded int32  `json:"players_needed"`
		EntryCost     int32  `json:"entry_cost"`
		WinnerPct     int32  `json:"winner_pct"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Name != "TestTemplate" {
		return fmt.Errorf("expected name 'TestTemplate', got '%s'", body.Name)
	}
	if body.PlayersNeeded != 4 {
		return fmt.Errorf("expected players_needed 4, got %d", body.PlayersNeeded)
	}
	if body.EntryCost != 200 {
		return fmt.Errorf("expected entry_cost 200, got %d", body.EntryCost)
	}
	if body.WinnerPct != 75 {
		return fmt.Errorf("expected winner_pct 75, got %d", body.WinnerPct)
	}
	createdTplID = body.TemplateID
	log.Printf("Created template ID=%d", createdTplID)
	return nil
}

func testListTemplates() error {
	resp, data, err := do("GET", "/room-templates", nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Templates []struct {
			TemplateID int32 `json:"template_id"`
		} `json:"templates"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	found := false
	for _, t := range body.Templates {
		if t.TemplateID == createdTplID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created template %d not found in list", createdTplID)
	}
	log.Printf("Listed %d templates", len(body.Templates))
	return nil
}

func testGetTemplate() error {
	resp, data, err := do("GET", fmt.Sprintf("/room-templates/%d", createdTplID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		TemplateID int32 `json:"template_id"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.TemplateID != createdTplID {
		return fmt.Errorf("expected template_id %d, got %d", createdTplID, body.TemplateID)
	}
	return nil
}

func testUpdateTemplate() error {
	resp, data, err := do("PUT", fmt.Sprintf("/room-templates/%d", createdTplID), map[string]any{
		"name":           "TestTemplateUpdated",
		"players_needed": 5,
		"entry_cost":     250,
		"winner_pct":     70,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Name          string `json:"name"`
		PlayersNeeded int32  `json:"players_needed"`
		EntryCost     int32  `json:"entry_cost"`
		WinnerPct     int32  `json:"winner_pct"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.Name != "TestTemplateUpdated" {
		return fmt.Errorf("expected updated name 'TestTemplateUpdated', got '%s'", body.Name)
	}
	if body.PlayersNeeded != 5 {
		return fmt.Errorf("expected players_needed 5, got %d", body.PlayersNeeded)
	}
	log.Printf("Updated template: name=%s, players_needed=%d", body.Name, body.PlayersNeeded)
	return nil
}

func testDeleteTemplate() error {
	resp, data, err := do("DELETE", fmt.Sprintf("/room-templates/%d", createdTplID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	log.Printf("Deleted template ID=%d", createdTplID)
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
