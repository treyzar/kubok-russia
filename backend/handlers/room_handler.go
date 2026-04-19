package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"math"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal/redisclient"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RoomHandler struct {
	Repo   *repository.Queries
	Pool   *pgxpool.Pool
	PubSub *redisclient.PubSub
}

// publishRoomSnapshot serialises the room item and publishes it to the room's Redis channel.
// Errors are logged but do not affect the HTTP response.
func (h *RoomHandler) publishRoomSnapshot(ctx context.Context, item roomItem) {
	if h.PubSub == nil {
		return
	}
	payload, err := json.Marshal(item)
	if err != nil {
		log.Printf("[RoomHandler] failed to marshal room snapshot for room %d: %v", item.RoomID, err)
		return
	}
	if err := h.PubSub.Publish(ctx, item.RoomID, payload); err != nil {
		log.Printf("[RoomHandler] failed to publish room snapshot for room %d: %v", item.RoomID, err)
	}
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
		WinnerPct     int32      `json:"winner_pct"`
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
		WinnerPct     *int32     `json:"winner_pct,omitempty" minimum:"1" maximum:"99"`
	}
}

type ListRoomsResponse struct {
	Body struct {
		Rooms []roomItem `json:"rooms"`
	}
}

type ListRoomsRequest struct {
	Status        string `query:"status"`
	EntryCost     int32  `query:"entry_cost"`
	PlayersNeeded int32  `query:"players_needed"`
	SortBy        string `query:"sort_by"`
	SortOrder     string `query:"sort_order"`
}

type roomItem struct {
	RoomID        int32      `json:"room_id"`
	Jackpot       int32      `json:"jackpot"`
	StartTime     *time.Time `json:"start_time,omitempty"`
	Status        string     `json:"status"`
	PlayersNeeded int32      `json:"players_needed"`
	EntryCost     int32      `json:"entry_cost"`
	WinnerPct     int32      `json:"winner_pct"`
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
		WinnerPct:     r.WinnerPct,
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
	resp.Body.WinnerPct = item.WinnerPct
	resp.Body.CreatedAt = item.CreatedAt
	resp.Body.UpdatedAt = item.UpdatedAt
	return resp
}

func (h *RoomHandler) Create(ctx context.Context, req *CreateRoomRequest) (*RoomResponse, error) {
	var startTime pgtype.Timestamptz
	if req.Body.StartTime != nil {
		startTime = pgtype.Timestamptz{Time: *req.Body.StartTime, Valid: true}
	}

	winnerPct := int32(80)
	if req.Body.WinnerPct != nil {
		winnerPct = *req.Body.WinnerPct
	}

	room, err := h.Repo.InsertRoom(ctx, repository.InsertRoomParams{
		Jackpot:       req.Body.Jackpot,
		StartTime:     startTime,
		Status:        req.Body.Status,
		PlayersNeeded: req.Body.PlayersNeeded,
		EntryCost:     req.Body.EntryCost,
		WinnerPct:     winnerPct,
	})
	if err != nil {
		return nil, err
	}

	return roomItemToResponse(roomToItem(room)), nil
}

func (h *RoomHandler) List(ctx context.Context, req *ListRoomsRequest) (*ListRoomsResponse, error) {
	// Zero values mean "no filter" — SQL uses = '' / = 0 checks to skip the condition
	var sortBy interface{}
	var sortOrder interface{}
	if req.SortBy != "" {
		sortBy = req.SortBy
	}
	if req.SortOrder != "" {
		sortOrder = req.SortOrder
	}

	rooms, err := h.Repo.ListRoomsFiltered(ctx, repository.ListRoomsFilteredParams{
		Column1: req.Status,
		Column2: req.EntryCost,
		Column3: req.PlayersNeeded,
		Column4: sortBy,
		Column5: sortOrder,
	})
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

// --- room configurator ---

type ValidateRoomRequest struct {
	Body struct {
		PlayersNeeded int32 `json:"players_needed" minimum:"1"`
		EntryCost     int32 `json:"entry_cost" minimum:"0"`
		WinnerPct     int32 `json:"winner_pct" minimum:"1" maximum:"99"`
	}
}

type ValidateRoomResponse struct {
	Body struct {
		PrizeFund    int32    `json:"prize_fund"`
		OrganiserCut int32    `json:"organiser_cut"`
		PlayerROI    float64  `json:"player_roi"`
		Warnings     []string `json:"warnings"`
	}
}

func (h *RoomHandler) Validate(_ context.Context, req *ValidateRoomRequest) (*ValidateRoomResponse, error) {
	fullJackpot := req.Body.PlayersNeeded * req.Body.EntryCost
	prizeFund := fullJackpot * req.Body.WinnerPct / 100
	organiserCut := fullJackpot - prizeFund

	var playerROI float64
	if req.Body.EntryCost > 0 {
		playerROI = float64(prizeFund) / float64(req.Body.EntryCost)
	}

	var warnings []string
	if playerROI < 1.5 {
		warnings = append(warnings, "prize fund may be unattractive to players")
	}
	if fullJackpot > 0 && float64(organiserCut) < float64(fullJackpot)*0.10 {
		warnings = append(warnings, "organiser margin is very low")
	}
	if req.Body.WinnerPct > 95 {
		warnings = append(warnings, "winner_pct leaves no organiser margin")
	}
	if req.Body.WinnerPct < 50 {
		warnings = append(warnings, "winner receives less than half the jackpot")
	}

	resp := &ValidateRoomResponse{}
	resp.Body.PrizeFund = prizeFund
	resp.Body.OrganiserCut = organiserCut
	resp.Body.PlayerROI = playerROI
	resp.Body.Warnings = warnings
	return resp, nil
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
	// Pre-check: room status and capacity
	room, err := h.Repo.GetRoom(ctx, repository.GetRoomParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}
	if room.Status != "new" && room.Status != "starting_soon" {
		return nil, huma.Error409Conflict("room is not open for joining", nil)
	}

	playerCount, err := h.Repo.CountRoomPlayers(ctx, repository.CountRoomPlayersParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}
	if playerCount >= int64(room.PlayersNeeded) {
		return nil, huma.Error409Conflict("room is full", nil)
	}

	// Pre-check: user balance
	user, err := h.Repo.GetUser(ctx, repository.GetUserParams{ID: req.Body.UserID})
	if err != nil {
		return nil, err
	}
	if user.Balance < room.EntryCost {
		return nil, huma.Error402PaymentRequired("insufficient balance to join room", nil)
	}

	// Pre-check: user not already in room
	players, err := h.Repo.ListRoomPlayers(ctx, repository.ListRoomPlayersParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}
	for _, p := range players {
		if p.UserID == req.Body.UserID {
			return nil, huma.Error409Conflict("user already in room", nil)
		}
	}

	updatedRoom, err := h.Repo.JoinRoomAndUpdateStatus(ctx, repository.JoinRoomAndUpdateStatusParams{
		RoomID: req.RoomID,
		ID:     req.Body.UserID,
		Places: req.Body.Places,
	})
	if err != nil {
		return nil, err
	}
	item := roomToItem(updatedRoom)
	h.publishRoomSnapshot(ctx, item)
	return roomItemToResponse(item), nil
}

func (h *RoomHandler) LeaveRoom(ctx context.Context, req *LeaveRoomRequest) (*RoomResponse, error) {
	room, err := h.Repo.LeaveRoomAndUpdateStatus(ctx, repository.LeaveRoomAndUpdateStatusParams{
		RoomID: req.RoomID,
		UserID: req.Body.UserID,
	})
	if err != nil {
		return nil, err
	}
	item := roomToItem(room)
	h.publishRoomSnapshot(ctx, item)
	return roomItemToResponse(item), nil
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
	// Pre-check: user balance
	user, err := h.Repo.GetUser(ctx, repository.GetUserParams{ID: req.Body.UserID})
	if err != nil {
		return nil, err
	}
	if user.Balance < req.Body.Amount {
		return nil, huma.Error402PaymentRequired("insufficient balance for boost", nil)
	}

	// Pre-check: no existing boost for this user+room
	boosts, err := h.Repo.ListRoomBoosts(ctx, repository.ListRoomBoostsParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}
	for _, b := range boosts {
		if b.UserID == req.Body.UserID {
			return nil, huma.Error409Conflict("user has already boosted this room", nil)
		}
	}

	boost, err := h.Repo.InsertRoomBoost(ctx, repository.InsertRoomBoostParams{
		RoomID: req.RoomID,
		ID:     req.Body.UserID,
		Amount: req.Body.Amount,
	})
	if err != nil {
		// Catch DB-level unique violation as fallback
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, huma.Error409Conflict("user has already boosted this room", nil)
		}
		return nil, err
	}

	// Publish updated room snapshot after successful boost
	if room, rErr := h.Repo.GetRoom(ctx, repository.GetRoomParams{RoomID: req.RoomID}); rErr == nil {
		h.publishRoomSnapshot(ctx, roomToItem(room))
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
