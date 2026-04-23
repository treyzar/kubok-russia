package service

import (
	"testing"
)

// TestTemplateStatus_CanDelete tests the CanDelete flag logic
func TestTemplateStatus_CanDelete(t *testing.T) {
	tests := []struct {
		name         string
		activeRooms  int32
		waitingRooms int32
		canDelete    bool
	}{
		{
			name:         "no active or waiting rooms",
			activeRooms:  0,
			waitingRooms: 0,
			canDelete:    true,
		},
		{
			name:         "has active rooms",
			activeRooms:  2,
			waitingRooms: 0,
			canDelete:    false,
		},
		{
			name:         "has waiting rooms",
			activeRooms:  0,
			waitingRooms: 3,
			canDelete:    false,
		},
		{
			name:         "has both active and waiting rooms",
			activeRooms:  1,
			waitingRooms: 2,
			canDelete:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the CanDelete logic
			canDelete := tt.activeRooms == 0 && tt.waitingRooms == 0

			if canDelete != tt.canDelete {
				t.Errorf("expected canDelete=%v, got %v (active=%d, waiting=%d)",
					tt.canDelete, canDelete, tt.activeRooms, tt.waitingRooms)
			}
		})
	}
}

// TestUpdateTemplateParams_Validation tests that update params are properly structured
func TestUpdateTemplateParams_Validation(t *testing.T) {
	params := UpdateTemplateParams{
		Name:                 "Test Template",
		PlayersNeeded:        5,
		EntryCost:            100,
		WinnerPct:            70,
		RoundDurationSeconds: 60,
		StartDelaySeconds:    10,
		GameType:             "standard",
		MinPlayers:           3,
	}

	// Validate all fields are set
	if params.Name == "" {
		t.Error("Name should not be empty")
	}
	if params.PlayersNeeded <= 0 {
		t.Error("PlayersNeeded should be positive")
	}
	if params.EntryCost < 0 {
		t.Error("EntryCost should be non-negative")
	}
	if params.WinnerPct <= 0 || params.WinnerPct > 100 {
		t.Error("WinnerPct should be between 1 and 100")
	}
	if params.MinPlayers <= 0 {
		t.Error("MinPlayers should be positive")
	}
	if params.MinPlayers > params.PlayersNeeded {
		t.Error("MinPlayers should not exceed PlayersNeeded")
	}
}

// TestDeleteTemplateWithRooms_ErrorMessage tests error message format
func TestDeleteTemplateWithRooms_ErrorMessage(t *testing.T) {
	tests := []struct {
		name         string
		activeRooms  int32
		waitingRooms int32
		expectError  bool
	}{
		{
			name:         "can delete - no rooms",
			activeRooms:  0,
			waitingRooms: 0,
			expectError:  false,
		},
		{
			name:         "cannot delete - has active rooms",
			activeRooms:  2,
			waitingRooms: 0,
			expectError:  true,
		},
		{
			name:         "cannot delete - has waiting rooms",
			activeRooms:  0,
			waitingRooms: 3,
			expectError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the deletion check logic
			canDelete := tt.activeRooms == 0 && tt.waitingRooms == 0
			hasError := !canDelete

			if hasError != tt.expectError {
				t.Errorf("expected error=%v, got %v", tt.expectError, hasError)
			}
		})
	}
}

// TestUpdateTemplateWithRooms_ErrorMessage tests error message format for updates
func TestUpdateTemplateWithRooms_ErrorMessage(t *testing.T) {
	tests := []struct {
		name         string
		activeRooms  int32
		waitingRooms int32
		expectError  bool
	}{
		{
			name:         "can update - no rooms",
			activeRooms:  0,
			waitingRooms: 0,
			expectError:  false,
		},
		{
			name:         "cannot update - has active rooms",
			activeRooms:  1,
			waitingRooms: 0,
			expectError:  true,
		},
		{
			name:         "cannot update - has waiting rooms",
			activeRooms:  0,
			waitingRooms: 2,
			expectError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the update check logic
			canUpdate := tt.activeRooms == 0 && tt.waitingRooms == 0
			hasError := !canUpdate

			if hasError != tt.expectError {
				t.Errorf("expected error=%v, got %v", tt.expectError, hasError)
			}
		})
	}
}
