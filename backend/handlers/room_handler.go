package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"math"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal/events"
	"github.com/SomeSuperCoder/OnlineShop/internal/redisclient"
	"github.com/SomeSuperCoder/OnlineShop/internal/validator"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RoomHandler struct {
	Repo      *repository.Queries
	Pool      *pgxpool.Pool
	PubSub    *redisclient.PubSub
	Publisher *events.EventPublisher
	Validator *validator.EconomicValidator
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

// InsufficientBalanceError is returned with HTTP 402 when a user lacks funds.
type InsufficientBalanceError struct {
	Message        string `json:"message"`
	Required       int32  `json:"required"`
	CurrentBalance int32  `json:"current_balance"`
	Shortfall      int32  `json:"shortfall"`
}

func (e *InsufficientBalanceError) Error() string { return e.Message }

// --- Shared response types ---

type RoomResponse struct {
	Body struct {
		RoomID               int32      `json:"room_id"`
		Jackpot              int32      `json:"jackpot"`
		StartTime            *time.Time `json:"start_time,omitempty"`
		Status               string     `json:"status"`
		PlayersNeeded        int32      `json:"players_needed"`
		EntryCost            int32      `json:"entry_cost"`
		WinnerPct            int32      `json:"winner_pct"`
		RoundDurationSeconds int32      `json:"round_duration_seconds"`
		StartDelaySeconds    int32      `json:"start_delay_seconds"`
		GameType             string     `json:"game_type"`
		CreatedAt            time.Time  `json:"created_at"`
		UpdatedAt            time.Time  `json:"updated_at"`
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
		TemplateID           *int32     `json:"template_id,omitempty"`
		Jackpot              int32      `json:"jackpot"`
		StartTime            *time.Time `json:"start_time,omitempty"`
		Status               string     `json:"status" enum:"new,starting_soon,playing"`
		PlayersNeeded        int32      `json:"players_needed" minimum:"1"`
		EntryCost            int32      `json:"entry_cost" minimum:"0"`
		WinnerPct            *int32     `json:"winner_pct,omitempty" minimum:"1" maximum:"99"`
		RoundDurationSeconds *int32     `json:"round_duration_seconds,omitempty" minimum:"10" maximum:"3600"`
		StartDelaySeconds    *int32     `json:"start_delay_seconds,omitempty" minimum:"5" maximum:"600"`
		GameType             string     `json:"game_type,omitempty"`
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
	RoomID               int32      `json:"room_id"`
	Jackpot              int32      `json:"jackpot"`
	StartTime            *time.Time `json:"start_time,omitempty"`
	Status               string     `json:"status"`
	PlayersNeeded        int32      `json:"players_needed"`
	EntryCost            int32      `json:"entry_cost"`
	WinnerPct            int32      `json:"winner_pct"`
	RoundDurationSeconds int32      `json:"round_duration_seconds"`
	StartDelaySeconds    int32      `json:"start_delay_seconds"`
	GameType             string     `json:"game_type"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

type GetRoomRequest struct {
	RoomID int32 `path:"room_id"`
}

func roomToItem(r repository.Room) roomItem {
	item := roomItem{
		RoomID:               r.RoomID,
		Jackpot:              r.Jackpot,
		Status:               r.Status,
		PlayersNeeded:        r.PlayersNeeded,
		EntryCost:            r.EntryCost,
		WinnerPct:            r.WinnerPct,
		RoundDurationSeconds: r.RoundDurationSeconds,
		StartDelaySeconds:    r.StartDelaySeconds,
		GameType:             r.GameType,
		CreatedAt:            r.CreatedAt,
		UpdatedAt:            r.UpdatedAt,
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
	resp.Body.RoundDurationSeconds = item.RoundDurationSeconds
	resp.Body.StartDelaySeconds = item.StartDelaySeconds
	resp.Body.GameType = item.GameType
	resp.Body.CreatedAt = item.CreatedAt
	resp.Body.UpdatedAt = item.UpdatedAt
	return resp
}

func (h *RoomHandler) Create(ctx context.Context, req *CreateRoomRequest) (*RoomResponse, error) {
	var startTime pgtype.Timestamptz
	if req.Body.StartTime != nil {
		startTime = pgtype.Timestamptz{Time: *req.Body.StartTime, Valid: true}
	}

	var winnerPct, roundDurationSeconds, startDelaySeconds int32
	var gameType string

	// If template_id is provided, fetch template settings
	if req.Body.TemplateID != nil {
		template, err := h.Repo.GetTemplate(ctx, repository.GetTemplateParams{TemplateID: *req.Body.TemplateID})
		if err != nil {
			return nil, err
		}
		// Copy settings from template
		winnerPct = template.WinnerPct
		roundDurationSeconds = template.RoundDurationSeconds
		startDelaySeconds = template.StartDelaySeconds
		gameType = template.GameType
	} else {
		// Use provided values or defaults
		winnerPct = int32(80)
		if req.Body.WinnerPct != nil {
			winnerPct = *req.Body.WinnerPct
		}

		roundDurationSeconds = int32(30)
		if req.Body.RoundDurationSeconds != nil {
			roundDurationSeconds = *req.Body.RoundDurationSeconds
		}

		startDelaySeconds = int32(60)
		if req.Body.StartDelaySeconds != nil {
			startDelaySeconds = *req.Body.StartDelaySeconds
		}

		gameType = "train"
		if req.Body.GameType != "" {
			if req.Body.GameType != "train" && req.Body.GameType != "fridge" {
				return nil, huma.Error400BadRequest("game_type must be one of: train, fridge", nil)
			}
			gameType = req.Body.GameType
		}
	}

	room, err := h.Repo.InsertRoom(ctx, repository.InsertRoomParams{
		Jackpot:              req.Body.Jackpot,
		StartTime:            startTime,
		Status:               req.Body.Status,
		PlayersNeeded:        req.Body.PlayersNeeded,
		EntryCost:            req.Body.EntryCost,
		WinnerPct:            winnerPct,
		RoundDurationSeconds: roundDurationSeconds,
		StartDelaySeconds:    startDelaySeconds,
		GameType:             gameType,
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
		PrizeFund     int32    `json:"prize_fund"`
		OrganiserCut  int32    `json:"organiser_cut"`
		PlayerROI     float64  `json:"player_roi"`
		PlayerWinProb float64  `json:"player_win_probability"`
		Warnings      []string `json:"warnings"`
	}
}

func (h *RoomHandler) Validate(_ context.Context, req *ValidateRoomRequest) (*ValidateRoomResponse, error) {
	v := h.Validator
	if v == nil {
		v = &validator.EconomicValidator{}
	}
	result := v.ValidateRoomConfig(req.Body.PlayersNeeded, req.Body.EntryCost, req.Body.WinnerPct)

	resp := &ValidateRoomResponse{}
	resp.Body.PrizeFund = result.PrizeFund
	resp.Body.OrganiserCut = result.OrganiserCut
	resp.Body.PlayerROI = result.PlayerROI
	resp.Body.PlayerWinProb = result.PlayerWinProb
	resp.Body.Warnings = result.Warnings
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
		return nil, huma.Error402PaymentRequired("Insufficient balance for entry", &InsufficientBalanceError{
			Message:        "Insufficient balance for entry",
			Required:       room.EntryCost,
			CurrentBalance: user.Balance,
			Shortfall:      room.EntryCost - user.Balance,
		})
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

	// Determine number of places (default to 1 if not specified)
	places := int32(1)
	if req.Body.Places != nil && *req.Body.Places > 0 {
		places = *req.Body.Places
	}

	// Start transaction for atomic operations
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Create queries with transaction
	txRepo := h.Repo.WithTx(tx)

	// Join room (this updates room_players, user balance, and room jackpot)
	updatedRoom, err := txRepo.JoinRoomAndUpdateStatus(ctx, repository.JoinRoomAndUpdateStatusParams{
		RoomID: req.RoomID,
		ID:     req.Body.UserID,
		Places: places,
	})
	if err != nil {
		return nil, err
	}

	// Get next available place_index for the room
	nextPlaceIndex, err := txRepo.GetNextPlaceIndex(ctx, repository.GetNextPlaceIndexParams{
		RoomID: req.RoomID,
	})
	if err != nil {
		return nil, err
	}

	// Insert individual place records with sequential indices, then link via room_players
	for i := int32(0); i < places; i++ {
		placeIndex := nextPlaceIndex + i
		_, err := txRepo.InsertRoomPlace(ctx, repository.InsertRoomPlaceParams{
			RoomID:     req.RoomID,
			UserID:     req.Body.UserID,
			PlaceIndex: placeIndex,
		})
		if err != nil {
			return nil, err
		}
		_, err = txRepo.InsertRoomPlayer(ctx, repository.InsertRoomPlayerParams{
			RoomID:  req.RoomID,
			UserID:  req.Body.UserID,
			PlaceID: placeIndex,
		})
		if err != nil {
			return nil, err
		}
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	item := roomToItem(updatedRoom)
	h.publishRoomSnapshot(ctx, item)

	// Publish player_joined event (Requirement 1.1)
	if h.Publisher != nil {
		h.Publisher.PublishPlayerJoined(ctx, req.RoomID, req.Body.UserID, places)
	}

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
		places := int32(p.Places)
		resp.Body.Players[i] = roomPlayerItem{
			RoomID:   p.RoomID,
			UserID:   p.UserID,
			Places:   &places,
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
		return nil, huma.Error402PaymentRequired("Insufficient balance for boost", &InsufficientBalanceError{
			Message:        "Insufficient balance for boost",
			Required:       req.Body.Amount,
			CurrentBalance: user.Balance,
			Shortfall:      req.Body.Amount - user.Balance,
		})
	}

	// Pre-check: no existing boost for this user+room
	boosts, err := h.Repo.ListRoomBoosts(ctx, repository.ListRoomBoostsParams{RoomID: req.RoomID})
	if err != nil {
		return nil, err
	}
	for _, b := range boosts {
		if b.UserID == req.Body.UserID {
			return nil, huma.Error409Conflict("You have already boosted this room", nil)
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
			return nil, huma.Error409Conflict("You have already boosted this room", nil)
		}
		return nil, err
	}

	// Publish updated room snapshot after successful boost
	if room, rErr := h.Repo.GetRoom(ctx, repository.GetRoomParams{RoomID: req.RoomID}); rErr == nil {
		h.publishRoomSnapshot(ctx, roomToItem(room))
	}

	// Publish boost_applied event (Requirement 1.2)
	if h.Publisher != nil {
		h.Publisher.PublishBoostApplied(ctx, req.RoomID, req.Body.UserID, req.Body.Amount)
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
