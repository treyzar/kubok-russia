# Design Document: Room Template Settings

## Overview

This feature extends the room template system to support configurable game settings that control room lifecycle timing, winner payouts, and game categorization. Currently, critical timing values (30-second round duration, 1-minute start delay) are hardcoded in the cron jobs and SQL queries, limiting the flexibility of room configurations.

The design introduces four new fields to the room template schema: `round_duration_seconds`, `start_delay_seconds`, `game_type`, and ensures proper handling of the existing `winner_pct` field. These settings will be copied to room instances when created from templates, allowing each room to operate with its own timing and payout configuration.

## Architecture

### Database Schema Changes

The solution requires modifications to two primary tables:

1. **room_templates table**: Add new configuration fields
2. **rooms table**: Add corresponding fields to store per-room settings

The migration strategy ensures backward compatibility by providing sensible defaults that match current hardcoded behavior (30s round duration, 60s start delay, 80% winner payout, "standard" game type).

### Component Interactions

```
Template Creation/Update → Database (room_templates)
                              ↓
Room Creation from Template → Copy settings to rooms table
                              ↓
Room Lifecycle:
  - Room Starter Cron → Uses start_delay_seconds
  - Room Finisher Cron → Uses round_duration_seconds + winner_pct
```

## Components and Interfaces

### 1. Database Migrations

**Migration: Add Template Settings**

Create a new migration file that adds four columns to `room_templates`:
- `round_duration_seconds INTEGER NOT NULL DEFAULT 30`
- `start_delay_seconds INTEGER NOT NULL DEFAULT 60`
- `game_type VARCHAR(20) NOT NULL DEFAULT 'train'`
- Add CHECK constraint: `game_type IN ('train', 'fridge')`
- Add CHECK constraint: `round_duration_seconds BETWEEN 10 AND 3600`
- Add CHECK constraint: `start_delay_seconds BETWEEN 5 AND 600`

**Migration: Add Room Settings**

Add corresponding columns to `rooms` table:
- `round_duration_seconds INTEGER NOT NULL DEFAULT 30`
- `start_delay_seconds INTEGER NOT NULL DEFAULT 60`
- `game_type VARCHAR(20) NOT NULL DEFAULT 'train'`
- Add same CHECK constraints as template table

**Design Rationale**: Storing these values on both templates and room instances allows templates to define defaults while giving each room instance independence. This prevents retroactive changes when templates are updated and ensures room behavior remains consistent throughout its lifecycle.

### 2. SQL Query Updates

**templates.sql Changes**

Update `InsertTemplate` query to accept new parameters:
```sql
INSERT INTO room_templates (
    name, players_needed, entry_cost, winner_pct,
    round_duration_seconds, start_delay_seconds, game_type
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;
```

Update `UpdateTemplate` query similarly to include all new fields.

Update `ListTemplates` to return new fields (already returns all columns via `SELECT *`).

**rooms.sql Changes**

Update `InsertRoom` query to accept new parameters:
```sql
INSERT INTO rooms (
    jackpot, start_time, status, players_needed, entry_cost, winner_pct,
    round_duration_seconds, start_delay_seconds, game_type
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;
```

Update `JoinRoomAndUpdateStatus` to use room's `start_delay_seconds`:
```sql
start_time = CASE
    WHEN (SELECT status FROM room_info) = 'new' 
         AND (SELECT count FROM current_player_count) = 0 
         AND EXISTS (SELECT 1 FROM inserted) 
    THEN CURRENT_TIMESTAMP + (SELECT start_delay_seconds FROM room_info) * INTERVAL '1 second'
    ELSE start_time
END
```

Update `ListPlayingRoomsReadyToFinish` to use room's `round_duration_seconds`:
```sql
SELECT * FROM rooms
WHERE status = 'playing'
  AND start_time IS NOT NULL
  AND start_time + (round_duration_seconds * INTERVAL '1 second') <= CURRENT_TIMESTAMP;
```

**Design Rationale**: The queries are updated to use dynamic intervals based on room configuration rather than hardcoded values. The `JoinRoomAndUpdateStatus` query already sets `start_time` when the first player joins; we're modifying it to use the configurable delay. The `ListPlayingRoomsReadyToFinish` query currently uses a hardcoded 30-second interval; we're making it dynamic.

### 3. Repository Layer (Generated Code)

After updating SQL queries, regenerate repository code using sqlc:
```bash
cd backend && sqlc generate
```

This will update:
- `repository/models.go`: Add new fields to `RoomTemplate` and `Room` structs
- `repository/templates.sql.go`: Update template CRUD function signatures
- `repository/rooms.sql.go`: Update room creation and query function signatures

**Design Rationale**: Using sqlc ensures type-safe database access and automatically generates Go code that matches the SQL schema, reducing manual coding errors.

### 4. Handler Layer Updates

**template_handler.go**

Update template creation and update handlers to:
1. Accept new fields from request body (JSON)
2. Validate constraints:
   - `round_duration_seconds`: 10-3600
   - `start_delay_seconds`: 5-600
   - `game_type`: enum validation ("quick", "standard", "marathon")
3. Pass validated values to repository layer

Example validation logic:
```go
if req.RoundDurationSeconds < 10 || req.RoundDurationSeconds > 3600 {
    return error
}
if req.StartDelaySeconds < 5 || req.StartDelaySeconds > 600 {
    return error
}
if req.GameType != "train" && req.GameType != "fridge" {
    return error
}
```

**room_handler.go**

Update room creation handler to:
1. Fetch template by ID
2. Copy all template settings to room creation parameters
3. Create room with copied settings

**Design Rationale**: Validation at the handler layer provides immediate feedback to API clients before database constraints are checked. This improves error messages and reduces unnecessary database round-trips.

### 5. Cron Job Updates

**room_starter.go**

No changes required. The cron already reads `start_time` from the room record and compares it to current time. Since `JoinRoomAndUpdateStatus` now sets `start_time` using the room's `start_delay_seconds`, the cron will automatically respect the configured delay.

**room_finisher.go**

No changes required. The cron uses `ListPlayingRoomsReadyToFinish` query which now dynamically calculates expiration based on each room's `round_duration_seconds`. The winner payout calculation already uses `room.WinnerPct` from the database.

**Design Rationale**: By moving timing logic into SQL queries, the cron jobs remain simple and don't need to be aware of configuration details. This separation of concerns makes the system more maintainable.

## Data Models

### RoomTemplate (Updated)

```go
type RoomTemplate struct {
    TemplateID             int32     `json:"template_id"`
    Name                   string    `json:"name"`
    PlayersNeeded          int32     `json:"players_needed"`
    EntryCost              int32     `json:"entry_cost"`
    WinnerPct              int32     `json:"winner_pct"`
    RoundDurationSeconds   int32     `json:"round_duration_seconds"`
    StartDelaySeconds      int32     `json:"start_delay_seconds"`
    GameType               string    `json:"game_type"`
    CreatedAt              time.Time `json:"created_at"`
    UpdatedAt              time.Time `json:"updated_at"`
}
```

### Room (Updated)

```go
type Room struct {
    RoomID                 int32              `json:"room_id"`
    Jackpot                int32              `json:"jackpot"`
    StartTime              pgtype.Timestamptz `json:"start_time"`
    Status                 string             `json:"status"`
    PlayersNeeded          int32              `json:"players_needed"`
    EntryCost              int32              `json:"entry_cost"`
    WinnerPct              int32              `json:"winner_pct"`
    RoundDurationSeconds   int32              `json:"round_duration_seconds"`
    StartDelaySeconds      int32              `json:"start_delay_seconds"`
    GameType               string             `json:"game_type"`
    CreatedAt              time.Time          `json:"created_at"`
    UpdatedAt              time.Time          `json:"updated_at"`
}
```

### API Request/Response Models

**CreateTemplateRequest**
```go
type CreateTemplateRequest struct {
    Name                 string `json:"name"`
    PlayersNeeded        int32  `json:"players_needed"`
    EntryCost            int32  `json:"entry_cost"`
    WinnerPct            int32  `json:"winner_pct"`
    RoundDurationSeconds int32  `json:"round_duration_seconds"` // optional, defaults to 30
    StartDelaySeconds    int32  `json:"start_delay_seconds"`    // optional, defaults to 60
    GameType             string `json:"game_type"`              // optional, defaults to "train"
}
```

## Error Handling

### Validation Errors

Return HTTP 400 Bad Request with descriptive error messages:
- "round_duration_seconds must be between 10 and 3600"
- "start_delay_seconds must be between 5 and 600"
- "game_type must be one of: train, fridge"
- "winner_pct must be between 1 and 99"

### Database Constraint Violations

Database CHECK constraints provide a safety net if handler validation is bypassed. These will return HTTP 500 errors that should be logged and investigated.

### Backward Compatibility

Existing API clients that don't provide new fields will receive default values:
- `round_duration_seconds`: 30
- `start_delay_seconds`: 60
- `game_type`: "train"

This ensures existing integrations continue to work without modification.

**Design Rationale**: Layered validation (handler + database) provides defense in depth. Default values ensure backward compatibility while allowing gradual adoption of new features.

## Testing Strategy

### Database Migration Testing

1. Apply migration to test database
2. Verify default values are set correctly
3. Test CHECK constraints reject invalid values
4. Verify existing templates receive default values

### SQL Query Testing

1. Test `InsertTemplate` with all new fields
2. Test `InsertRoom` copies template settings correctly
3. Test `JoinRoomAndUpdateStatus` calculates start_time with custom delay
4. Test `ListPlayingRoomsReadyToFinish` respects custom round duration
5. Verify winner payout calculation uses room's winner_pct

### Handler Testing

1. Test template creation with valid new fields
2. Test template creation with invalid values (boundary testing)
3. Test template creation with missing optional fields (defaults)
4. Test room creation copies all template settings
5. Test template update modifies new fields
6. Test template list returns new fields

### Integration Testing

1. Create template with custom settings
2. Create room from template
3. Join room and verify start_time uses custom delay
4. Wait for room to start (or mock time)
5. Wait for round to finish (or mock time)
6. Verify winner receives correct percentage of jackpot

### Cron Job Testing

1. Create rooms with various round_duration_seconds values
2. Verify Room Finisher only finishes rooms whose duration has expired
3. Create rooms with various start_delay_seconds values
4. Verify Room Starter only starts rooms whose delay has expired

**Design Rationale**: Testing focuses on the integration points where configuration values flow through the system. Unit tests verify individual components, while integration tests ensure the end-to-end flow works correctly.

## Implementation Notes

### Migration Order

1. Create and apply database migrations (templates, then rooms)
2. Regenerate repository code with sqlc
3. Update handler layer with validation
4. Update API documentation
5. Test thoroughly before deployment

### Deployment Considerations

- Migrations include default values, so existing data remains valid
- No downtime required for deployment
- Cron jobs will automatically use new configuration after deployment
- Existing rooms in progress will complete with their current settings

### Future Enhancements

- Add filtering/sorting by game_type in room list API
- Add template validation rules (e.g., "train" games might have different characteristics than "fridge" games)
- Add analytics to track which game types are most popular
- Consider adding more game types based on user feedback

**Design Rationale**: The implementation order ensures database schema is updated before code that depends on it. Default values and backward compatibility allow for zero-downtime deployment.
