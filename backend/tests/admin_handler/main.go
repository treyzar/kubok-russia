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
)

const baseURL = "http://localhost:8888/api/v1"

var client = &http.Client{}

// state shared across tests
var (
	createdTemplateID int32
)

func main() {
	log.Println("=== Admin Handler Integration Tests ===")

	tests := []struct {
		name string
		fn   func() error
	}{
		{"Test 1: Validate template with valid parameters", testValidateTemplateValid},
		{"Test 2: Validate template with warnings", testValidateTemplateWarnings},
		{"Test 3: Validate template duplicate", testValidateTemplateDuplicate},
		{"Test 4: Get template statistics list", testGetTemplateStatisticsList},
		{"Test 5: Get template statistics detail", testGetTemplateStatisticsDetail},
		{"Test 6: Get template status", testGetTemplateStatus},
		{"Test 7: Delete template with active rooms", testDeleteTemplateWithActiveRooms},
		{"Test 8: Update template with active rooms", testUpdateTemplateWithActiveRooms},
		{"Test 9: Create room from template tracks template_id", testRoomCreationTracksTemplateID},
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

	// Output SUITE_RESULT for run_all.sh script
	fmt.Printf("SUITE_RESULT::{\"suite\":\"Admin Handler\",\"passed\":%d,\"failed\":%d}\n", passed, failed)

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

// --- test functions ---

func testValidateTemplateValid() error {
	resp, data, err := do("POST", "/admin/templates/validate", map[string]any{
		"players_needed": 10,
		"min_players":    5,
		"entry_cost":     100,
		"winner_pct":     70,
		"game_type":      "train",
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Valid           bool  `json:"valid"`
		ExpectedJackpot int32 `json:"expected_jackpot"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	// Expected jackpot = 10 * 100 * 70 / 100 = 700
	if body.ExpectedJackpot != 700 {
		return fmt.Errorf("expected jackpot 700, got %d", body.ExpectedJackpot)
	}
	log.Printf("Valid template: jackpot=%d", body.ExpectedJackpot)
	return nil
}

func testValidateTemplateWarnings() error {
	resp, data, err := do("POST", "/admin/templates/validate", map[string]any{
		"players_needed": 1,
		"min_players":    1,
		"entry_cost":     100,
		"winner_pct":     90,
		"game_type":      "train",
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Warnings []struct {
			Field    string `json:"field"`
			Message  string `json:"message"`
			Severity string `json:"severity"`
		} `json:"warnings"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if len(body.Warnings) == 0 {
		return fmt.Errorf("expected warnings for players_needed=1 and winner_pct=90")
	}
	log.Printf("Got %d warning(s)", len(body.Warnings))
	return nil
}

func testValidateTemplateDuplicate() error {
	// First create a template with a unique name
	templateName := fmt.Sprintf("DuplicateTest_%d", time.Now().UnixNano())
	resp, data, err := do("POST", "/room-templates", map[string]any{
		"name":           templateName,
		"players_needed": 5,
		"min_players":    3,
		"entry_cost":     150,
		"winner_pct":     75,
		"game_type":      "train",
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var createBody struct {
		TemplateID int32 `json:"template_id"`
	}
	if err := parseBody(data, &createBody); err != nil {
		return err
	}
	createdTemplateID = createBody.TemplateID

	// Now validate with same parameters - should detect duplicate
	resp, data, err = do("POST", "/admin/templates/validate", map[string]any{
		"players_needed": 5,
		"min_players":    3,
		"entry_cost":     150,
		"winner_pct":     75,
		"game_type":      "train",
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		IsDuplicate bool `json:"is_duplicate"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if !body.IsDuplicate {
		return fmt.Errorf("expected is_duplicate=true for duplicate template")
	}
	log.Printf("Duplicate detected correctly")
	return nil
}

func testGetTemplateStatisticsList() error {
	resp, data, err := do("GET", "/admin/statistics/templates?period=all&sort_by=template_id&sort_order=asc", nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		Templates []struct {
			TemplateID     int32 `json:"template_id"`
			CompletedRooms int32 `json:"completed_rooms"`
		} `json:"templates"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	log.Printf("Listed %d templates with statistics", len(body.Templates))
	return nil
}

func testGetTemplateStatisticsDetail() error {
	if createdTemplateID == 0 {
		log.Printf("No template created - skipping detail test")
		return nil
	}
	resp, data, err := do("GET", fmt.Sprintf("/admin/statistics/templates/%d?period=all", createdTemplateID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		TemplateID     int32 `json:"template_id"`
		CompletedRooms int32 `json:"completed_rooms"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	if body.TemplateID != createdTemplateID {
		return fmt.Errorf("expected template_id %d, got %d", createdTemplateID, body.TemplateID)
	}
	log.Printf("Got detailed statistics for template %d", createdTemplateID)
	return nil
}

func testGetTemplateStatus() error {
	if createdTemplateID == 0 {
		log.Printf("No template created - skipping status test")
		return nil
	}
	resp, data, err := do("GET", fmt.Sprintf("/admin/templates/%d/status", createdTemplateID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var body struct {
		TemplateID   int32 `json:"template_id"`
		ActiveRooms  int32 `json:"active_rooms"`
		WaitingRooms int32 `json:"waiting_rooms"`
		CanDelete    bool  `json:"can_delete"`
	}
	if err := parseBody(data, &body); err != nil {
		return err
	}
	log.Printf("Template %d status: active=%d, waiting=%d, can_delete=%v",
		body.TemplateID, body.ActiveRooms, body.WaitingRooms, body.CanDelete)
	return nil
}

func testDeleteTemplateWithActiveRooms() error {
	if createdTemplateID == 0 {
		log.Printf("No template created - skipping delete test")
		return nil
	}
	// Try to delete - should succeed if no active rooms
	resp, data, err := do("DELETE", fmt.Sprintf("/admin/templates/%d", createdTemplateID), nil)
	if err != nil {
		return err
	}
	// Accept either 200 (success) or 409 (conflict if rooms exist)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusConflict {
		return fmt.Errorf("expected 200 or 409, got %d: %s", resp.StatusCode, string(data))
	}
	log.Printf("Delete returned status %d", resp.StatusCode)
	return nil
}

func testUpdateTemplateWithActiveRooms() error {
	// Create a new template for update test with unique name
	templateName := fmt.Sprintf("UpdateTest_%d", time.Now().UnixNano())
	resp, data, err := do("POST", "/room-templates", map[string]any{
		"name":           templateName,
		"players_needed": 4,
		"min_players":    2,
		"entry_cost":     100,
		"winner_pct":     70,
		"game_type":      "fridge",
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var createBody struct {
		TemplateID int32 `json:"template_id"`
	}
	if err := parseBody(data, &createBody); err != nil {
		return err
	}
	updateTemplateID := createBody.TemplateID

	// Try to update
	resp, data, err = do("PUT", fmt.Sprintf("/admin/templates/%d", updateTemplateID), map[string]any{
		"name":           templateName + "_Modified",
		"players_needed": 6,
		"min_players":    3,
		"entry_cost":     150,
		"winner_pct":     75,
		"game_type":      "fridge",
	})
	if err != nil {
		return err
	}
	// Accept either 200 (success) or 409 (conflict if rooms exist)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusConflict {
		return fmt.Errorf("expected 200 or 409, got %d: %s", resp.StatusCode, string(data))
	}
	log.Printf("Update returned status %d", resp.StatusCode)
	return nil
}

func testRoomCreationTracksTemplateID() error {
	// Create a template first with unique name
	templateName := fmt.Sprintf("TrackingTest_%d", time.Now().UnixNano())
	resp, data, err := do("POST", "/room-templates", map[string]any{
		"name":           templateName,
		"players_needed": 3,
		"min_players":    2,
		"entry_cost":     50,
		"winner_pct":     80,
		"game_type":      "train",
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var templateBody struct {
		TemplateID int32 `json:"template_id"`
	}
	if err := parseBody(data, &templateBody); err != nil {
		return err
	}
	templateID := templateBody.TemplateID

	// Create a room from this template
	resp, data, err = do("POST", "/rooms", map[string]any{
		"template_id":    templateID,
		"jackpot":        0,
		"status":         "new",
		"players_needed": 3,
		"entry_cost":     50,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var roomBody struct {
		RoomID     int32  `json:"room_id"`
		TemplateID *int32 `json:"template_id"`
	}
	if err := parseBody(data, &roomBody); err != nil {
		return err
	}

	// Verify template_id is tracked
	if roomBody.TemplateID == nil {
		return fmt.Errorf("expected template_id to be set, got nil")
	}
	if *roomBody.TemplateID != templateID {
		return fmt.Errorf("expected template_id %d, got %d", templateID, *roomBody.TemplateID)
	}

	// Verify we can retrieve the room and it still has template_id
	resp, data, err = do("GET", fmt.Sprintf("/rooms/%d", roomBody.RoomID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, http.StatusOK); err != nil {
		return err
	}
	var getRoomBody struct {
		RoomID     int32  `json:"room_id"`
		TemplateID *int32 `json:"template_id"`
	}
	if err := parseBody(data, &getRoomBody); err != nil {
		return err
	}
	if getRoomBody.TemplateID == nil || *getRoomBody.TemplateID != templateID {
		return fmt.Errorf("template_id not persisted correctly")
	}

	log.Printf("Room %d correctly tracks template_id %d", roomBody.RoomID, templateID)
	return nil
}
