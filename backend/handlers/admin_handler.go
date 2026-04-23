package handlers

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal/service"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminHandler handles HTTP requests for admin operations
type AdminHandler struct {
	Repo                     *repository.Queries
	Pool                     *pgxpool.Pool
	StatsService             *service.AdminStatsService
	TemplateLifecycleManager *service.TemplateLifecycleManager
}

// --- Shared types ---

type warningItem struct {
	Field    string `json:"field"`
	Message  string `json:"message"`
	Severity string `json:"severity"`
}

// --- ValidateTemplate endpoint ---

type ValidateTemplateRequest struct {
	Body struct {
		PlayersNeeded int32  `json:"players_needed" minimum:"1"`
		MinPlayers    int32  `json:"min_players" minimum:"1"`
		EntryCost     int32  `json:"entry_cost" minimum:"0"`
		WinnerPct     int32  `json:"winner_pct" minimum:"1" maximum:"99"`
		GameType      string `json:"game_type"`
	}
}

type ValidateTemplateResponse struct {
	Body struct {
		Valid           bool          `json:"valid"`
		Warnings        []warningItem `json:"warnings"`
		ExpectedJackpot int32         `json:"expected_jackpot"`
		IsDuplicate     bool          `json:"is_duplicate"`
	}
}

func (h *AdminHandler) ValidateTemplate(ctx context.Context, req *ValidateTemplateRequest) (*ValidateTemplateResponse, error) {
	// Validate min_players <= players_needed
	if req.Body.MinPlayers > req.Body.PlayersNeeded {
		return nil, huma.Error400BadRequest("min_players cannot be greater than players_needed", nil)
	}

	// Validate game type
	if req.Body.GameType != "" && req.Body.GameType != "train" && req.Body.GameType != "fridge" {
		return nil, huma.Error400BadRequest("game_type must be one of: train, fridge", nil)
	}

	gameType := req.Body.GameType
	if gameType == "" {
		gameType = "train"
	}

	// Call StatsService.ValidateTemplate
	params := service.ValidateTemplateParams{
		PlayersNeeded: req.Body.PlayersNeeded,
		MinPlayers:    req.Body.MinPlayers,
		EntryCost:     req.Body.EntryCost,
		WinnerPct:     req.Body.WinnerPct,
		GameType:      gameType,
	}

	warnings, err := h.StatsService.ValidateTemplate(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to validate template: %w", err)
	}

	// Call StatsService.CheckDuplicateTemplate
	isDuplicate, err := h.StatsService.CheckDuplicateTemplate(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to check duplicate template: %w", err)
	}

	// Add duplicate warning if exists
	if isDuplicate {
		warnings = append(warnings, service.Warning{
			Field:    "template",
			Message:  "A template with identical parameters already exists",
			Severity: "error",
		})
	}

	// Calculate expected jackpot (players_needed * entry_cost * winner_pct / 100)
	expectedJackpot := (req.Body.PlayersNeeded * req.Body.EntryCost * req.Body.WinnerPct) / 100

	// Convert warnings to response format
	warningItems := make([]warningItem, len(warnings))
	for i, w := range warnings {
		warningItems[i] = warningItem{
			Field:    w.Field,
			Message:  w.Message,
			Severity: w.Severity,
		}
	}

	// Template is valid if there are no errors (only warnings are ok)
	valid := true
	for _, w := range warnings {
		if w.Severity == "error" {
			valid = false
			break
		}
	}

	resp := &ValidateTemplateResponse{}
	resp.Body.Valid = valid
	resp.Body.Warnings = warningItems
	resp.Body.ExpectedJackpot = expectedJackpot
	resp.Body.IsDuplicate = isDuplicate

	return resp, nil
}

// --- GetTemplateStatisticsList endpoint ---

type GetTemplateStatisticsListRequest struct {
	Period    string `query:"period" enum:"hour,day,week,month,all,custom" default:"all"`
	StartTime string `query:"start_time"`
	EndTime   string `query:"end_time"`
	SortBy    string `query:"sort_by" default:"template_id"`
	SortOrder string `query:"sort_order" enum:"asc,desc" default:"asc"`
}

type templateStatisticsListItem struct {
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
	CompletedRooms       int32     `json:"completed_rooms"`
}

type GetTemplateStatisticsListResponse struct {
	Body struct {
		Templates []templateStatisticsListItem `json:"templates"`
	}
}

func (h *AdminHandler) GetTemplateStatisticsList(ctx context.Context, req *GetTemplateStatisticsListRequest) (*GetTemplateStatisticsListResponse, error) {
	// Parse time filter
	filter := service.TimeFilter{
		Period: req.Period,
	}

	if req.StartTime != "" {
		t, err := time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid start_time format, use RFC3339", nil)
		}
		filter.StartTime = &t
	}

	if req.EndTime != "" {
		t, err := time.Parse(time.RFC3339, req.EndTime)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid end_time format, use RFC3339", nil)
		}
		filter.EndTime = &t
	}

	// Get all templates from repository
	templates, err := h.Repo.ListTemplates(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list templates: %w", err)
	}

	// For each template, get completed room count with time filter
	items := make([]templateStatisticsListItem, len(templates))
	for i, t := range templates {
		stats, err := h.StatsService.GetTemplateStatistics(ctx, t.TemplateID, filter)
		if err != nil {
			return nil, fmt.Errorf("failed to get statistics for template %d: %w", t.TemplateID, err)
		}

		items[i] = templateStatisticsListItem{
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
			CompletedRooms:       stats.CompletedRooms,
		}
	}

	// Apply sorting based on query parameters
	sort.Slice(items, func(i, j int) bool {
		var less bool
		switch req.SortBy {
		case "template_id":
			less = items[i].TemplateID < items[j].TemplateID
		case "name":
			less = items[i].Name < items[j].Name
		case "players_needed":
			less = items[i].PlayersNeeded < items[j].PlayersNeeded
		case "min_players":
			less = items[i].MinPlayers < items[j].MinPlayers
		case "entry_cost":
			less = items[i].EntryCost < items[j].EntryCost
		case "winner_pct":
			less = items[i].WinnerPct < items[j].WinnerPct
		case "game_type":
			less = items[i].GameType < items[j].GameType
		case "completed_rooms":
			less = items[i].CompletedRooms < items[j].CompletedRooms
		case "created_at":
			less = items[i].CreatedAt.Before(items[j].CreatedAt)
		case "updated_at":
			less = items[i].UpdatedAt.Before(items[j].UpdatedAt)
		default:
			less = items[i].TemplateID < items[j].TemplateID
		}

		if req.SortOrder == "desc" {
			return !less
		}
		return less
	})

	resp := &GetTemplateStatisticsListResponse{}
	resp.Body.Templates = items
	return resp, nil
}

// --- GetTemplateStatisticsDetail endpoint ---

type GetTemplateStatisticsDetailRequest struct {
	TemplateID int32  `path:"template_id"`
	Period     string `query:"period" enum:"hour,day,week,month,all,custom" default:"all"`
	StartTime  string `query:"start_time"`
	EndTime    string `query:"end_time"`
}

type GetTemplateStatisticsDetailResponse struct {
	Body struct {
		TemplateID            int32   `json:"template_id"`
		CompletedRooms        int32   `json:"completed_rooms"`
		TotalRealPlayers      int32   `json:"total_real_players"`
		TotalBots             int32   `json:"total_bots"`
		AvgRealPlayersPerRoom float64 `json:"avg_real_players_per_room"`
		RealPlayerWins        int32   `json:"real_player_wins"`
		BotWins               int32   `json:"bot_wins"`
		TotalBoostAmount      int64   `json:"total_boost_amount"`
		AvgBoostPerPlayer     float64 `json:"avg_boost_per_player"`
		AvgBoostPerRoom       float64 `json:"avg_boost_per_room"`
		AvgPlacesPerPlayer    float64 `json:"avg_places_per_player"`
	}
}

func (h *AdminHandler) GetTemplateStatisticsDetail(ctx context.Context, req *GetTemplateStatisticsDetailRequest) (*GetTemplateStatisticsDetailResponse, error) {
	// Parse time filter
	filter := service.TimeFilter{
		Period: req.Period,
	}

	if req.StartTime != "" {
		t, err := time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid start_time format, use RFC3339", nil)
		}
		filter.StartTime = &t
	}

	if req.EndTime != "" {
		t, err := time.Parse(time.RFC3339, req.EndTime)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid end_time format, use RFC3339", nil)
		}
		filter.EndTime = &t
	}

	// Call StatsService.GetTemplateStatistics
	stats, err := h.StatsService.GetTemplateStatistics(ctx, req.TemplateID, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get template statistics: %w", err)
	}

	// Return detailed statistics response
	resp := &GetTemplateStatisticsDetailResponse{}
	resp.Body.TemplateID = stats.TemplateID
	resp.Body.CompletedRooms = stats.CompletedRooms
	resp.Body.TotalRealPlayers = stats.TotalRealPlayers
	resp.Body.TotalBots = stats.TotalBots
	resp.Body.AvgRealPlayersPerRoom = stats.AvgRealPlayersPerRoom
	resp.Body.RealPlayerWins = stats.RealPlayerWins
	resp.Body.BotWins = stats.BotWins
	resp.Body.TotalBoostAmount = stats.TotalBoostAmount
	resp.Body.AvgBoostPerPlayer = stats.AvgBoostPerPlayer
	resp.Body.AvgBoostPerRoom = stats.AvgBoostPerRoom
	resp.Body.AvgPlacesPerPlayer = stats.AvgPlacesPerPlayer

	return resp, nil
}

// --- GetTemplateStatus endpoint ---

type GetTemplateStatusRequest struct {
	TemplateID int32 `path:"template_id"`
}

type GetTemplateStatusResponse struct {
	Body struct {
		TemplateID   int32 `json:"template_id"`
		ActiveRooms  int32 `json:"active_rooms"`
		WaitingRooms int32 `json:"waiting_rooms"`
		CanDelete    bool  `json:"can_delete"`
	}
}

func (h *AdminHandler) GetTemplateStatus(ctx context.Context, req *GetTemplateStatusRequest) (*GetTemplateStatusResponse, error) {
	// Call TemplateLifecycleManager.GetTemplateStatus
	status, err := h.TemplateLifecycleManager.GetTemplateStatus(ctx, req.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("failed to get template status: %w", err)
	}

	// Return status response with room counts
	resp := &GetTemplateStatusResponse{}
	resp.Body.TemplateID = status.TemplateID
	resp.Body.ActiveRooms = status.ActiveRooms
	resp.Body.WaitingRooms = status.WaitingRooms
	resp.Body.CanDelete = status.CanDelete

	return resp, nil
}

// --- DeleteTemplate endpoint (enhanced) ---

type AdminDeleteTemplateRequest struct {
	TemplateID int32 `path:"template_id"`
}

type AdminDeleteTemplateResponse struct {
	Body struct {
		Message      string `json:"message"`
		TemplateID   int32  `json:"template_id,omitempty"`
		ActiveRooms  int32  `json:"active_rooms,omitempty"`
		WaitingRooms int32  `json:"waiting_rooms,omitempty"`
	}
}

func (h *AdminHandler) DeleteTemplate(ctx context.Context, req *AdminDeleteTemplateRequest) (*AdminDeleteTemplateResponse, error) {
	// Call TemplateLifecycleManager.DeleteTemplateWithRooms
	err := h.TemplateLifecycleManager.DeleteTemplateWithRooms(ctx, req.TemplateID)
	if err != nil {
		// Check if error is due to active rooms
		status, statusErr := h.TemplateLifecycleManager.GetTemplateStatus(ctx, req.TemplateID)
		if statusErr == nil && !status.CanDelete {
			// Return 409 Conflict with status information
			return nil, huma.Error409Conflict(
				fmt.Sprintf("Cannot delete template: %d active rooms and %d waiting rooms exist",
					status.ActiveRooms, status.WaitingRooms),
			)
		}
		return nil, fmt.Errorf("failed to delete template: %w", err)
	}

	// Return success response
	resp := &AdminDeleteTemplateResponse{}
	resp.Body.Message = "Template deleted successfully"
	return resp, nil
}

// --- UpdateTemplate endpoint (enhanced) ---

type AdminUpdateTemplateRequest struct {
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

type AdminUpdateTemplateResponse struct {
	Body struct {
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
		Message              string    `json:"message,omitempty"`
		ActiveRooms          int32     `json:"active_rooms,omitempty"`
		WaitingRooms         int32     `json:"waiting_rooms,omitempty"`
	}
}

func (h *AdminHandler) UpdateTemplate(ctx context.Context, req *AdminUpdateTemplateRequest) (*AdminUpdateTemplateResponse, error) {
	// Get existing template to use as defaults
	existing, err := h.Repo.GetTemplate(ctx, repository.GetTemplateParams{TemplateID: req.TemplateID})
	if err != nil {
		return nil, fmt.Errorf("failed to get existing template: %w", err)
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

	// Call ValidateTemplate for new parameters
	validateParams := service.ValidateTemplateParams{
		PlayersNeeded: req.Body.PlayersNeeded,
		MinPlayers:    minPlayers,
		EntryCost:     req.Body.EntryCost,
		WinnerPct:     winnerPct,
		GameType:      gameType,
	}

	warnings, err := h.StatsService.ValidateTemplate(ctx, validateParams)
	if err != nil {
		return nil, fmt.Errorf("failed to validate template: %w", err)
	}

	// Check for errors in warnings (not just warnings)
	for _, w := range warnings {
		if w.Severity == "error" {
			return nil, huma.Error400BadRequest(fmt.Sprintf("Validation error: %s", w.Message), nil)
		}
	}

	// Call TemplateLifecycleManager.UpdateTemplateWithRooms
	updateParams := service.UpdateTemplateParams{
		Name:                 req.Body.Name,
		PlayersNeeded:        req.Body.PlayersNeeded,
		EntryCost:            req.Body.EntryCost,
		WinnerPct:            winnerPct,
		RoundDurationSeconds: roundDurationSeconds,
		StartDelaySeconds:    startDelaySeconds,
		GameType:             gameType,
		MinPlayers:           minPlayers,
	}

	err = h.TemplateLifecycleManager.UpdateTemplateWithRooms(ctx, req.TemplateID, updateParams)
	if err != nil {
		// Check if error is due to active rooms
		status, statusErr := h.TemplateLifecycleManager.GetTemplateStatus(ctx, req.TemplateID)
		if statusErr == nil && !status.CanDelete {
			// Return 409 Conflict with status information
			return nil, huma.Error409Conflict(
				fmt.Sprintf("Cannot update template: %d active rooms and %d waiting rooms exist",
					status.ActiveRooms, status.WaitingRooms),
			)
		}
		return nil, fmt.Errorf("failed to update template: %w", err)
	}

	// Get updated template
	updated, err := h.Repo.GetTemplate(ctx, repository.GetTemplateParams{TemplateID: req.TemplateID})
	if err != nil {
		return nil, fmt.Errorf("failed to get updated template: %w", err)
	}

	// Return updated template response
	resp := &AdminUpdateTemplateResponse{}
	resp.Body.TemplateID = updated.TemplateID
	resp.Body.Name = updated.Name
	resp.Body.PlayersNeeded = updated.PlayersNeeded
	resp.Body.MinPlayers = updated.MinPlayers
	resp.Body.EntryCost = updated.EntryCost
	resp.Body.WinnerPct = updated.WinnerPct
	resp.Body.RoundDurationSeconds = updated.RoundDurationSeconds
	resp.Body.StartDelaySeconds = updated.StartDelaySeconds
	resp.Body.GameType = updated.GameType
	resp.Body.CreatedAt = updated.CreatedAt
	resp.Body.UpdatedAt = updated.UpdatedAt

	return resp, nil
}
