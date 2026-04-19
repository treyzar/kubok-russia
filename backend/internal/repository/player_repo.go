package repository

import (
	"context"
	"fmt"

	"github.com/SomeSuperCoder/OnlineShop/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PlayerRepo handles all fair_players database operations.
type PlayerRepo struct {
	pool *pgxpool.Pool
}

// NewPlayerRepo creates a new PlayerRepo.
func NewPlayerRepo(pool *pgxpool.Pool) *PlayerRepo {
	return &PlayerRepo{pool: pool}
}

// AddPlayerTx inserts a player within an existing transaction.
// It first locks the room row via SELECT FOR UPDATE to prevent race conditions on capacity checks.
func (r *PlayerRepo) AddPlayerTx(ctx context.Context, tx pgx.Tx, player domain.FairPlayer) error {
	// Lock the room row to serialise concurrent joins.
	const lockQ = `SELECT id FROM fair_rooms WHERE id = $1 FOR UPDATE`
	if _, err := tx.Exec(ctx, lockQ, player.RoomID); err != nil {
		return fmt.Errorf("player_repo.AddPlayerTx lock: %w", err)
	}

	const insertQ = `
		INSERT INTO fair_players (id, room_id, user_id, initial_deposit, refund_amount, refunded)
		VALUES ($1, $2, $3, $4, 0, FALSE)
	`
	_, err := tx.Exec(ctx, insertQ,
		player.ID, player.RoomID, player.UserID, player.InitialDeposit,
	)
	if err != nil {
		return fmt.Errorf("player_repo.AddPlayerTx insert: %w", err)
	}
	return nil
}

// GetMinDepositTx returns MIN(initial_deposit) for a room, locking rows with FOR UPDATE.
func (r *PlayerRepo) GetMinDepositTx(ctx context.Context, tx pgx.Tx, roomID uuid.UUID) (float64, error) {
	const q = `SELECT MIN(initial_deposit) FROM fair_players WHERE room_id = $1 FOR UPDATE`
	var min float64
	if err := tx.QueryRow(ctx, q, roomID).Scan(&min); err != nil {
		return 0, fmt.Errorf("player_repo.GetMinDepositTx: %w", err)
	}
	return min, nil
}

// ListPlayersTx returns all players for a room within a transaction.
func (r *PlayerRepo) ListPlayersTx(ctx context.Context, tx pgx.Tx, roomID uuid.UUID) ([]domain.FairPlayer, error) {
	const q = `
		SELECT id, room_id, user_id, initial_deposit, refund_amount, refunded
		FROM fair_players
		WHERE room_id = $1
	`
	rows, err := tx.Query(ctx, q, roomID)
	if err != nil {
		return nil, fmt.Errorf("player_repo.ListPlayersTx: %w", err)
	}
	defer rows.Close()

	var players []domain.FairPlayer
	for rows.Next() {
		var p domain.FairPlayer
		if err := rows.Scan(&p.ID, &p.RoomID, &p.UserID, &p.InitialDeposit, &p.RefundAmount, &p.Refunded); err != nil {
			return nil, fmt.Errorf("player_repo.ListPlayersTx scan: %w", err)
		}
		players = append(players, p)
	}
	return players, rows.Err()
}

// UpdateRefundTx sets refund_amount and refunded=true for a player within a transaction.
func (r *PlayerRepo) UpdateRefundTx(ctx context.Context, tx pgx.Tx, playerID uuid.UUID, refundAmount float64) error {
	const q = `UPDATE fair_players SET refund_amount = $1, refunded = TRUE WHERE id = $2`
	_, err := tx.Exec(ctx, q, refundAmount, playerID)
	if err != nil {
		return fmt.Errorf("player_repo.UpdateRefundTx: %w", err)
	}
	return nil
}
