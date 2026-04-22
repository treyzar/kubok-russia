package service

import (
	"context"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminStatsService provides business logic for admin statistics and validation
type AdminStatsService struct {
	repo *repository.Queries
	pool *pgxpool.Pool
}

// NewAdminStatsService creates a new AdminStatsService instance
func NewAdminStatsService(repo *repository.Queries, pool *pgxpool.Pool) *AdminStatsService {
	return &AdminStatsService{
		repo: repo,
		pool: pool,
	}
}

// HistoricalMetrics contains aggregated metrics from past gameplay
type HistoricalMetrics struct {
	AvgRealPlayersPerRoom float64
	AvgEntryCost          float64
	TotalRooms            int64
}

// TemplateStats contains comprehensive statistics for a template
type TemplateStats struct {
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

// TimeFilter specifies a time period for filtering statistics
type TimeFilter struct {
	Period    string     `json:"period"` // "hour", "day", "week", "month", "all", "custom"
	StartTime *time.Time `json:"start_time,omitempty"`
	EndTime   *time.Time `json:"end_time,omitempty"`
}

// Warning represents a validation warning or error
type Warning struct {
	Field    string `json:"field"`
	Message  string `json:"message"`
	Severity string `json:"severity"` // "warning" or "error"
}

// ValidateTemplateParams contains parameters for template validation
type ValidateTemplateParams struct {
	PlayersNeeded int32
	MinPlayers    int32
	EntryCost     int32
	WinnerPct     int32
	GameType      string
}

// GetHistoricalMetrics retrieves aggregated metrics from the past 7 days
func (s *AdminStatsService) GetHistoricalMetrics(ctx context.Context) (*HistoricalMetrics, error) {
	// Calculate time 7 days ago
	since := time.Now().AddDate(0, 0, -7)

	result, err := s.repo.GetHistoricalMetrics(ctx, repository.GetHistoricalMetricsParams{
		CreatedAt: since,
	})
	if err != nil {
		return nil, err
	}

	return &HistoricalMetrics{
		AvgRealPlayersPerRoom: result.AvgRealPlayersPerRoom,
		AvgEntryCost:          result.AvgEntryCost,
		TotalRooms:            result.TotalCompletedRooms,
	}, nil
}

// ValidateTemplate checks template parameters against historical data and returns warnings
func (s *AdminStatsService) ValidateTemplate(ctx context.Context, params ValidateTemplateParams) ([]Warning, error) {
	var warnings []Warning

	// Get historical metrics for comparison
	metrics, err := s.GetHistoricalMetrics(ctx)
	if err != nil {
		return nil, err
	}

	// Check max players = 1
	if params.PlayersNeeded == 1 {
		warnings = append(warnings, Warning{
			Field:    "players_needed",
			Message:  "Player count is too low (1 player)",
			Severity: "warning",
		})
	}

	// Check min players against historical average
	if metrics.AvgRealPlayersPerRoom > 0 && float64(params.MinPlayers) > metrics.AvgRealPlayersPerRoom {
		warnings = append(warnings, Warning{
			Field:    "min_players",
			Message:  "Minimum players exceeds average real player count per room from past week",
			Severity: "warning",
		})
	}

	// Check max players against historical average (2x threshold)
	if metrics.AvgRealPlayersPerRoom > 0 && float64(params.PlayersNeeded) > 2*metrics.AvgRealPlayersPerRoom {
		warnings = append(warnings, Warning{
			Field:    "players_needed",
			Message:  "Maximum players exceeds twice the average real player count per room from past week",
			Severity: "warning",
		})
	}

	// Check entry cost against historical average (1.75x threshold)
	if metrics.AvgEntryCost > 0 && float64(params.EntryCost) > 1.75*metrics.AvgEntryCost {
		warnings = append(warnings, Warning{
			Field:    "entry_cost",
			Message:  "Entry cost is too high (exceeds 1.75x average)",
			Severity: "warning",
		})
	}

	// Check entry cost against historical average (0.5x threshold)
	if metrics.AvgEntryCost > 0 && float64(params.EntryCost) < 0.5*metrics.AvgEntryCost {
		warnings = append(warnings, Warning{
			Field:    "entry_cost",
			Message:  "Entry cost is too low (less than 0.5x average)",
			Severity: "warning",
		})
	}

	// Check winner_pct > 80
	if params.WinnerPct > 80 {
		warnings = append(warnings, Warning{
			Field:    "winner_pct",
			Message:  "Jackpot percentage is too high (exceeds 80%)",
			Severity: "warning",
		})
	}

	// Check winner_pct < 50
	if params.WinnerPct < 50 {
		warnings = append(warnings, Warning{
			Field:    "winner_pct",
			Message:  "Jackpot percentage is too low (less than 50%)",
			Severity: "warning",
		})
	}

	return warnings, nil
}

// CheckDuplicateTemplate checks if a template with identical parameters already exists
func (s *AdminStatsService) CheckDuplicateTemplate(ctx context.Context, params ValidateTemplateParams) (bool, error) {
	exists, err := s.repo.CheckDuplicateTemplate(ctx, repository.CheckDuplicateTemplateParams{
		PlayersNeeded: params.PlayersNeeded,
		MinPlayers:    params.MinPlayers,
		EntryCost:     params.EntryCost,
		WinnerPct:     params.WinnerPct,
		GameType:      params.GameType,
	})
	if err != nil {
		return false, err
	}

	return exists, nil
}

// GetTemplateStatistics retrieves comprehensive statistics for a template with time filtering
func (s *AdminStatsService) GetTemplateStatistics(ctx context.Context, templateID int32, filter TimeFilter) (*TemplateStats, error) {
	// Parse time filter to get start and end timestamps
	startTime, endTime := parseTimeFilter(filter)

	// Get basic template statistics
	templateStats, err := s.repo.GetTemplateStatistics(ctx, repository.GetTemplateStatisticsParams{
		TemplateID:  &templateID,
		CreatedAt:   startTime,
		CreatedAt_2: endTime,
	})
	if err != nil {
		return nil, err
	}

	// Get winner statistics
	winnerStats, err := s.repo.GetWinnerStatistics(ctx, repository.GetWinnerStatisticsParams{
		TemplateID: &templateID,
		WonAt:      startTime,
		WonAt_2:    endTime,
	})
	if err != nil {
		return nil, err
	}

	// Get boost statistics
	boostStats, err := s.repo.GetBoostStatistics(ctx, repository.GetBoostStatisticsParams{
		TemplateID:  &templateID,
		BoostedAt:   startTime,
		BoostedAt_2: endTime,
	})
	if err != nil {
		return nil, err
	}

	// Get place statistics
	avgPlaces, err := s.repo.GetPlaceStatistics(ctx, repository.GetPlaceStatisticsParams{
		TemplateID:  &templateID,
		CreatedAt:   startTime,
		CreatedAt_2: endTime,
	})
	if err != nil {
		return nil, err
	}

	// Aggregate results into TemplateStats struct
	stats := &TemplateStats{
		TemplateID:            templateID,
		CompletedRooms:        templateStats.CompletedRooms,
		TotalRealPlayers:      templateStats.TotalRealPlayers,
		TotalBots:             templateStats.TotalBots,
		AvgRealPlayersPerRoom: templateStats.AvgRealPlayersPerRoom,
		RealPlayerWins:        winnerStats.RealPlayerWins,
		BotWins:               winnerStats.BotWins,
		TotalBoostAmount:      boostStats.TotalBoostAmount,
		AvgBoostPerPlayer:     boostStats.AvgBoostPerPlayer,
		AvgBoostPerRoom:       boostStats.AvgBoostPerRoom,
		AvgPlacesPerPlayer:    avgPlaces,
	}

	return stats, nil
}

// parseTimeFilter converts a TimeFilter into start and end timestamps
func parseTimeFilter(filter TimeFilter) (time.Time, time.Time) {
	now := time.Now()
	var startTime, endTime time.Time

	switch filter.Period {
	case "hour":
		startTime = now.Add(-1 * time.Hour)
		endTime = now
	case "day":
		startTime = now.AddDate(0, 0, -1)
		endTime = now
	case "week":
		startTime = now.AddDate(0, 0, -7)
		endTime = now
	case "month":
		startTime = now.AddDate(0, -1, 0)
		endTime = now
	case "all":
		// Use a very old date for "all time"
		startTime = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
		endTime = now
	case "custom":
		if filter.StartTime != nil {
			startTime = *filter.StartTime
		} else {
			startTime = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
		}
		if filter.EndTime != nil {
			endTime = *filter.EndTime
		} else {
			endTime = now
		}
	default:
		// Default to all time
		startTime = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
		endTime = now
	}

	return startTime, endTime
}
