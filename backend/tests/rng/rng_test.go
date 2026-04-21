package rng_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal/rng"
)

// mockRNGServer starts a test HTTP server that returns the given result value.
func mockRNGServer(result int32, statusCode int) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(statusCode)
		if statusCode == http.StatusOK {
			json.NewEncoder(w).Encode(map[string]int32{"result": result}) //nolint:errcheck
		}
	}))
}

// TC-01: successful external RNG call returns value in [0, max) (Requirements 7.2, 7.5, 7.6)
func TestRNGClient_ExternalSuccess(t *testing.T) {
	const max int32 = 10
	srv := mockRNGServer(5, http.StatusOK)
	defer srv.Close()

	client := rng.NewRNGClient(srv.URL)
	result, err := client.SelectRandom(context.Background(), max, 1, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != 5 {
		t.Errorf("expected result 5, got %d", result)
	}
}

// TC-02: fallback used when no URL configured (Requirement 7.4)
func TestRNGClient_FallbackWhenNoURL(t *testing.T) {
	const max int32 = 100
	client := rng.NewRNGClient("")
	result, err := client.SelectRandom(context.Background(), max, 1, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result < 0 || result >= max {
		t.Errorf("fallback result %d out of range [0, %d)", result, max)
	}
}

// TC-03: fallback used when external server returns non-200 (Requirement 7.3)
func TestRNGClient_FallbackOnServerError(t *testing.T) {
	srv := mockRNGServer(0, http.StatusInternalServerError)
	defer srv.Close()

	const max int32 = 50
	client := rng.NewRNGClient(srv.URL)
	result, err := client.SelectRandom(context.Background(), max, 2, 5)
	if err != nil {
		t.Fatalf("unexpected error (should fall back, not error): %v", err)
	}
	if result < 0 || result >= max {
		t.Errorf("fallback result %d out of range [0, %d)", result, max)
	}
}

// TC-04: fallback used on timeout (Requirement 7.3)
func TestRNGClient_FallbackOnTimeout(t *testing.T) {
	// Server that delays longer than the client timeout (2s)
	slowSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(3 * time.Second)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]int32{"result": 1}) //nolint:errcheck
	}))
	defer slowSrv.Close()

	const max int32 = 20
	client := rng.NewRNGClient(slowSrv.URL)
	result, err := client.SelectRandom(context.Background(), max, 3, 4)
	if err != nil {
		t.Fatalf("unexpected error (should fall back, not error): %v", err)
	}
	if result < 0 || result >= max {
		t.Errorf("fallback result %d out of range [0, %d)", result, max)
	}
}

// TC-05: range validation — server returns out-of-range value triggers fallback (Requirement 7.6)
func TestRNGClient_FallbackOnOutOfRangeResponse(t *testing.T) {
	const max int32 = 5
	// Server returns 10, which is >= max=5 → invalid
	srv := mockRNGServer(10, http.StatusOK)
	defer srv.Close()

	client := rng.NewRNGClient(srv.URL)
	result, err := client.SelectRandom(context.Background(), max, 4, 2)
	if err != nil {
		t.Fatalf("unexpected error (should fall back): %v", err)
	}
	if result < 0 || result >= max {
		t.Errorf("result %d out of range [0, %d)", result, max)
	}
}

// TC-06: request includes room_id and player_count query params (Requirement 7.5)
func TestRNGClient_RequestParams(t *testing.T) {
	var gotMax, gotRoomID, gotPlayerCount string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMax = r.URL.Query().Get("max")
		gotRoomID = r.URL.Query().Get("room_id")
		gotPlayerCount = r.URL.Query().Get("player_count")
		json.NewEncoder(w).Encode(map[string]int32{"result": 0}) //nolint:errcheck
	}))
	defer srv.Close()

	client := rng.NewRNGClient(srv.URL)
	client.SelectRandom(context.Background(), 10, 42, 7) //nolint:errcheck

	if gotMax != "10" {
		t.Errorf("expected max=10, got %q", gotMax)
	}
	if gotRoomID != "42" {
		t.Errorf("expected room_id=42, got %q", gotRoomID)
	}
	if gotPlayerCount != "7" {
		t.Errorf("expected player_count=7, got %q", gotPlayerCount)
	}
}

// TC-07: max <= 0 returns error (Requirement 7.6)
func TestRNGClient_InvalidMax(t *testing.T) {
	client := rng.NewRNGClient("")
	_, err := client.SelectRandom(context.Background(), 0, 1, 1)
	if err == nil {
		t.Error("expected error for max=0, got nil")
	}
}
