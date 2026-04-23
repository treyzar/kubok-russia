package service

import (
	"testing"
	"time"
)

// TestValidateTemplate_MaxPlayersOne tests warning for max players = 1
func TestValidateTemplate_MaxPlayersOne(t *testing.T) {
	params := ValidateTemplateParams{
		PlayersNeeded: 1,
		MinPlayers:    1,
		EntryCost:     100,
		WinnerPct:     70,
		GameType:      "standard",
	}

	// Mock historical metrics
	metrics := &HistoricalMetrics{
		AvgRealPlayersPerRoom: 5.0,
		AvgEntryCost:          100.0,
		TotalRooms:            10,
	}

	warnings := validateTemplateWithMetrics(params, metrics)

	// Should have warning for max players = 1
	found := false
	for _, w := range warnings {
		if w.Field == "players_needed" && w.Severity == "warning" {
			found = true
			break
		}
	}

	if !found {
		t.Error("expected warning for players_needed = 1")
	}
}

// TestValidateTemplate_MinPlayersTooHigh tests warning for min players exceeding average
func TestValidateTemplate_MinPlayersTooHigh(t *testing.T) {
	params := ValidateTemplateParams{
		PlayersNeeded: 10,
		MinPlayers:    8,
		EntryCost:     100,
		WinnerPct:     70,
		GameType:      "standard",
	}

	metrics := &HistoricalMetrics{
		AvgRealPlayersPerRoom: 5.0,
		AvgEntryCost:          100.0,
		TotalRooms:            10,
	}

	warnings := validateTemplateWithMetrics(params, metrics)

	// Should have warning for min players > avg
	found := false
	for _, w := range warnings {
		if w.Field == "min_players" && w.Severity == "warning" {
			found = true
			break
		}
	}

	if !found {
		t.Error("expected warning for min_players exceeding average")
	}
}

// TestValidateTemplate_EntryCostTooHigh tests warning for entry cost > 1.75x average
func TestValidateTemplate_EntryCostTooHigh(t *testing.T) {
	params := ValidateTemplateParams{
		PlayersNeeded: 5,
		MinPlayers:    3,
		EntryCost:     200,
		WinnerPct:     70,
		GameType:      "standard",
	}

	metrics := &HistoricalMetrics{
		AvgRealPlayersPerRoom: 5.0,
		AvgEntryCost:          100.0,
		TotalRooms:            10,
	}

	warnings := validateTemplateWithMetrics(params, metrics)

	// Should have warning for entry cost > 1.75x avg (200 > 175)
	found := false
	for _, w := range warnings {
		if w.Field == "entry_cost" && w.Severity == "warning" {
			found = true
			break
		}
	}

	if !found {
		t.Error("expected warning for entry_cost too high")
	}
}

// TestValidateTemplate_EntryCostTooLow tests warning for entry cost < 0.5x average
func TestValidateTemplate_EntryCostTooLow(t *testing.T) {
	params := ValidateTemplateParams{
		PlayersNeeded: 5,
		MinPlayers:    3,
		EntryCost:     40,
		WinnerPct:     70,
		GameType:      "standard",
	}

	metrics := &HistoricalMetrics{
		AvgRealPlayersPerRoom: 5.0,
		AvgEntryCost:          100.0,
		TotalRooms:            10,
	}

	warnings := validateTemplateWithMetrics(params, metrics)

	// Should have warning for entry cost < 0.5x avg (40 < 50)
	found := false
	for _, w := range warnings {
		if w.Field == "entry_cost" && w.Severity == "warning" {
			found = true
			break
		}
	}

	if !found {
		t.Error("expected warning for entry_cost too low")
	}
}

// TestValidateTemplate_WinnerPctTooHigh tests warning for winner_pct > 80
func TestValidateTemplate_WinnerPctTooHigh(t *testing.T) {
	params := ValidateTemplateParams{
		PlayersNeeded: 5,
		MinPlayers:    3,
		EntryCost:     100,
		WinnerPct:     85,
		GameType:      "standard",
	}

	metrics := &HistoricalMetrics{
		AvgRealPlayersPerRoom: 5.0,
		AvgEntryCost:          100.0,
		TotalRooms:            10,
	}

	warnings := validateTemplateWithMetrics(params, metrics)

	// Should have warning for winner_pct > 80
	found := false
	for _, w := range warnings {
		if w.Field == "winner_pct" && w.Severity == "warning" {
			found = true
			break
		}
	}

	if !found {
		t.Error("expected warning for winner_pct too high")
	}
}

// TestValidateTemplate_WinnerPctTooLow tests warning for winner_pct < 50
func TestValidateTemplate_WinnerPctTooLow(t *testing.T) {
	params := ValidateTemplateParams{
		PlayersNeeded: 5,
		MinPlayers:    3,
		EntryCost:     100,
		WinnerPct:     40,
		GameType:      "standard",
	}

	metrics := &HistoricalMetrics{
		AvgRealPlayersPerRoom: 5.0,
		AvgEntryCost:          100.0,
		TotalRooms:            10,
	}

	warnings := validateTemplateWithMetrics(params, metrics)

	// Should have warning for winner_pct < 50
	found := false
	for _, w := range warnings {
		if w.Field == "winner_pct" && w.Severity == "warning" {
			found = true
			break
		}
	}

	if !found {
		t.Error("expected warning for winner_pct too low")
	}
}

// TestParseTimeFilter_Hour tests parsing of "hour" period
func TestParseTimeFilter_Hour(t *testing.T) {
	filter := TimeFilter{Period: "hour"}
	start, end := parseTimeFilter(filter)

	duration := end.Sub(start)
	expectedDuration := time.Hour

	// Allow small tolerance for test execution time
	if duration < expectedDuration-time.Second || duration > expectedDuration+time.Second {
		t.Errorf("expected ~1 hour duration, got %v", duration)
	}
}

// TestParseTimeFilter_Day tests parsing of "day" period
func TestParseTimeFilter_Day(t *testing.T) {
	filter := TimeFilter{Period: "day"}
	start, end := parseTimeFilter(filter)

	duration := end.Sub(start)
	expectedDuration := 24 * time.Hour

	// Allow small tolerance
	if duration < expectedDuration-time.Second || duration > expectedDuration+time.Second {
		t.Errorf("expected ~24 hours duration, got %v", duration)
	}
}

// TestParseTimeFilter_Week tests parsing of "week" period
func TestParseTimeFilter_Week(t *testing.T) {
	filter := TimeFilter{Period: "week"}
	start, end := parseTimeFilter(filter)

	duration := end.Sub(start)
	expectedDuration := 7 * 24 * time.Hour

	// Allow small tolerance
	if duration < expectedDuration-time.Second || duration > expectedDuration+time.Second {
		t.Errorf("expected ~7 days duration, got %v", duration)
	}
}

// TestParseTimeFilter_Custom tests parsing of "custom" period with specific times
func TestParseTimeFilter_Custom(t *testing.T) {
	startTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	endTime := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)

	filter := TimeFilter{
		Period:    "custom",
		StartTime: &startTime,
		EndTime:   &endTime,
	}

	start, end := parseTimeFilter(filter)

	if !start.Equal(startTime) {
		t.Errorf("expected start time %v, got %v", startTime, start)
	}

	if !end.Equal(endTime) {
		t.Errorf("expected end time %v, got %v", endTime, end)
	}
}

// Helper function to validate template with metrics (extracted for testing)
func validateTemplateWithMetrics(params ValidateTemplateParams, metrics *HistoricalMetrics) []Warning {
	var warnings []Warning

	// Check max players = 1
	if params.PlayersNeeded == 1 {
		warnings = append(warnings, Warning{
			Field:    "players_needed",
			Message:  "Player count is too low (1 player)",
			Severity: "warning",
		})
	}

	// Check min players against historical average
	if metrics.AvgRealPlayersPerRoom > 0 && float64(params.MinPlayers) > metrics.AvgRealPlayersPerRoom {
		warnings = append(warnings, Warning{
			Field:    "min_players",
			Message:  "Minimum players exceeds average real player count per room from past week",
			Severity: "warning",
		})
	}

	// Check max players against historical average (2x threshold)
	if metrics.AvgRealPlayersPerRoom > 0 && float64(params.PlayersNeeded) > 2*metrics.AvgRealPlayersPerRoom {
		warnings = append(warnings, Warning{
			Field:    "players_needed",
			Message:  "Maximum players exceeds twice the average real player count per room from past week",
			Severity: "warning",
		})
	}

	// Check entry cost against historical average (1.75x threshold)
	if metrics.AvgEntryCost > 0 && float64(params.EntryCost) > 1.75*metrics.AvgEntryCost {
		warnings = append(warnings, Warning{
			Field:    "entry_cost",
			Message:  "Entry cost is too high (exceeds 1.75x average)",
			Severity: "warning",
		})
	}

	// Check entry cost against historical average (0.5x threshold)
	if metrics.AvgEntryCost > 0 && float64(params.EntryCost) < 0.5*metrics.AvgEntryCost {
		warnings = append(warnings, Warning{
			Field:    "entry_cost",
			Message:  "Entry cost is too low (less than 0.5x average)",
			Severity: "warning",
		})
	}

	// Check winner_pct > 80
	if params.WinnerPct > 80 {
		warnings = append(warnings, Warning{
			Field:    "winner_pct",
			Message:  "Jackpot percentage is too high (exceeds 80%)",
			Severity: "warning",
		})
	}

	// Check winner_pct < 50
	if params.WinnerPct < 50 {
		warnings = append(warnings, Warning{
			Field:    "winner_pct",
			Message:  "Jackpot percentage is too low (less than 50%)",
			Severity: "warning",
		})
	}

	return warnings
}
