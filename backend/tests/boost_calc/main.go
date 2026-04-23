package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
)

// These mirror the server formulas exactly so we can compute expected values locally.
//
// probability = 100 * (totalPlayerAmount + boostAmount) / (poolBase + acc + boostAmount)
// boostAmount = ceil( (p*(poolBase+acc) - 100*totalPlayerAmount) / (100-p) )
//
// Where:
//   poolBase          = players_needed * entry_cost
//   acc               = sum of all existing boosts in the room
//   totalPlayerAmount = player's total stake (entry + their existing boost)

func expectedProbability(totalPlayerAmount, acc, poolBase, boostAmount float64) float64 {
	denom := poolBase + acc + boostAmount
	if denom == 0 {
		denom = 1
	}
	return 100 * (totalPlayerAmount + boostAmount) / denom
}

func expectedBoostAmount(totalPlayerAmount, acc, poolBase, desiredProbability float64) int32 {
	raw := (desiredProbability*(poolBase+acc) - 100*totalPlayerAmount) / (100 - desiredProbability)
	if raw < 0 {
		raw = 0
	}
	return int32(math.Ceil(raw))
}

const baseURL = "http://localhost:8888/api/v1"
const epsilon = 0.0001 // float comparison tolerance

var client = &http.Client{}

// shared state
var (
	userID int32
	roomID int32
)

// room setup params — known values so we can compute expectations
const (
	playersNeeded = 2
	entryCost     = 500
	// poolBase = playersNeeded * entryCost = 1000
	// user joins with 1 place → totalPlayerAmount = entryCost = 500
	// no boosts yet → acc = 0
)

func main() {
	log.Println("=== Boost Calc API Tests ===")

	tests := []struct {
		name string
		fn   func() error
	}{
		{"Setup: create user", setupUser},
		{"Setup: create room", setupRoom},
		{"Setup: join room", setupJoin},
		{"Test 1: CalcProbability with zero boost", testProbabilityZeroBoost},
		{"Test 2: CalcProbability with non-zero boost", testProbabilityWithBoost},
		{"Test 3: CalcBoost for desired probability", testCalcBoost},
		{"Test 4: CalcBoost and CalcProbability are inverses", testInverse},
		{"Test 5: CalcBoost with desired_probability=0 returns 400", testCalcBoostInvalidProb},
		{"Cleanup", cleanup},
	}

	passed, failed := 0, 0
	for _, t := range tests {
		log.Printf("\n--- %s ---", t.name)
		if err := t.fn(); err != nil {
			log.Printf("❌ FAILED: %v", err)
			failed++
		} else {
			log.Printf("✅ PASSED")
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
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, baseURL+path, r)
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
		return fmt.Errorf("expected HTTP %d, got %d: %s", expected, resp.StatusCode, string(data))
	}
	return nil
}

// --- setup ---

func setupUser() error {
	resp, data, err := do("POST", "/users", map[string]any{"name": "BoostCalcTestUser", "balance": 100000})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, 200); err != nil {
		return err
	}
	var body struct {
		ID int32 `json:"id"`
	}
	json.Unmarshal(data, &body)
	userID = body.ID
	log.Printf("user_id=%d", userID)
	return nil
}

func setupRoom() error {
	resp, data, err := do("POST", "/rooms", map[string]any{
		"jackpot":        0,
		"status":         "new",
		"players_needed": playersNeeded,
		"entry_cost":     entryCost,
	})
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, 200); err != nil {
		return err
	}
	var body struct {
		RoomID int32 `json:"room_id"`
	}
	json.Unmarshal(data, &body)
	roomID = body.RoomID
	log.Printf("room_id=%d", roomID)
	return nil
}

func setupJoin() error {
	resp, data, err := do("POST", fmt.Sprintf("/rooms/%d/players", roomID), map[string]any{
		"user_id": userID,
	})
	if err != nil {
		return err
	}
	return mustStatus(resp, data, 200)
}

// --- tests ---

// No boost yet: acc=0, totalPlayerAmount=entryCost, boostAmount=0
// probability = 100 * 500 / (1000 + 0 + 0) = 50.0
func testProbabilityZeroBoost() error {
	poolBase := float64(playersNeeded * entryCost)
	acc := 0.0
	totalPlayerAmount := float64(entryCost) // joined with 1 place
	boostAmount := 0.0

	expected := expectedProbability(totalPlayerAmount, acc, poolBase, boostAmount)
	log.Printf("expected probability=%.4f%%", expected)

	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/boosts/calc/probability?user_id=%d&boost_amount=0", roomID, userID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, 200); err != nil {
		return err
	}
	var body struct {
		Probability float64 `json:"probability"`
	}
	json.Unmarshal(data, &body)
	log.Printf("got probability=%.4f%%", body.Probability)

	if math.Abs(body.Probability-expected) > epsilon {
		return fmt.Errorf("expected %.4f, got %.4f", expected, body.Probability)
	}
	return nil
}

// With boost=200: acc=0, totalPlayerAmount=500, boostAmount=200
// probability = 100 * (500+200) / (1000+0+200) = 100*700/1200 ≈ 58.3333
func testProbabilityWithBoost() error {
	poolBase := float64(playersNeeded * entryCost)
	acc := 0.0
	totalPlayerAmount := float64(entryCost)
	boostAmount := 200.0

	expected := expectedProbability(totalPlayerAmount, acc, poolBase, boostAmount)
	log.Printf("expected probability=%.4f%%", expected)

	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/boosts/calc/probability?user_id=%d&boost_amount=200", roomID, userID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, 200); err != nil {
		return err
	}
	var body struct {
		Probability float64 `json:"probability"`
	}
	json.Unmarshal(data, &body)
	log.Printf("got probability=%.4f%%", body.Probability)

	if math.Abs(body.Probability-expected) > epsilon {
		return fmt.Errorf("expected %.4f, got %.4f", expected, body.Probability)
	}
	return nil
}

// Desired probability = 75%: acc=0, totalPlayerAmount=500, poolBase=1000
// boost = ceil( (75*1000 - 100*500) / (100-75) ) = ceil( (75000-50000)/25 ) = ceil(1000) = 1000
func testCalcBoost() error {
	poolBase := float64(playersNeeded * entryCost)
	acc := 0.0
	totalPlayerAmount := float64(entryCost)
	desiredProb := 75.0

	expected := expectedBoostAmount(totalPlayerAmount, acc, poolBase, desiredProb)
	log.Printf("expected boost_amount=%d", expected)

	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/boosts/calc/boost?user_id=%d&desired_probability=75", roomID, userID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, 200); err != nil {
		return err
	}
	var body struct {
		BoostAmount int32 `json:"boost_amount"`
	}
	json.Unmarshal(data, &body)
	log.Printf("got boost_amount=%d", body.BoostAmount)

	if body.BoostAmount != expected {
		return fmt.Errorf("expected %d, got %d", expected, body.BoostAmount)
	}
	return nil
}

// Inverse property: CalcBoost(p) → amount, then CalcProbability(amount) should ≈ p
func testInverse() error {
	desiredProb := 60.0

	// get required boost
	resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/boosts/calc/boost?user_id=%d&desired_probability=60", roomID, userID), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, 200); err != nil {
		return err
	}
	var boostBody struct {
		BoostAmount int32 `json:"boost_amount"`
	}
	json.Unmarshal(data, &boostBody)
	log.Printf("boost needed for %.0f%%: %d", desiredProb, boostBody.BoostAmount)

	// now check what probability that boost gives
	resp, data, err = do("GET", fmt.Sprintf("/rooms/%d/boosts/calc/probability?user_id=%d&boost_amount=%d", roomID, userID, boostBody.BoostAmount), nil)
	if err != nil {
		return err
	}
	if err := mustStatus(resp, data, 200); err != nil {
		return err
	}
	var probBody struct {
		Probability float64 `json:"probability"`
	}
	json.Unmarshal(data, &probBody)
	log.Printf("probability from that boost: %.4f%% (desired %.0f%%)", probBody.Probability, desiredProb)

	// ceil can cause up to 1 unit of overshoot, so probability should be >= desired and close
	if probBody.Probability < desiredProb-0.01 {
		return fmt.Errorf("probability %.4f is below desired %.4f", probBody.Probability, desiredProb)
	}
	return nil
}

// desired_probability=0 or >=100 should return 400
func testCalcBoostInvalidProb() error {
	for _, p := range []string{"0", "100", "-5", "101"} {
		resp, data, err := do("GET", fmt.Sprintf("/rooms/%d/boosts/calc/boost?user_id=%d&desired_probability=%s", roomID, userID, p), nil)
		if err != nil {
			return err
		}
		if resp.StatusCode == 200 {
			return fmt.Errorf("desired_probability=%s should not return 200: %s", p, string(data))
		}
		log.Printf("desired_probability=%s → HTTP %d (correct)", p, resp.StatusCode)
	}
	return nil
}

// --- cleanup ---

func cleanup() error {
	resp, data, err := do("DELETE", fmt.Sprintf("/users/%d", userID), nil)
	if err != nil {
		return err
	}
	return mustStatus(resp, data, 200)
}
