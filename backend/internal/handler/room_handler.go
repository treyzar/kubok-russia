package handler

import (
	"context"
	"errors"

	"github.com/SomeSuperCoder/OnlineShop/internal/domain"
	"github.com/SomeSuperCoder/OnlineShop/internal/service"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// FairRoomHandler handles HTTP requests for the provably fair room system.
type FairRoomHandler struct {
	Service *service.RoomService
}

// parseRoomID parses a UUID string and returns a Huma 400 error on failure.
func parseRoomID(raw string) (uuid.UUID, error) {
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, huma.Error400BadRequest("invalid room id", nil)
	}
	return id, nil
}

// mapServiceError converts sentinel service errors to appropriate Huma HTTP errors.
func mapServiceError(err error) error {
	switch {
	case errors.Is(err, domain.ErrRoomFull):
		return huma.Error400BadRequest("room is full", nil)
	case errors.Is(err, domain.ErrNotAccepting):
		return huma.Error400BadRequest("room is not accepting players", nil)
	case errors.Is(err, domain.ErrNotWaiting):
		return huma.Error400BadRequest("room must be in waiting state to start", nil)
	case errors.Is(err, domain.ErrDuplicatePlayer):
		return huma.Error409Conflict("user already in this room", nil)
	case errors.Is(err, pgx.ErrNoRows):
		return huma.Error404NotFound("room not found", nil)
	case errors.Is(err, domain.ErrCreditFailed):
		return huma.Error500InternalServerError("refund transaction failed", nil)
	default:
		// Check for pgx unique violation (23505) as fallback for duplicate player
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return huma.Error409Conflict("user already in this room", nil)
		}
		return err
	}
}

// --- Request / Response types ---

type CreateFairRoomRequest struct {
	Body struct {
		RiskLevel domain.RiskLevel `json:"risk_level" enum:"low,medium,high"`
	}
}

type FairRoomResponse struct {
	Body *domain.RoomView
}

type ListFairRoomsRequest struct {
	RiskLevel string `query:"risk_level" enum:"low,medium,high"`
}

type ListFairRoomsResponse struct {
	Body struct {
		Rooms []domain.RoomView `json:"rooms"`
	}
}

type GetFairRoomRequest struct {
	ID string `path:"id"`
}

type JoinFairRoomRequest struct {
	ID   string `path:"id"`
	Body struct {
		UserID  string  `json:"user_id"`
		Deposit float64 `json:"deposit" minimum:"0"`
	}
}

type JoinFairRoomResponse struct {
	Body *domain.JoinResult
}

type StartFairRoomRequest struct {
	ID string `path:"id"`
}

type StartFairRoomResponse struct {
	Body struct {
		Message string `json:"message"`
	}
}

// --- Handler methods ---

// Create handles POST /fair-rooms
func (h *FairRoomHandler) Create(ctx context.Context, req *CreateFairRoomRequest) (*FairRoomResponse, error) {
	view, err := h.Service.CreateRoom(ctx, req.Body.RiskLevel)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &FairRoomResponse{Body: view}, nil
}

// List handles GET /fair-rooms?risk_level=...
func (h *FairRoomHandler) List(ctx context.Context, req *ListFairRoomsRequest) (*ListFairRoomsResponse, error) {
	level := domain.RiskLevel(req.RiskLevel)
	rooms, err := h.Service.ListRooms(ctx, level)
	if err != nil {
		return nil, mapServiceError(err)
	}
	resp := &ListFairRoomsResponse{}
	resp.Body.Rooms = rooms
	return resp, nil
}

// Get handles GET /fair-rooms/{id}
// Returns seed_reveal only when state == finished; seed_phrase is never exposed.
func (h *FairRoomHandler) Get(ctx context.Context, req *GetFairRoomRequest) (*FairRoomResponse, error) {
	id, err := parseRoomID(req.ID)
	if err != nil {
		return nil, err
	}
	view, err := h.Service.GetRoom(ctx, id)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &FairRoomResponse{Body: view}, nil
}

// Join handles POST /fair-rooms/{id}/join
// Response: { player, room, scaled, new_room_id? }
func (h *FairRoomHandler) Join(ctx context.Context, req *JoinFairRoomRequest) (*JoinFairRoomResponse, error) {
	roomID, err := parseRoomID(req.ID)
	if err != nil {
		return nil, err
	}
	userID, err := uuid.Parse(req.Body.UserID)
	if err != nil {
		return nil, huma.Error400BadRequest("invalid user_id", nil)
	}
	result, err := h.Service.JoinRoom(ctx, roomID, userID, req.Body.Deposit)
	if err != nil {
		return nil, mapServiceError(err)
	}
	return &JoinFairRoomResponse{Body: result}, nil
}

// Start handles POST /fair-rooms/{id}/start
func (h *FairRoomHandler) Start(ctx context.Context, req *StartFairRoomRequest) (*StartFairRoomResponse, error) {
	id, err := parseRoomID(req.ID)
	if err != nil {
		return nil, err
	}
	if err := h.Service.StartGame(ctx, id); err != nil {
		return nil, mapServiceError(err)
	}
	resp := &StartFairRoomResponse{}
	resp.Body.Message = "game started"
	return resp, nil
}
