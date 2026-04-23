package repository

import (
	"context"
	"fmt"

	"github.com/SomeSuperCoder/OnlineShop/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RoomRepo handles all fair_rooms database operations.
type RoomRepo struct {
	pool *pgxpool.Pool
}

// NewRoomRepo creates a new RoomRepo.
func NewRoomRepo(pool *pgxpool.Pool) *RoomRepo {
	return &RoomRepo{pool: pool}
}

const roomSelectCols = `
	r.id, r.risk_level, r.state, r.max_capacity,
	r.seed_phrase, r.seed_hash, r.final_fee,
	r.created_at, r.updated_at,
	COUNT(p.id) AS player_count
`

const roomFromJoin = `
	FROM fair_rooms r
	LEFT JOIN fair_players p ON p.room_id = r.id
`

func scanRoom(row pgx.Row) (domain.FairRoom, error) {
	var rm domain.FairRoom
	err := row.Scan(
		&rm.ID, &rm.RiskLevel, &rm.State, &rm.MaxCapacity,
		&rm.SeedPhrase, &rm.SeedHash, &rm.FinalFee,
		&rm.CreatedAt, &rm.UpdatedAt,
		&rm.PlayerCount,
	)
	return rm, err
}

func scanRoomRows(rows pgx.Rows) ([]domain.FairRoom, error) {
	var rooms []domain.FairRoom
	for rows.Next() {
		var rm domain.FairRoom
		if err := rows.Scan(
			&rm.ID, &rm.RiskLevel, &rm.State, &rm.MaxCapacity,
			&rm.SeedPhrase, &rm.SeedHash, &rm.FinalFee,
			&rm.CreatedAt, &rm.UpdatedAt,
			&rm.PlayerCount,
		); err != nil {
			return nil, err
		}
		rooms = append(rooms, rm)
	}
	return rooms, rows.Err()
}

// CreateRoom inserts a new room. ID and seed are expected to be set by the caller.
func (r *RoomRepo) CreateRoom(ctx context.Context, room domain.FairRoom) (domain.FairRoom, error) {
	const q = `
		INSERT INTO fair_rooms (id, risk_level, state, max_capacity, seed_phrase, seed_hash, final_fee)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, risk_level, state, max_capacity, seed_phrase, seed_hash, final_fee, created_at, updated_at
	`
	var created domain.FairRoom
	err := r.pool.QueryRow(ctx, q,
		room.ID, room.RiskLevel, room.State, room.MaxCapacity,
		room.SeedPhrase, room.SeedHash, room.FinalFee,
	).Scan(
		&created.ID, &created.RiskLevel, &created.State, &created.MaxCapacity,
		&created.SeedPhrase, &created.SeedHash, &created.FinalFee,
		&created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		return domain.FairRoom{}, fmt.Errorf("room_repo.CreateRoom: %w", err)
	}
	created.PlayerCount = 0
	return created, nil
}

// GetRoom fetches a room by UUID, computing player_count via LEFT JOIN COUNT.
func (r *RoomRepo) GetRoom(ctx context.Context, id uuid.UUID) (domain.FairRoom, error) {
	q := `SELECT ` + roomSelectCols + roomFromJoin + `
		WHERE r.id = $1
		GROUP BY r.id`
	rm, err := scanRoom(r.pool.QueryRow(ctx, q, id))
	if err != nil {
		return domain.FairRoom{}, fmt.Errorf("room_repo.GetRoom: %w", err)
	}
	return rm, nil
}

// ListAvailableRooms returns rooms with state in (created, waiting), player_count < max_capacity,
// and risk_level in the provided list (used for up-sell).
func (r *RoomRepo) ListAvailableRooms(ctx context.Context, levels []domain.RiskLevel) ([]domain.FairRoom, error) {
	if len(levels) == 0 {
		return nil, nil
	}

	// Build $1, $2, ... placeholders for the IN clause.
	args := make([]interface{}, len(levels))
	placeholders := ""
	for i, l := range levels {
		if i > 0 {
			placeholders += ", "
		}
		placeholders += fmt.Sprintf("$%d", i+1)
		args[i] = string(l)
	}

	q := `SELECT ` + roomSelectCols + roomFromJoin + `
		WHERE r.risk_level IN (` + placeholders + `)
		  AND r.state IN ('created', 'waiting')
		GROUP BY r.id
		HAVING COUNT(p.id) < r.max_capacity`

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("room_repo.ListAvailableRooms: %w", err)
	}
	defer rows.Close()

	rooms, err := scanRoomRows(rows)
	if err != nil {
		return nil, fmt.Errorf("room_repo.ListAvailableRooms scan: %w", err)
	}
	return rooms, nil
}

// ListActiveRoomsByRisk returns all rooms with state in (created, waiting) for a given risk_level.
// Used by checkAndScale.
func (r *RoomRepo) ListActiveRoomsByRisk(ctx context.Context, level domain.RiskLevel) ([]domain.FairRoom, error) {
	q := `SELECT ` + roomSelectCols + roomFromJoin + `
		WHERE r.risk_level = $1
		  AND r.state IN ('created', 'waiting')
		GROUP BY r.id`

	rows, err := r.pool.Query(ctx, q, string(level))
	if err != nil {
		return nil, fmt.Errorf("room_repo.ListActiveRoomsByRisk: %w", err)
	}
	defer rows.Close()

	rooms, err := scanRoomRows(rows)
	if err != nil {
		return nil, fmt.Errorf("room_repo.ListActiveRoomsByRisk scan: %w", err)
	}
	return rooms, nil
}

// SetRoomStateTx updates room state within an existing transaction.
func (r *RoomRepo) SetRoomStateTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, state domain.RoomState) error {
	const q = `UPDATE fair_rooms SET state = $1, updated_at = NOW() WHERE id = $2`
	_, err := tx.Exec(ctx, q, string(state), id)
	if err != nil {
		return fmt.Errorf("room_repo.SetRoomStateTx: %w", err)
	}
	return nil
}

// SetRoomFinalFeeTx sets final_fee and transitions state to refunding within a transaction.
func (r *RoomRepo) SetRoomFinalFeeTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, finalFee float64) error {
	const q = `UPDATE fair_rooms SET final_fee = $1, state = 'refunding', updated_at = NOW() WHERE id = $2`
	_, err := tx.Exec(ctx, q, finalFee, id)
	if err != nil {
		return fmt.Errorf("room_repo.SetRoomFinalFeeTx: %w", err)
	}
	return nil
}
