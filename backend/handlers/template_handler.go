package handlers

import (
	"context"
	"errors"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TemplateHandler struct {
	Repo *repository.Queries
	Pool *pgxpool.Pool
}

// --- shared response type ---

type templateItem struct {
	TemplateID           int32     `json:"template_id"`
	Name                 string    `json:"name"`
	PlayersNeeded        int32     `json:"players_needed"`
	MinPlayers           int32     `json:"min_players"`
	EntryCost            int32     `json:"entry_cost"`
	WinnerPct            int32     `json:"winner_pct"`
	RoundDurationSeconds int32     `json:"round_duration_seconds"`
	StartDelaySeconds    int32     `json:"start_delay_seconds"`
	GameType             string    `json:"game_type"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type TemplateResponse struct {
	Body templateItem
}

func templateToItem(t repository.RoomTemplate) templateItem {
	return templateItem{
		TemplateID:           t.TemplateID,
		Name:                 t.Name,
		PlayersNeeded:        t.PlayersNeeded,
		MinPlayers:           t.MinPlayers,
		EntryCost:            t.EntryCost,
		WinnerPct:            t.WinnerPct,
		RoundDurationSeconds: t.RoundDurationSeconds,
		StartDelaySeconds:    t.StartDelaySeconds,
		GameType:             t.GameType,
		CreatedAt:            t.CreatedAt,
		UpdatedAt:            t.UpdatedAt,
	}
}

func catchUniqueNameViolation(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return huma.Error409Conflict("template name already exists", nil)
	}
	return err
}

// --- Create ---

type CreateTemplateRequest struct {
	Body struct {
		Name                 string `json:"name" minLength:"1" maxLength:"255"`
		PlayersNeeded        int32  `json:"players_needed" minimum:"1"`
		MinPlayers           *int32 `json:"min_players,omitempty" minimum:"1"`
		EntryCost            int32  `json:"entry_cost" minimum:"0"`
		WinnerPct            *int32 `json:"winner_pct,omitempty" minimum:"1" maximum:"99"`
		RoundDurationSeconds *int32 `json:"round_duration_seconds,omitempty" minimum:"10" maximum:"3600"`
		StartDelaySeconds    *int32 `json:"start_delay_seconds,omitempty" minimum:"5" maximum:"600"`
		GameType             string `json:"game_type,omitempty"`
	}
}

func (h *TemplateHandler) Create(ctx context.Context, req *CreateTemplateRequest) (*TemplateResponse, error) {
	minPlayers := int32(1)
	if req.Body.MinPlayers != nil {
		minPlayers = *req.Body.MinPlayers
	}

	if minPlayers > req.Body.PlayersNeeded {
		return nil, huma.Error400BadRequest("min_players cannot be greater than players_needed", nil)
	}

	winnerPct := int32(80)
	if req.Body.WinnerPct != nil {
		winnerPct = *req.Body.WinnerPct
	}

	roundDurationSeconds := int32(30)
	if req.Body.RoundDurationSeconds != nil {
		roundDurationSeconds = *req.Body.RoundDurationSeconds
	}

	startDelaySeconds := int32(60)
	if req.Body.StartDelaySeconds != nil {
		startDelaySeconds = *req.Body.StartDelaySeconds
	}

	gameType := "train"
	if req.Body.GameType != "" {
		if req.Body.GameType != "train" && req.Body.GameType != "fridge" {
			return nil, huma.Error400BadRequest("game_type must be one of: train, fridge", nil)
		}
		gameType = req.Body.GameType
	}

	t, err := h.Repo.InsertTemplate(ctx, repository.InsertTemplateParams{
		Name:                 req.Body.Name,
		PlayersNeeded:        req.Body.PlayersNeeded,
		EntryCost:            req.Body.EntryCost,
		WinnerPct:            winnerPct,
		RoundDurationSeconds: roundDurationSeconds,
		StartDelaySeconds:    startDelaySeconds,
		GameType:             gameType,
		MinPlayers:           minPlayers,
	})
	if err != nil {
		return nil, catchUniqueNameViolation(err)
	}

	resp := &TemplateResponse{}
	resp.Body = templateToItem(t)
	return resp, nil
}

// --- List ---

type ListTemplatesResponse struct {
	Body struct {
		Templates []templateItem `json:"templates"`
	}
}

func (h *TemplateHandler) List(ctx context.Context, _ *struct{}) (*ListTemplatesResponse, error) {
	templates, err := h.Repo.ListTemplates(ctx)
	if err != nil {
		return nil, err
	}

	resp := &ListTemplatesResponse{}
	resp.Body.Templates = make([]templateItem, len(templates))
	for i, t := range templates {
		resp.Body.Templates[i] = templateToItem(t)
	}
	return resp, nil
}

// --- Get ---

type GetTemplateRequest struct {
	TemplateID int32 `path:"template_id"`
}

func (h *TemplateHandler) Get(ctx context.Context, req *GetTemplateRequest) (*TemplateResponse, error) {
	t, err := h.Repo.GetTemplate(ctx, repository.GetTemplateParams{TemplateID: req.TemplateID})
	if err != nil {
		return nil, err
	}

	resp := &TemplateResponse{}
	resp.Body = templateToItem(t)
	return resp, nil
}

// --- Update ---

type UpdateTemplateRequest struct {
	TemplateID int32 `path:"template_id"`
	Body       struct {
		Name                 string `json:"name" minLength:"1" maxLength:"255"`
		PlayersNeeded        int32  `json:"players_needed" minimum:"1"`
		MinPlayers           *int32 `json:"min_players,omitempty" minimum:"1"`
		EntryCost            int32  `json:"entry_cost" minimum:"0"`
		WinnerPct            *int32 `json:"winner_pct,omitempty" minimum:"1" maximum:"99"`
		RoundDurationSeconds *int32 `json:"round_duration_seconds,omitempty" minimum:"10" maximum:"3600"`
		StartDelaySeconds    *int32 `json:"start_delay_seconds,omitempty" minimum:"5" maximum:"600"`
		GameType             string `json:"game_type,omitempty"`
	}
}

func (h *TemplateHandler) Update(ctx context.Context, req *UpdateTemplateRequest) (*TemplateResponse, error) {
	// Get existing template to use as defaults
	existing, err := h.Repo.GetTemplate(ctx, repository.GetTemplateParams{TemplateID: req.TemplateID})
	if err != nil {
		return nil, err
	}

	// Use existing values as defaults, override if provided
	minPlayers := existing.MinPlayers
	if req.Body.MinPlayers != nil {
		minPlayers = *req.Body.MinPlayers
	}

	if minPlayers > req.Body.PlayersNeeded {
		return nil, huma.Error400BadRequest("min_players cannot be greater than players_needed", nil)
	}

	winnerPct := existing.WinnerPct
	if req.Body.WinnerPct != nil {
		winnerPct = *req.Body.WinnerPct
	}

	roundDurationSeconds := existing.RoundDurationSeconds
	if req.Body.RoundDurationSeconds != nil {
		roundDurationSeconds = *req.Body.RoundDurationSeconds
	}

	startDelaySeconds := existing.StartDelaySeconds
	if req.Body.StartDelaySeconds != nil {
		startDelaySeconds = *req.Body.StartDelaySeconds
	}

	gameType := existing.GameType
	if req.Body.GameType != "" {
		if req.Body.GameType != "train" && req.Body.GameType != "fridge" {
			return nil, huma.Error400BadRequest("game_type must be one of: train, fridge", nil)
		}
		gameType = req.Body.GameType
	}

	t, err := h.Repo.UpdateTemplate(ctx, repository.UpdateTemplateParams{
		TemplateID:           req.TemplateID,
		Name:                 req.Body.Name,
		PlayersNeeded:        req.Body.PlayersNeeded,
		EntryCost:            req.Body.EntryCost,
		WinnerPct:            winnerPct,
		RoundDurationSeconds: roundDurationSeconds,
		StartDelaySeconds:    startDelaySeconds,
		GameType:             gameType,
		MinPlayers:           minPlayers,
	})
	if err != nil {
		return nil, catchUniqueNameViolation(err)
	}

	resp := &TemplateResponse{}
	resp.Body = templateToItem(t)
	return resp, nil
}

// --- Delete ---

type DeleteTemplateRequest struct {
	TemplateID int32 `path:"template_id"`
}

type DeleteTemplateResponse struct {
	Body struct {
		Message string `json:"message"`
	}
}

func (h *TemplateHandler) Delete(ctx context.Context, req *DeleteTemplateRequest) (*DeleteTemplateResponse, error) {
	err := h.Repo.DeleteTemplate(ctx, repository.DeleteTemplateParams{TemplateID: req.TemplateID})
	if err != nil {
		return nil, err
	}

	resp := &DeleteTemplateResponse{}
	resp.Body.Message = "template deleted successfully"
	return resp, nil
}
