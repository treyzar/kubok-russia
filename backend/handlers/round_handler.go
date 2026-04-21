package handlers

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RoundHandler struct {
	Repo *repository.Queries
	Pool *pgxpool.Pool
}

// --- response types ---

type roundPlayer struct {
	UserID   int32     `json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
}

type roundBoost struct {
	UserID int32 `json:"user_id"`
	Amount int32 `json:"amount"`
}

type roundWinner struct {
	UserID int32     `json:"user_id"`
	Prize  int32     `json:"prize"`
	WonAt  time.Time `json:"won_at"`
}

type roundDetail struct {
	RoomID        int32         `json:"room_id"`
	Jackpot       int32         `json:"jackpot"`
	EntryCost     int32         `json:"entry_cost"`
	PlayersNeeded int32         `json:"players_needed"`
	WinnerPct     int32         `json:"winner_pct"`
	StartTime     *time.Time    `json:"start_time,omitempty"`
	Players       []roundPlayer `json:"players"`
	Boosts        []roundBoost  `json:"boosts"`
	Winner        *roundWinner  `json:"winner,omitempty"`
}

type ListRoundsResponse struct {
	Body struct {
		Rounds []roundDetail `json:"rounds"`
	}
}

type GetRoundRequest struct {
	RoomID int32 `path:"room_id"`
}

type GetRoundResponse struct {
	Body roundDetail `json:"body"`
}

// assembleRoundDetail fetches players, boosts, and winner for a finished room.
func (h *RoundHandler) assembleRoundDetail(ctx context.Context, room repository.Room) (roundDetail, error) {
	detail := roundDetail{
		RoomID:        room.RoomID,
		Jackpot:       room.Jackpot,
		EntryCost:     room.EntryCost,
		PlayersNeeded: room.PlayersNeeded,
		WinnerPct:     room.WinnerPct,
	}
	if room.StartTime.Valid {
		detail.StartTime = &room.StartTime.Time
	}

	players, err := h.Repo.GetRoundPlayers(ctx, repository.GetRoundPlayersParams{RoomID: room.RoomID})
	if err != nil {
		return detail, err
	}
	detail.Players = make([]roundPlayer, len(players))
	for i, p := range players {
		detail.Players[i] = roundPlayer{UserID: p.UserID, JoinedAt: p.JoinedAt}
	}

	boosts, err := h.Repo.GetRoundBoosts(ctx, repository.GetRoundBoostsParams{RoomID: room.RoomID})
	if err != nil {
		return detail, err
	}
	detail.Boosts = make([]roundBoost, len(boosts))
	for i, b := range boosts {
		detail.Boosts[i] = roundBoost{UserID: b.UserID, Amount: b.Amount}
	}

	winner, err := h.Repo.GetRoundWinner(ctx, repository.GetRoundWinnerParams{RoomID: room.RoomID})
	if err != nil && err != pgx.ErrNoRows {
		return detail, err
	}
	if err == nil {
		detail.Winner = &roundWinner{UserID: winner.UserID, Prize: winner.Prize, WonAt: winner.WonAt}
	}

	return detail, nil
}

// GET /rounds
func (h *RoundHandler) List(ctx context.Context, _ *struct{}) (*ListRoundsResponse, error) {
	rooms, err := h.Repo.ListFinishedRooms(ctx)
	if err != nil {
		return nil, err
	}

	resp := &ListRoundsResponse{}
	resp.Body.Rounds = make([]roundDetail, 0, len(rooms))
	for _, room := range rooms {
		detail, err := h.assembleRoundDetail(ctx, room)
		if err != nil {
			return nil, err
		}
		resp.Body.Rounds = append(resp.Body.Rounds, detail)
	}
	return resp, nil
}

// GET /rounds/{room_id}
func (h *RoundHandler) Get(ctx context.Context, req *GetRoundRequest) (*GetRoundResponse, error) {
	room, err := h.Repo.GetFinishedRoom(ctx, repository.GetFinishedRoomParams{RoomID: req.RoomID})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, huma.Error404NotFound("round not found or not finished", nil)
		}
		return nil, err
	}

	detail, err := h.assembleRoundDetail(ctx, room)
	if err != nil {
		return nil, err
	}

	resp := &GetRoundResponse{}
	resp.Body = detail
	return resp, nil
}

// --- GetRoundDetails types ---

type RoundPlayerDetail struct {
	UserID   int32     `json:"user_id"`
	Places   int32     `json:"places"`
	JoinedAt time.Time `json:"joined_at"`
}

type RoundBoostDetail struct {
	UserID    int32     `json:"user_id"`
	Amount    int32     `json:"amount"`
	BoostedAt time.Time `json:"boosted_at"`
}

type RoundWinnerDetail struct {
	UserID int32     `json:"user_id"`
	Prize  int32     `json:"prize"`
	WonAt  time.Time `json:"won_at"`
}

type GetRoundDetailsRequest struct {
	RoomID int32 `path:"room_id"`
}

type GetRoundDetailsResponse struct {
	Body struct {
		RoomID        int32               `json:"room_id"`
		Jackpot       int32               `json:"jackpot"`
		EntryCost     int32               `json:"entry_cost"`
		WinnerPct     int32               `json:"winner_pct"`
		PlayersNeeded int32               `json:"players_needed"`
		Status        string              `json:"status"`
		CreatedAt     time.Time           `json:"created_at"`
		StartTime     *time.Time          `json:"start_time,omitempty"`
		Players       []RoundPlayerDetail `json:"players"`
		Boosts        []RoundBoostDetail  `json:"boosts"`
		Winner        *RoundWinnerDetail  `json:"winner,omitempty"`
	}
}

// GET /rounds/{room_id}/details
func (h *RoundHandler) GetDetails(ctx context.Context, req *GetRoundDetailsRequest) (*GetRoundDetailsResponse, error) {
	row, err := h.Repo.GetRoundDetails(ctx, repository.GetRoundDetailsParams{RoomID: req.RoomID})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, huma.Error404NotFound("round not found", nil)
		}
		return nil, err
	}

	resp := &GetRoundDetailsResponse{}
	resp.Body.RoomID = row.RoomID
	resp.Body.Jackpot = row.Jackpot
	resp.Body.EntryCost = row.EntryCost
	resp.Body.WinnerPct = row.WinnerPct
	resp.Body.PlayersNeeded = row.PlayersNeeded
	resp.Body.Status = row.Status
	resp.Body.CreatedAt = row.CreatedAt
	if row.StartTime.Valid {
		t := row.StartTime.Time
		resp.Body.StartTime = &t
	}

	// Parse JSON-aggregated players
	if row.Players != nil {
		playersJSON, err := json.Marshal(row.Players)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(playersJSON, &resp.Body.Players); err != nil {
			return nil, err
		}
	}
	if resp.Body.Players == nil {
		resp.Body.Players = []RoundPlayerDetail{}
	}

	// Parse JSON-aggregated boosts
	if row.Boosts != nil {
		boostsJSON, err := json.Marshal(row.Boosts)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(boostsJSON, &resp.Body.Boosts); err != nil {
			return nil, err
		}
	}
	if resp.Body.Boosts == nil {
		resp.Body.Boosts = []RoundBoostDetail{}
	}

	// Parse JSON winner (nullable)
	if row.Winner != nil {
		winnerJSON, err := json.Marshal(row.Winner)
		if err != nil {
			return nil, err
		}
		var winner RoundWinnerDetail
		if err := json.Unmarshal(winnerJSON, &winner); err != nil {
			return nil, err
		}
		resp.Body.Winner = &winner
	}

	return resp, nil
}
