package service

import (
	"context"
	"fmt"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TemplateLifecycleManager manages safe deletion and updates of templates with active rooms
type TemplateLifecycleManager struct {
	repo *repository.Queries
	pool *pgxpool.Pool
}

// NewTemplateLifecycleManager creates a new TemplateLifecycleManager instance
func NewTemplateLifecycleManager(repo *repository.Queries, pool *pgxpool.Pool) *TemplateLifecycleManager {
	return &TemplateLifecycleManager{
		repo: repo,
		pool: pool,
	}
}

// TemplateStatus contains information about a template's current room status
type TemplateStatus struct {
	TemplateID   int32 `json:"template_id"`
	ActiveRooms  int32 `json:"active_rooms"`
	WaitingRooms int32 `json:"waiting_rooms"`
	CanDelete    bool  `json:"can_delete"`
}

// UpdateTemplateParams contains parameters for updating a template
type UpdateTemplateParams struct {
	Name                 string
	PlayersNeeded        int32
	EntryCost            int32
	WinnerPct            int32
	RoundDurationSeconds int32
	StartDelaySeconds    int32
	GameType             string
	MinPlayers           int32
}

// GetTemplateStatus retrieves the current status of a template including room counts
func (m *TemplateLifecycleManager) GetTemplateStatus(ctx context.Context, templateID int32) (*TemplateStatus, error) {
	// Call GetTemplateRoomStatus query
	status, err := m.repo.GetTemplateRoomStatus(ctx, repository.GetTemplateRoomStatusParams{
		TemplateID: &templateID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get template room status: %w", err)
	}

	// Set CanDelete flag based on room counts
	// Template can be deleted if there are no active or waiting rooms
	canDelete := status.ActiveRooms == 0 && status.WaitingRooms == 0

	return &TemplateStatus{
		TemplateID:   templateID,
		ActiveRooms:  status.ActiveRooms,
		WaitingRooms: status.WaitingRooms,
		CanDelete:    canDelete,
	}, nil
}

// DeleteTemplateWithRooms safely deletes a template and its associated rooms
func (m *TemplateLifecycleManager) DeleteTemplateWithRooms(ctx context.Context, templateID int32) error {
	// Check template status first
	status, err := m.GetTemplateStatus(ctx, templateID)
	if err != nil {
		return fmt.Errorf("failed to get template status: %w", err)
	}

	// If active/waiting rooms exist, return error with status
	if !status.CanDelete {
		return fmt.Errorf("cannot delete template: %d active rooms and %d waiting rooms exist",
			status.ActiveRooms, status.WaitingRooms)
	}

	// Use transaction for atomicity
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create queries with transaction
	qtx := m.repo.WithTx(tx)

	// Delete all empty/completed rooms associated with template
	err = qtx.DeleteRoomsByTemplate(ctx, repository.DeleteRoomsByTemplateParams{
		TemplateID: &templateID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete rooms: %w", err)
	}

	// Delete template record
	err = qtx.DeleteTemplate(ctx, repository.DeleteTemplateParams{
		TemplateID: templateID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// UpdateTemplateWithRooms safely updates a template after ensuring no active rooms exist
func (m *TemplateLifecycleManager) UpdateTemplateWithRooms(ctx context.Context, templateID int32, params UpdateTemplateParams) error {
	// Check template status first
	status, err := m.GetTemplateStatus(ctx, templateID)
	if err != nil {
		return fmt.Errorf("failed to get template status: %w", err)
	}

	// If active/waiting rooms exist, return error with status
	if !status.CanDelete {
		return fmt.Errorf("cannot update template: %d active rooms and %d waiting rooms exist",
			status.ActiveRooms, status.WaitingRooms)
	}

	// Use transaction for atomicity
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create queries with transaction
	qtx := m.repo.WithTx(tx)

	// Update template parameters
	_, err = qtx.UpdateTemplate(ctx, repository.UpdateTemplateParams{
		TemplateID:           templateID,
		Name:                 params.Name,
		PlayersNeeded:        params.PlayersNeeded,
		EntryCost:            params.EntryCost,
		WinnerPct:            params.WinnerPct,
		RoundDurationSeconds: params.RoundDurationSeconds,
		StartDelaySeconds:    params.StartDelaySeconds,
		GameType:             params.GameType,
		MinPlayers:           params.MinPlayers,
	})
	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
