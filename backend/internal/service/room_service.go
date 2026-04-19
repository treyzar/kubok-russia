package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/SomeSuperCoder/OnlineShop/internal/domain"
	"github.com/SomeSuperCoder/OnlineShop/internal/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CreditFn is the injected external balance credit function.
// The default is a no-op stub; replace with a real implementation as needed.
type CreditFn func(ctx context.Context, userID uuid.UUID, amount float64) error

// RoomService implements business logic for fair rooms.
type RoomService struct {
	pool       *pgxpool.Pool
	roomRepo   *repository.RoomRepo
	playerRepo *repository.PlayerRepo
	CreditFn   CreditFn
}

// NewRoomService creates a new RoomService with a no-op CreditFn stub.
func NewRoomService(pool *pgxpool.Pool) *RoomService {
	return &RoomService{
		pool:       pool,
		roomRepo:   repository.NewRoomRepo(pool),
		playerRepo: repository.NewPlayerRepo(pool),
		CreditFn: func(_ context.Context, _ uuid.UUID, _ float64) error {
			return nil // no-op stub
		},
	}
}

// generateSeed creates a cryptographically random seed_phrase and its SHA-256 seed_hash.
func generateSeed() (seedPhrase, seedHash string, err error) {
	buf := make([]byte, 32)
	if _, err = rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("generateSeed: %w", err)
	}
	seedPhrase = hex.EncodeToString(buf)
	hash := sha256.Sum256([]byte(seedPhrase))
	seedHash = hex.EncodeToString(hash[:])
	return seedPhrase, seedHash, nil
}

// toView wraps a FairRoom into a RoomView, revealing seed_phrase only when finished.
func toView(room domain.FairRoom) *domain.RoomView {
	view := &domain.RoomView{FairRoom: room}
	if room.State == domain.StateFinished {
		s := room.SeedPhrase
		view.SeedReveal = &s
	}
	return view
}

// --- 3.1: CreateRoom and GetRoom ---

// CreateRoom generates a seed, assigns a UUID, and persists the room.
func (s *RoomService) CreateRoom(ctx context.Context, riskLevel domain.RiskLevel) (*domain.RoomView, error) {
	seedPhrase, seedHash, err := generateSeed()
	if err != nil {
		return nil, err
	}

	room := domain.FairRoom{
		ID:          uuid.New(),
		RiskLevel:   riskLevel,
		State:       domain.StateCreated,
		MaxCapacity: 10,
		SeedPhrase:  seedPhrase,
		SeedHash:    seedHash,
		FinalFee:    0,
	}

	created, err := s.roomRepo.CreateRoom(ctx, room)
	if err != nil {
		return nil, fmt.Errorf("service.CreateRoom: %w", err)
	}
	return toView(created), nil
}

// GetRoom fetches a room and populates SeedReveal only when state == finished.
func (s *RoomService) GetRoom(ctx context.Context, id uuid.UUID) (*domain.RoomView, error) {
	room, err := s.roomRepo.GetRoom(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("service.GetRoom: %w", err)
	}
	return toView(room), nil
}

// --- 3.2: ListRooms and JoinRoom ---

// ListRooms resolves up-sell levels via domain.RiskLevelOrder and returns available rooms.
func (s *RoomService) ListRooms(ctx context.Context, riskLevel domain.RiskLevel) ([]domain.RoomView, error) {
	levels, ok := domain.RiskLevelOrder[riskLevel]
	if !ok {
		return nil, fmt.Errorf("service.ListRooms: unknown risk level %q", riskLevel)
	}

	rooms, err := s.roomRepo.ListAvailableRooms(ctx, levels)
	if err != nil {
		return nil, fmt.Errorf("service.ListRooms: %w", err)
	}

	views := make([]domain.RoomView, len(rooms))
	for i, r := range rooms {
		views[i] = *toView(r)
	}
	return views, nil
}

// JoinRoom adds a player to a room inside a transaction, then runs checkAndScale outside it.
func (s *RoomService) JoinRoom(ctx context.Context, roomID, userID uuid.UUID, deposit float64) (*domain.JoinResult, error) {
	var player domain.FairPlayer
	var room domain.FairRoom

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.JoinRoom begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Lock and fetch the room row.
	const lockQ = `
		SELECT r.id, r.risk_level, r.state, r.max_capacity,
		       r.seed_phrase, r.seed_hash, r.final_fee,
		       r.created_at, r.updated_at,
		       COUNT(p.id) AS player_count
		FROM fair_rooms r
		LEFT JOIN fair_players p ON p.room_id = r.id
		WHERE r.id = $1
		GROUP BY r.id
		FOR UPDATE OF r`
	row := tx.QueryRow(ctx, lockQ, roomID)
	if err := row.Scan(
		&room.ID, &room.RiskLevel, &room.State, &room.MaxCapacity,
		&room.SeedPhrase, &room.SeedHash, &room.FinalFee,
		&room.CreatedAt, &room.UpdatedAt, &room.PlayerCount,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("service.JoinRoom lock room: %w", err)
	}

	// State check.
	if room.State == domain.StateRefunding || room.State == domain.StateFinished {
		return nil, domain.ErrNotAccepting
	}

	// Capacity check.
	if room.PlayerCount >= room.MaxCapacity {
		return nil, domain.ErrRoomFull
	}

	// Insert player.
	player = domain.FairPlayer{
		ID:             uuid.New(),
		RoomID:         roomID,
		UserID:         userID,
		InitialDeposit: deposit,
	}
	if err := s.playerRepo.AddPlayerTx(ctx, tx, player); err != nil {
		return nil, fmt.Errorf("service.JoinRoom add player: %w", err)
	}

	// Transition created → waiting on first player.
	if room.State == domain.StateCreated {
		if err := s.roomRepo.SetRoomStateTx(ctx, tx, roomID, domain.StateWaiting); err != nil {
			return nil, fmt.Errorf("service.JoinRoom set waiting: %w", err)
		}
		room.State = domain.StateWaiting
	}
	room.PlayerCount++

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("service.JoinRoom commit: %w", err)
	}

	// Auto-scale check outside the transaction.
	newRoomID, err := s.checkAndScale(ctx, room.RiskLevel)
	if err != nil {
		// Non-fatal: log but don't fail the join.
		newRoomID = nil
	}

	result := &domain.JoinResult{
		Player:    player,
		Room:      room,
		Scaled:    newRoomID != nil,
		NewRoomID: newRoomID,
	}
	return result, nil
}

// --- 3.3: StartGame and checkAndScale ---

// StartGame executes the full refund algorithm atomically (algorithm.md section 7).
func (s *RoomService) StartGame(ctx context.Context, roomID uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("service.StartGame begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Step 2: verify state == waiting (FOR UPDATE).
	var state domain.RoomState
	if err := tx.QueryRow(ctx,
		`SELECT state FROM fair_rooms WHERE id = $1 FOR UPDATE`, roomID,
	).Scan(&state); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return pgx.ErrNoRows
		}
		return fmt.Errorf("service.StartGame select state: %w", err)
	}
	if state != domain.StateWaiting {
		return domain.ErrNotWaiting
	}

	// Step 3: SELECT MIN(initial_deposit) FOR UPDATE.
	minDeposit, err := s.playerRepo.GetMinDepositTx(ctx, tx, roomID)
	if err != nil {
		return fmt.Errorf("service.StartGame get min deposit: %w", err)
	}

	// Step 4: set final_fee and transition to refunding.
	if err := s.roomRepo.SetRoomFinalFeeTx(ctx, tx, roomID, minDeposit); err != nil {
		return fmt.Errorf("service.StartGame set final fee: %w", err)
	}

	// Step 5: process each player's refund.
	players, err := s.playerRepo.ListPlayersTx(ctx, tx, roomID)
	if err != nil {
		return fmt.Errorf("service.StartGame list players: %w", err)
	}

	for _, p := range players {
		refund := p.InitialDeposit - minDeposit
		if refund < 0 {
			refund = 0
		}
		if err := s.playerRepo.UpdateRefundTx(ctx, tx, p.ID, refund); err != nil {
			return fmt.Errorf("service.StartGame update refund: %w", err)
		}
		if err := s.CreditFn(ctx, p.UserID, refund); err != nil {
			return domain.ErrCreditFailed
		}
	}

	// Step 6: transition to finished.
	if err := s.roomRepo.SetRoomStateTx(ctx, tx, roomID, domain.StateFinished); err != nil {
		return fmt.Errorf("service.StartGame set finished: %w", err)
	}

	// Step 7: commit.
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("service.StartGame commit: %w", err)
	}
	return nil
}

// checkAndScale creates a new room of the same risk level if ≥70% of active rooms are ≥70% full.
func (s *RoomService) checkAndScale(ctx context.Context, level domain.RiskLevel) (*uuid.UUID, error) {
	rooms, err := s.roomRepo.ListActiveRoomsByRisk(ctx, level)
	if err != nil {
		return nil, fmt.Errorf("checkAndScale list rooms: %w", err)
	}
	if len(rooms) == 0 {
		return nil, nil
	}

	atThreshold := 0
	for _, r := range rooms {
		if float64(r.PlayerCount)/float64(r.MaxCapacity) >= 0.70 {
			atThreshold++
		}
	}

	ratio := float64(atThreshold) / float64(len(rooms))
	if ratio >= 0.70 {
		newRoom, err := s.CreateRoom(ctx, level)
		if err != nil {
			return nil, fmt.Errorf("checkAndScale create room: %w", err)
		}
		return &newRoom.ID, nil
	}
	return nil, nil
}
