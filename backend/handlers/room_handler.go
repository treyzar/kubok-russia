package handlers

import (
	"context"
	"math"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RoomHandler struct {
	Repo *repository.Queries
	Pool *pgxpool.Pool
}

// --- Shared response types ---

type RoomResponse struct {
	Body struct {
		RoomID        int32      `json:"room_id"`
		Jackpot       int32      `json:"jackpot"`
		StartTime     *time.Time `json:"start_time,omitempty"`
		Status        string     `json:"status"`
		PlayersNeeded int32      `json:"players_needed"`
		EntryCost     int32      `json:"entry_cost"`
		CreatedAt     time.Time  `json:"created_at"`
		UpdatedAt     time.Time  `json:"updated_at"`
	}
}

type RoomWinnerResponse struct {
	Body struct {
		RoomID int32     `json:"room_id"`
		UserID int32     `json:"user_id"`
		Prize  int32     `json:"prize"`
		WonAt  time.Time `json:"won_at"`
	}
}

type RoomBoostResponse struct {
	Body struct {
		RoomID    int32     `json:"room_id"`
		UserID    int32     `json:"user_id"`
		Amount    int32     `json:"amount"`
		BoostedAt time.Time `json:"boosted_at"`
	}
}

// --- rooms ---

type CreateRoomRequest struct {
	Body struct {
		Jackpot       int32      `json:"jackpot"`
		StartTime     *time.Time `json:"start_time,omitempty"`
		Status        string     `json:"status" enum:"new,starting_soon,playing"`
		PlayersNeeded int32      `json:"players_needed" minimum:"1"`
		EntryCost     int32      `json:"entry_cost" minimum:"0"`
	}
}

type ListRoomsResponse struct {
	Body struct {
		Rooms []roomItem `json:"rooms"`
	}
}

type roomItem struct {
	RoomID        int32      `json:"room_id"`
	Jackpot       int32      `json:"jackpot"`
	StartTime     *time.Time `json:"start_time,omitempty"`
	Status        string     `json:"status"`
	PlayersNeeded int32      `json:"players_needed"`
	EntryCost     int32      `json:"entry_cost"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type GetRoomRequest struct {
	RoomID int32 `path:"room_id"`
}

func roomToItem(r repository.Room) roomItem {
	item := roomItem{
		RoomID:        r.RoomID,
		Jackpot:       r.Jackpot,
		Status:        r.Status,
		PlayersNeeded: r.PlayersNeeded,
		EntryCost:     r.EntryCost,
		CreatedAt:     r.CreatedAt,
		UpdatedAt:     r.UpdatedAt,
	}
	if r.StartTime.Valid {
		item.StartTime = &r.StartTime.Time
	}
	return item
}

func roomItemToResponse(item roomItem) *RoomResponse {
	resp := &RoomResponse{}
	resp.Body.RoomID = item.RoomID
	resp.Body.Jackpot = item.Jackpot
	resp.Body.StartTime = item.StartTime
	resp.Body.Status = item.Status
	resp.Body.PlayersNeeded = item.PlayersNeeded
	resp.Body.EntryCost = item.EntryCost
	resp.Body.CreatedAt = item.CreatedAt
	resp.Body.UpdatedAt = item.UpdatedAt
	return resp
}

func (h *RoomHandler) Create(ctx context.Context, req *CreateRoomRequest) (*RoomResponse, error) {
	var startTime pgtype.Timestamptz
	if req.Body.StartTime != nil {
		startTime = pgtype.Timestamptz{Time: *req.Body.StartTime, Valid: true}
	}

	room, err := h.Repo.InsertRoom(ctx, repository.InsertRoomParams{
		Jackpot:       req.Body.Jackpot,
		StartTime:     startTime,
		Status:        req.Body.Status,
		PlayersNeeded: req.Body.PlayersNeeded,
		EntryCost:     req.Body.EntryCost,
	})
	if err != nil {
		return nil, err
	}

	return roomItemToResponse(roomToItem(room)), nil
}

func (h *RoomHandler) List(ctx context.Context, _ *struct{}) (*ListRoomsResponse, error) {
	rooms, err := h.Repo.ListRooms(ctx)
	if err != nil {
		return nil, err
	}

	resp := &ListRoomsResponse{}
	resp.Body.Rooms = make([]roomItem, len(rooms))
	for i, r := range rooms {
		resp.Body.Rooms[i] = roomToItem(r)
	}
	return resp, nil
}

func (h *RoomHandler) Get(ctx context.Context, req *GetRoomRequest) (*RoomResponse, error) {
	room, err := h.Repo.GetRoom(ctx, repository.GetRoomParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}
	return roomItemToResponse(roomToItem(room)), nil
}

// --- room_players ---

type JoinRoomRequest struct {
	RoomID int32 `path:"room_id"`
	Body   struct {
		UserID int32  `json:"user_id"`
		Places *int32 `json:"places,omitempty"`
	}
}

type LeaveRoomRequest struct {
	RoomID int32 `path:"room_id"`
	Body   struct {
		UserID int32 `json:"user_id"`
	}
}

type ListRoomPlayersRequest struct {
	RoomID int32 `path:"room_id"`
}

type ListRoomPlayersResponse struct {
	Body struct {
		Players []roomPlayerItem `json:"players"`
	}
}

type roomPlayerItem struct {
	RoomID   int32     `json:"room_id"`
	UserID   int32     `json:"user_id"`
	Places   *int32    `json:"places,omitempty"`
	JoinedAt time.Time `json:"joined_at"`
}

func (h *RoomHandler) JoinRoom(ctx context.Context, req *JoinRoomRequest) (*RoomResponse, error) {
	room, err := h.Repo.JoinRoomAndUpdateStatus(ctx, repository.JoinRoomAndUpdateStatusParams{
		RoomID: req.RoomID,
		ID:     req.Body.UserID,
		Places: req.Body.Places,
	})
	if err != nil {
		return nil, err
	}
	return roomItemToResponse(roomToItem(room)), nil
}

func (h *RoomHandler) LeaveRoom(ctx context.Context, req *LeaveRoomRequest) (*RoomResponse, error) {
	room, err := h.Repo.LeaveRoomAndUpdateStatus(ctx, repository.LeaveRoomAndUpdateStatusParams{
		RoomID: req.RoomID,
		UserID: req.Body.UserID,
	})
	if err != nil {
		return nil, err
	}
	return roomItemToResponse(roomToItem(room)), nil
}

func (h *RoomHandler) ListRoomPlayers(ctx context.Context, req *ListRoomPlayersRequest) (*ListRoomPlayersResponse, error) {
	players, err := h.Repo.ListRoomPlayers(ctx, repository.ListRoomPlayersParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}

	resp := &ListRoomPlayersResponse{}
	resp.Body.Players = make([]roomPlayerItem, len(players))
	for i, p := range players {
		resp.Body.Players[i] = roomPlayerItem{
			RoomID:   p.RoomID,
			UserID:   p.UserID,
			Places:   p.Places,
			JoinedAt: p.JoinedAt,
		}
	}
	return resp, nil
}

// --- room_winners ---

type ListRoomWinnersRequest struct {
	RoomID int32 `path:"room_id"`
}

type ListRoomWinnersResponse struct {
	Body struct {
		Winners []roomWinnerItem `json:"winners"`
	}
}

type roomWinnerItem struct {
	RoomID int32     `json:"room_id"`
	UserID int32     `json:"user_id"`
	Prize  int32     `json:"prize"`
	WonAt  time.Time `json:"won_at"`
}

type GetRoomWinnerRequest struct {
	RoomID int32 `path:"room_id"`
	UserID int32 `path:"user_id"`
}

func (h *RoomHandler) ListRoomWinners(ctx context.Context, req *ListRoomWinnersRequest) (*ListRoomWinnersResponse, error) {
	winners, err := h.Repo.ListRoomWins(ctx, repository.ListRoomWinsParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}

	resp := &ListRoomWinnersResponse{}
	resp.Body.Winners = make([]roomWinnerItem, len(winners))
	for i, w := range winners {
		resp.Body.Winners[i] = roomWinnerItem{
			RoomID: w.RoomID,
			UserID: w.UserID,
			Prize:  w.Prize,
			WonAt:  w.WonAt,
		}
	}
	return resp, nil
}

func (h *RoomHandler) GetRoomWinner(ctx context.Context, req *GetRoomWinnerRequest) (*RoomWinnerResponse, error) {
	winner, err := h.Repo.GetRoomWinner(ctx, repository.GetRoomWinnerParams{
		RoomID: req.RoomID,
		UserID: req.UserID,
	})
	if err != nil {
		return nil, err
	}

	resp := &RoomWinnerResponse{}
	resp.Body.RoomID = winner.RoomID
	resp.Body.UserID = winner.UserID
	resp.Body.Prize = winner.Prize
	resp.Body.WonAt = winner.WonAt
	return resp, nil
}

// --- room_boosts ---

type BoostRoomRequest struct {
	RoomID int32 `path:"room_id"`
	Body   struct {
		UserID int32 `json:"user_id"`
		Amount int32 `json:"amount" minimum:"1"`
	}
}

type ListRoomBoostsRequest struct {
	RoomID int32 `path:"room_id"`
}

type ListRoomBoostsResponse struct {
	Body struct {
		Boosts []roomBoostItem `json:"boosts"`
	}
}

type roomBoostItem struct {
	RoomID    int32     `json:"room_id"`
	UserID    int32     `json:"user_id"`
	Amount    int32     `json:"amount"`
	BoostedAt time.Time `json:"boosted_at"`
}

func (h *RoomHandler) BoostRoom(ctx context.Context, req *BoostRoomRequest) (*RoomBoostResponse, error) {
	boost, err := h.Repo.InsertRoomBoost(ctx, repository.InsertRoomBoostParams{
		RoomID: req.RoomID,
		ID:     req.Body.UserID,
		Amount: req.Body.Amount,
	})
	if err != nil {
		return nil, err
	}

	resp := &RoomBoostResponse{}
	resp.Body.RoomID = boost.RoomID
	resp.Body.UserID = boost.UserID
	resp.Body.Amount = boost.Amount
	resp.Body.BoostedAt = boost.BoostedAt
	return resp, nil
}

func (h *RoomHandler) ListRoomBoosts(ctx context.Context, req *ListRoomBoostsRequest) (*ListRoomBoostsResponse, error) {
	boosts, err := h.Repo.ListRoomBoosts(ctx, repository.ListRoomBoostsParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}

	resp := &ListRoomBoostsResponse{}
	resp.Body.Boosts = make([]roomBoostItem, len(boosts))
	for i, b := range boosts {
		resp.Body.Boosts[i] = roomBoostItem{
			RoomID:    b.RoomID,
			UserID:    b.UserID,
			Amount:    b.Amount,
			BoostedAt: b.BoostedAt,
		}
	}
	return resp, nil
}

// --- boost calc ---

type CalcProbabilityRequest struct {
	RoomID      int32   `path:"room_id"`
	UserID      int32   `query:"user_id"`
	BoostAmount float64 `query:"boost_amount"`
}

type CalcProbabilityResponse struct {
	Body struct {
		Probability float64 `json:"probability"`
	}
}

type CalcBoostRequest struct {
	RoomID             int32   `path:"room_id"`
	UserID             int32   `query:"user_id"`
	DesiredProbability float64 `query:"desired_probability"`
}

type CalcBoostResponse struct {
	Body struct {
		BoostAmount int32 `json:"boost_amount"`
	}
}

// roomCalcData fetches room + player stakes and returns the values needed for both formulas:
// totalPlayerAmount = player's current total stake (entry + existing boost)
// acc               = sum of all boosts in the room
// poolBase          = players_needed * entry_cost  (the fixed entry pool)
func (h *RoomHandler) roomCalcData(ctx context.Context, roomID int32, userID int32) (totalPlayerAmount, acc, poolBase float64, err error) {
	room, err := h.Repo.GetRoom(ctx, repository.GetRoomParams{RoomID: roomID})
	if err != nil {
		return
	}
	poolBase = float64(room.PlayersNeeded) * float64(room.EntryCost)

	stakes, err := h.Repo.GetPlayersWithStakes(ctx, repository.GetPlayersWithStakesParams{RoomID: roomID})
	if err != nil {
		return
	}
	for _, s := range stakes {
		acc += float64(s.BoostAmount)
		if s.UserID == userID {
			totalPlayerAmount = float64(s.TotalStake)
		}
	}
	return
}

// GET /rooms/{room_id}/boosts/calc/probability?user_id=X&boost_amount=Y
// probability = 100 * (totalPlayerAmount + boost_amount) / (poolBase + acc + boost_amount)
func (h *RoomHandler) CalcProbability(ctx context.Context, req *CalcProbabilityRequest) (*CalcProbabilityResponse, error) {
	totalPlayerAmount, acc, poolBase, err := h.roomCalcData(ctx, req.RoomID, req.UserID)
	if err != nil {
		return nil, err
	}

	denom := poolBase + acc + req.BoostAmount
	if denom == 0 {
		denom = 1
	}
	prob := 100 * (totalPlayerAmount + req.BoostAmount) / denom

	resp := &CalcProbabilityResponse{}
	resp.Body.Probability = prob
	return resp, nil
}

// GET /rooms/{room_id}/boosts/calc/boost?user_id=X&desired_probability=Y
// boost_amount = ceil( (p*(poolBase+acc) - 100*totalPlayerAmount) / (100-p) )
func (h *RoomHandler) CalcBoost(ctx context.Context, req *CalcBoostRequest) (*CalcBoostResponse, error) {
	totalPlayerAmount, acc, poolBase, err := h.roomCalcData(ctx, req.RoomID, req.UserID)
	if err != nil {
		return nil, err
	}

	p := req.DesiredProbability
	if p <= 0 || p >= 100 {
		return nil, huma.Error400BadRequest("desired_probability must be between 0 and 100 (exclusive)", nil)
	}

	raw := (p*(poolBase+acc) - 100*totalPlayerAmount) / (100 - p)
	if raw < 0 {
		raw = 0
	}

	resp := &CalcBoostResponse{}
	resp.Body.BoostAmount = int32(math.Ceil(raw))
	return resp, nil
}
