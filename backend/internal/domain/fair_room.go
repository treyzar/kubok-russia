package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Sentinel errors mapped to HTTP codes in the handler layer.
var (
	ErrRoomFull        = errors.New("room is full")
	ErrNotAccepting    = errors.New("room is not accepting players")
	ErrNotWaiting      = errors.New("room must be in waiting state to start")
	ErrDuplicatePlayer = errors.New("user already in this room")
	ErrCreditFailed    = errors.New("refund transaction failed")
)

// RiskLevel is the risk category of a Room.
type RiskLevel string

const (
	RiskLow    RiskLevel = "low"
	RiskMedium RiskLevel = "medium"
	RiskHigh   RiskLevel = "high"
)

// RiskLevelOrder defines up-sell visibility: a player at level X sees rooms at X and above.
var RiskLevelOrder = map[RiskLevel][]RiskLevel{
	RiskLow:    {RiskLow, RiskMedium, RiskHigh},
	RiskMedium: {RiskMedium, RiskHigh},
	RiskHigh:   {RiskHigh},
}

// RoomState is the lifecycle state of a Room.
type RoomState string

const (
	StateCreated   RoomState = "created"
	StateWaiting   RoomState = "waiting"
	StateRefunding RoomState = "refunding"
	StateFinished  RoomState = "finished"
)

// FairRoom is the core domain entity. SeedPhrase is tagged json:"-" and never serialised directly.
type FairRoom struct {
	ID          uuid.UUID `json:"id"`
	RiskLevel   RiskLevel `json:"risk_level"`
	State       RoomState `json:"state"`
	MaxCapacity int       `json:"max_capacity"`
	SeedPhrase  string    `json:"-"` // NEVER in JSON output
	SeedHash    string    `json:"seed_hash"`
	FinalFee    float64   `json:"final_fee"`
	PlayerCount int       `json:"player_count"` // virtual, populated by repo via LEFT JOIN
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// RoomView wraps FairRoom and adds SeedReveal, which is non-nil only when State == finished.
type RoomView struct {
	FairRoom
	SeedReveal *string `json:"seed_reveal,omitempty"`
}

// FairPlayer is a participant in a Room.
type FairPlayer struct {
	ID             uuid.UUID `json:"id"`
	RoomID         uuid.UUID `json:"room_id"`
	UserID         uuid.UUID `json:"user_id"`
	InitialDeposit float64   `json:"initial_deposit"`
	RefundAmount   float64   `json:"refund_amount"`
	Refunded       bool      `json:"refunded"`
}

// JoinResult is returned by Service.JoinRoom.
type JoinResult struct {
	Player    FairPlayer `json:"player"`
	Room      FairRoom   `json:"room"`
	Scaled    bool       `json:"scaled"`
	NewRoomID *uuid.UUID `json:"new_room_id,omitempty"`
}
