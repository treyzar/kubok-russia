# Admin Panel Design Document

## Overview

The admin panel backend provides REST API endpoints for template management, intelligent recommendations based on historical data, and comprehensive statistics. The implementation extends the existing Go backend architecture using the Huma framework, PostgreSQL with sqlc-generated queries, and follows the established handler pattern.

## Architecture

### High-Level Components

1. **Admin Handler** - New HTTP handler for admin-specific operations
2. **Statistics Service** - Business logic for calculating metrics and recommendations
3. **Template Lifecycle Manager** - Manages template deletion/updates with active room handling
4. **Database Queries** - New sqlc queries for statistics and validation
5. **API Endpoints** - RESTful endpoints following existing patterns

### Technology Stack

- Go 1.21+
- Huma v2 (existing REST framework)
- PostgreSQL (existing database)
- sqlc (existing query generator)
- pgxpool (existing connection pool)

## Components and Interfaces

### 1. Admin Handler (`backend/handlers/admin_handler.go`)

Handles HTTP requests for admin operations.

```go
type AdminHandler struct {
    Repo *repository.Queries
    Pool *pgxpool.Pool
    StatsService *AdminStatsService
}

// Template validation with recommendations
type ValidateTemplateRequest struct {
    Body struct {
        PlayersNeeded int32  `json:"players_needed"`
        MinPlayers    int32  `json:"min_players"`
        EntryCost     int32  `json:"entry_cost"`
        WinnerPct     int32  `json:"winner_pct"`
        GameType      string `json:"game_type"`
    }
}

type ValidateTemplateResponse struct {
    Body struct {
        Valid         bool       `json:"valid"`
        Warnings      []Warning  `json:"warnings"`
        ExpectedJackpot int32    `json:"expected_jackpot"`
    }
}

type Warning struct {
    Field   string `json:"field"`
    Message string `json:"message"`
    Severity string `json:"severity"` // "warning" or "error"
}
```

### 2. Statistics Service (`backend/internal/service/admin_stats_service.go`)

Business logic for calculating statistics and generating recommendations.

```go
type AdminStatsService struct {
    repo *repository.Queries
    pool *pgxpool.Pool
}

type HistoricalMetrics struct {
    AvgRealPlayersPerRoom float64
    AvgEntryCost          float64
    TotalRooms            int64
}

func (s *AdminStatsService) GetHistoricalMetrics(ctx context.Context, since time.Time) (*HistoricalMetrics, error)
func (s *AdminStatsService) ValidateTemplate(ctx context.Context, params ValidateTemplateParams) ([]Warning, error)
func (s *AdminStatsService) CheckDuplicateTemplate(ctx context.Context, params TemplateParams) (bool, error)
func (s *AdminStatsService) GetTemplateStatistics(ctx context.Context, templateID int32, filter TimeFilter) (*TemplateStats, error)
```

### 3. Template Lifecycle Manager (`backend/internal/service/template_lifecycle.go`)

Manages safe deletion and updates of templates with active rooms.

```go
type TemplateLifecycleManager struct {
    repo *repository.Queries
    pool *pgxpool.Pool
}

type TemplateStatus struct {
    TemplateID    int32
    ActiveRooms   int32
    WaitingRooms  int32
    CanDelete     bool
}

func (m *TemplateLifecycleManager) GetTemplateStatus(ctx context.Context, templateID int32) (*TemplateStatus, error)
func (m *TemplateLifecycleManager) DeleteTemplateWithRooms(ctx context.Context, templateID int32) error
func (m *TemplateLifecycleManager) UpdateTemplateWithRooms(ctx context.Context, templateID int32, params UpdateParams) error
```

### 4. Database Queries

New queries in `backend/db/queries/admin.sql`:

```sql
-- Historical metrics for recommendations
-- name: GetHistoricalMetrics :one
-- Calculate average real players per room and average entry cost for past week

-- name: CheckDuplicateTemplate :one
-- Check if template with identical parameters exists

-- name: GetTemplateRoomStatus :one
-- Get count of active/waiting rooms for a template

-- name: GetTemplateStatistics :one
-- Get comprehensive statistics for a template with time filter

-- name: GetRoomsByTemplate :many
-- Get all rooms created from a template (for deletion/update)

-- name: CountRealPlayersInCompletedRooms :one
-- Count real players across completed rooms for a template

-- name: GetBoostStatistics :one
-- Calculate boost-related statistics for a template

-- name: GetWinnerStatistics :one
-- Calculate winner statistics (real players vs bots) for a template
```

## Data Models

### Template Statistics Response

```go
type TemplateStats struct {
    TemplateID              int32     `json:"template_id"`
    CompletedRooms          int32     `json:"completed_rooms"`
    TotalRealPlayers        int32     `json:"total_real_players"`
    TotalBots               int32     `json:"total_bots"`
    AvgRealPlayersPerRoom   float64   `json:"avg_real_players_per_room"`
    RealPlayerWins          int32     `json:"real_player_wins"`
    BotWins                 int32     `json:"bot_wins"`
    TotalBoostAmount        int32     `json:"total_boost_amount"`
    AvgBoostPerPlayer       float64   `json:"avg_boost_per_player"`
    AvgBoostPerRoom         float64   `json:"avg_boost_per_room"`
    AvgPlacesPerPlayer      float64   `json:"avg_places_per_player"`
}
```

### Time Filter

```go
type TimeFilter struct {
    Period     string    `json:"period"` // "hour", "day", "week", "month", "all", "custom"
    StartTime  *time.Time `json:"start_time,omitempty"`
    EndTime    *time.Time `json:"end_time,omitempty"`
}
```

## API Endpoints

### Template Validation

```
POST /api/admin/templates/validate
```

Validates template parameters and returns recommendations before creation.

### Template Statistics List

```
GET /api/admin/statistics/templates?period={period}&start={start}&end={end}&sort_by={field}&sort_order={asc|desc}
```

Returns list of all templates with completed room counts and filters.

### Template Detailed Statistics

```
GET /api/admin/statistics/templates/{template_id}?period={period}&start={start}&end={end}
```

Returns detailed statistics for a specific template.

### Enhanced Template Delete

```
DELETE /api/admin/templates/{template_id}
```

Deletes template after ensuring all rooms are resolved. Returns status if waiting is required.

### Enhanced Template Update

```
PUT /api/admin/templates/{template_id}
```

Updates template after ensuring all rooms are resolved. Returns status if waiting is required.

### Template Status Check

```
GET /api/admin/templates/{template_id}/status
```

Returns current status of template including active/waiting room counts.

## Error Handling

### Validation Errors

- Return 400 Bad Request with detailed warning messages
- Include field-specific errors in response
- Distinguish between warnings (can proceed) and errors (cannot proceed)

### Template Lifecycle Errors

- Return 409 Conflict if template has active rooms that cannot be immediately deleted
- Include status information about waiting rooms
- Provide estimated time until deletion can complete

### Database Errors

- Handle connection errors with 503 Service Unavailable
- Handle constraint violations with 409 Conflict
- Log all database errors for debugging

## Testing Strategy

### Unit Tests

1. **Statistics Calculations** - Test metric calculations with known data
2. **Validation Logic** - Test all warning conditions with edge cases
3. **Duplicate Detection** - Test template parameter matching
4. **Time Filtering** - Test period calculations and custom ranges

### Integration Tests

1. **Template Lifecycle** - Test deletion/update with active rooms
2. **Statistics Queries** - Test complex queries with real database
3. **Historical Metrics** - Test calculations across time periods
4. **API Endpoints** - Test full request/response cycles

### Test Data Setup

- Create test templates with known parameters
- Generate completed rooms with predictable statistics
- Create mix of real players and bots
- Add boost and winner data for calculations

## Implementation Notes

### Database Schema Changes

A new migration is required to add a `template_id` foreign key to the `rooms` table to track which template created each room:

```sql
-- Migration: 000018_add_template_id_to_rooms.sql
ALTER TABLE rooms ADD COLUMN template_id INTEGER REFERENCES room_templates(template_id) ON DELETE SET NULL;
CREATE INDEX idx_rooms_template_id ON rooms(template_id);
```

### Recommendation Thresholds

All thresholds from requirements:
- Max players = 1: Warning
- Min players > avg real players: Warning
- Max players > 2 * avg real players: Warning  
- Entry cost > 1.75 * avg entry cost: Warning
- Entry cost < 0.5 * avg entry cost: Warning
- Winner pct > 80: Warning
- Winner pct < 50: Warning
- Duplicate template: Error (prevents creation)

### Performance Considerations

1. **Statistics Caching** - Consider caching historical metrics (updated hourly)
2. **Query Optimization** - Use indexes on template_id, status, created_at
3. **Pagination** - Implement pagination for template lists
4. **Async Deletion** - Consider background job for template deletion with many rooms

### Security Considerations

1. **Admin Authentication** - All admin endpoints require authentication (to be implemented)
2. **Rate Limiting** - Apply rate limits to prevent abuse
3. **Input Validation** - Validate all numeric inputs for reasonable ranges
4. **SQL Injection** - Use sqlc parameterized queries (already in place)

## Migration Path

### Phase 1: Database Schema
1. Add template_id to rooms table
2. Backfill template_id for existing rooms (if possible)

### Phase 2: Statistics Queries
1. Implement admin.sql queries
2. Generate sqlc code
3. Test queries with sample data

### Phase 3: Services
1. Implement AdminStatsService
2. Implement TemplateLifecycleManager
3. Add unit tests

### Phase 4: API Layer
1. Implement AdminHandler
2. Register routes in main.go
3. Add integration tests

### Phase 5: Frontend Integration
1. Document API endpoints
2. Provide example requests/responses
3. Support frontend development
