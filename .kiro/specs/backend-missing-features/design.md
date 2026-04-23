# Design Document

## Overview

This document describes the design for implementing missing and incomplete features in the OnlineShop lottery room platform backend. The implementation will enhance the existing system with real-time event broadcasting, advanced room filtering, economic validation, improved error handling, comprehensive audit logging, and external RNG integration.

## Architecture

The implementation follows the existing clean architecture pattern with three layers:

```
Handler Layer (HTTP/WebSocket)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
```

All new features will integrate with the existing microservices architecture:
- API Service: HTTP endpoints and WebSocket connections
- Room Manager: Cron jobs for room lifecycle management
- Bot Manager: Automated bot management (no changes needed)

## Components and Interfaces

### 1. Real-Time Event Broadcasting

#### Event Publisher Service

A centralized event publishing mechanism that integrates with existing Redis pub/sub infrastructure.

**Location**: `backend/internal/events/publisher.go`

**Interface**:
```go
type EventPublisher struct {
    pubSub *redisclient.PubSub
}

type RoomEvent struct {
    Type      string      `json:"type"`
    RoomID    int32       `json:"room_id"`
    Timestamp time.Time   `json:"timestamp"`
    Data      interface{} `json:"data"`
}

func (p *EventPublisher) PublishPlayerJoined(ctx context.Context, roomID, userID int32, places int32) error
func (p *EventPublisher) PublishBoostApplied(ctx context.Context, roomID, userID, amount int32) error
func (p *EventPublisher) PublishRoomStarting(ctx context.Context, roomID int32, startTime time.Time) error
func (p *EventPublisher) PublishGameStarted(ctx context.Context, roomID int32) error
func (p *EventPublisher) PublishGameFinished(ctx context.Context, roomID, winnerID, prize int32) error
```

**Integration Points**:
- `handlers/room_handler.go`: Call event publisher after successful JoinRoom, BoostRoom operations
- `internal/crons/room_starter.go`: Publish "room_starting" and "game_started" events
- `internal/crons/room_finisher.go`: Publish "game_finished" event (already partially implemented)

**Event Payload Structure**:
```json
{
  "type": "player_joined|boost_applied|room_starting|game_started|game_finished",
  "room_id": 123,
  "timestamp": "2026-04-21T10:30:00Z",
  "data": {
    // Event-specific data
    "user_id": 456,
    "countdown_seconds": 60  // For room_starting events
  }
}
```

### 2. Room Filtering and Sorting

#### Enhanced Repository Query

**Location**: `backend/db/queries/rooms.sql`

**New Query**: `ListRoomsFiltered` (already exists, needs verification)

The existing query uses dynamic SQL with conditional WHERE clauses. The implementation should validate:
- Empty string/zero values are treated as "no filter"
- Sort field validation to prevent SQL injection
- Proper indexing on filtered columns

**Handler Enhancement**:
The existing `ListRoomsRequest` struct already includes filter parameters. Implementation is complete but needs testing.

### 3. Room Configuration Validation

#### Economic Validator Service

**Location**: `backend/internal/validator/economic.go`

**Interface**:
```go
type EconomicValidator struct{}

type ValidationResult struct {
    PrizeFund    int32
    OrganiserCut int32
    PlayerROI    float64
    PlayerWinProb float64
    Warnings     []string
    IsViable     bool
}

func (v *EconomicValidator) ValidateRoomConfig(
    playersNeeded int32,
    entryCost int32,
    winnerPct int32,
) *ValidationResult
```

**Validation Rules**:
- Player ROI < 1.5: Warning "Prize fund may be unattractive to players"
- Organiser margin < 10%: Warning "Organiser margin is very low"
- Winner percentage > 95%: Warning "Winner percentage leaves no organiser margin"
- Winner percentage < 50%: Warning "Winner receives less than half the jackpot"
- Player win probability < 5%: Warning "Very low win probability may discourage players"

**Handler Enhancement**:
The existing `Validate` handler in `handlers/room_handler.go` already implements basic validation. Needs enhancement with additional checks.

### 4. Boost Constraint Error Handling

#### Handler Error Mapping

**Location**: `handlers/room_handler.go` (BoostRoom method)

**Current State**: Pre-check exists but error message is generic

**Enhancement**:
```go
// In BoostRoom handler
for _, b := range boosts {
    if b.UserID == req.Body.UserID {
        return nil, huma.Error409Conflict("You have already boosted this room", nil)
    }
}

// Fallback for DB-level constraint
var pgErr *pgconn.PgError
if errors.As(err, &pgErr) && pgErr.Code == "23505" {
    return nil, huma.Error409Conflict("You have already boosted this room", nil)
}
```

### 5. Insufficient Balance Error Handling

#### Enhanced Error Responses

**Location**: `handlers/room_handler.go` (JoinRoom and BoostRoom methods)

**Current State**: Basic balance check exists, needs enhanced error response

**Enhancement**:
```go
type InsufficientBalanceError struct {
    Message         string `json:"message"`
    Required        int32  `json:"required"`
    CurrentBalance  int32  `json:"current_balance"`
    Shortfall       int32  `json:"shortfall"`
}

// In JoinRoom
if user.Balance < room.EntryCost {
    return nil, huma.Error402PaymentRequired("Insufficient balance for entry", 
        &InsufficientBalanceError{
            Message: "Insufficient balance for entry",
            Required: room.EntryCost,
            CurrentBalance: user.Balance,
            Shortfall: room.EntryCost - user.Balance,
        })
}

// In BoostRoom
if user.Balance < req.Body.Amount {
    return nil, huma.Error402PaymentRequired("Insufficient balance for boost",
        &InsufficientBalanceError{
            Message: "Insufficient balance for boost",
            Required: req.Body.Amount,
            CurrentBalance: user.Balance,
            Shortfall: req.Body.Amount - user.Balance,
        })
}
```

### 6. Comprehensive Round History

#### Enhanced Repository Query

**Location**: `backend/db/queries/rounds.sql`

**New Query**: `GetRoundDetails`

```sql
-- name: GetRoundDetails :one
SELECT 
    r.room_id,
    r.jackpot,
    r.entry_cost,
    r.winner_pct,
    r.status,
    r.created_at,
    r.start_time,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'user_id', rp.user_id,
                'places', (SELECT COUNT(*) FROM room_places WHERE room_id = r.room_id AND user_id = rp.user_id),
                'joined_at', rp.joined_at
            )
        ) FILTER (WHERE rp.user_id IS NOT NULL),
        '[]'
    ) as players,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'user_id', rb.user_id,
                'amount', rb.amount,
                'boosted_at', rb.boosted_at
            )
        ) FILTER (WHERE rb.user_id IS NOT NULL),
        '[]'
    ) as boosts,
    COALESCE(
        json_build_object(
            'user_id', rw.user_id,
            'prize', rw.prize,
            'won_at', rw.won_at
        ),
        NULL
    ) as winner
FROM rooms r
LEFT JOIN room_players rp ON r.room_id = rp.room_id
LEFT JOIN room_boosts rb ON r.room_id = rb.room_id
LEFT JOIN room_winners rw ON r.room_id = rw.room_id
WHERE r.room_id = $1
GROUP BY r.room_id, rw.user_id, rw.prize, rw.won_at;
```

**Handler**:
**Location**: `backend/handlers/round_handler.go`

```go
type GetRoundDetailsRequest struct {
    RoomID int32 `path:"room_id"`
}

type GetRoundDetailsResponse struct {
    Body struct {
        RoomID    int32                `json:"room_id"`
        Jackpot   int32                `json:"jackpot"`
        EntryCost int32                `json:"entry_cost"`
        WinnerPct int32                `json:"winner_pct"`
        Status    string               `json:"status"`
        CreatedAt time.Time            `json:"created_at"`
        StartTime *time.Time           `json:"start_time,omitempty"`
        Players   []RoundPlayerDetail  `json:"players"`
        Boosts    []RoundBoostDetail   `json:"boosts"`
        Winner    *RoundWinnerDetail   `json:"winner,omitempty"`
    }
}

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
```

### 7. External Random Number Generator Integration

#### RNG Client Service

**Location**: `backend/internal/rng/client.go`

**Interface**:
```go
type RNGClient struct {
    baseURL string
    timeout time.Duration
    client  *http.Client
}

func NewRNGClient(baseURL string) *RNGClient

// SelectRandom returns a random number in [0, max) using external RNG or fallback
func (c *RNGClient) SelectRandom(ctx context.Context, max int32, roomID int32, playerCount int32) (int32, error)

// callExternalRNG makes HTTP request to external service
func (c *RNGClient) callExternalRNG(ctx context.Context, max int32, roomID int32, playerCount int32) (int32, error)

// fallbackRandom uses local math/rand as fallback
func (c *RNGClient) fallbackRandom(max int32) int32
```

**Configuration**:
- Environment variable: `RNG_URL` (optional)
- Request format: `GET {RNG_URL}?max={max}&room_id={room_id}&player_count={count}`
- Response format: `{"result": N}` where N is in [0, max)
- Timeout: 2 seconds
- Fallback: Local `math/rand` on any error

**Integration**:
The existing `room_finisher.go` already has partial implementation with `callExternalRNG` function. Needs to be extracted into a reusable service and enhanced with context support and additional parameters.

## Data Models

### Event Schema

```go
type RoomEvent struct {
    Type      string      `json:"type"`
    RoomID    int32       `json:"room_id"`
    Timestamp time.Time   `json:"timestamp"`
    Data      interface{} `json:"data"`
}

type PlayerJoinedData struct {
    UserID int32 `json:"user_id"`
    Places int32 `json:"places"`
}

type BoostAppliedData struct {
    UserID int32 `json:"user_id"`
    Amount int32 `json:"amount"`
}

type RoomStartingData struct {
    StartTime        time.Time `json:"start_time"`
    CountdownSeconds int32     `json:"countdown_seconds"`
}

type GameFinishedData struct {
    WinnerID int32 `json:"winner_id"`
    Prize    int32 `json:"prize"`
}
```

### Round Details Schema

Already defined in repository layer, needs aggregation in handler response.

## Error Handling

### Error Response Structure

All error responses follow Huma v2 conventions:

```json
{
  "title": "Payment Required",
  "status": 402,
  "detail": "Insufficient balance for entry",
  "errors": [
    {
      "message": "Insufficient balance for entry",
      "location": "",
      "value": null
    }
  ],
  "required": 100,
  "current_balance": 50,
  "shortfall": 50
}
```

### HTTP Status Codes

- 400 Bad Request: Invalid input, invalid room state
- 402 Payment Required: Insufficient balance
- 404 Not Found: Room/user not found
- 409 Conflict: Duplicate boost, room full, already in room
- 500 Internal Server Error: Database errors, external service failures

## Testing Strategy

### Unit Tests

**Location**: `backend/tests/missing_features/`

1. Event Publisher Tests
   - Test event serialization
   - Test Redis publish calls
   - Test error handling

2. Economic Validator Tests
   - Test ROI calculations
   - Test warning generation
   - Test edge cases (zero values, extreme percentages)

3. RNG Client Tests
   - Test external RNG call
   - Test fallback mechanism
   - Test timeout handling
   - Test response validation

### Integration Tests

**Location**: `backend/tests/api/`

Extend existing `run.sh` script with new test cases:

1. Real-time Events
   - Subscribe to WebSocket
   - Perform actions (join, boost)
   - Verify event reception

2. Room Filtering
   - Create rooms with various parameters
   - Test each filter parameter
   - Test sorting
   - Test combined filters

3. Error Handling
   - Test insufficient balance scenarios
   - Test duplicate boost attempts
   - Verify error response structure

4. Round History
   - Create complete round
   - Verify all data is returned
   - Test with missing data (no boosts, no winner)

5. External RNG
   - Mock external RNG service
   - Test successful call
   - Test fallback on failure

### Manual Testing

1. WebSocket connection and event streaming
2. Frontend integration with real-time updates
3. Economic validation with various configurations
4. External RNG service integration

## Implementation Notes

### Existing Code Reuse

- Redis pub/sub infrastructure already exists (`internal/redisclient/pubsub.go`)
- Room filtering query already implemented (`ListRoomsFiltered`)
- Basic validation logic exists in `Validate` handler
- External RNG call partially implemented in `room_finisher.go`
- Balance checks already present in join/boost handlers

### Code Organization

- New event publisher: `internal/events/publisher.go`
- Economic validator: `internal/validator/economic.go`
- RNG client: `internal/rng/client.go`
- Enhanced queries: `db/queries/rounds.sql`
- Handler enhancements: Modify existing handlers in `handlers/`

### Configuration Changes

Add to `.env`:
```
RNG_URL=  # Optional, e.g., http://rng-service:8080/random
```

### Database Changes

No new migrations required. All features use existing schema.

### Performance Considerations

1. Redis pub/sub is non-blocking - errors are logged but don't affect HTTP responses
2. Room filtering uses indexed columns (status, entry_cost, players_needed)
3. Round history query uses LEFT JOINs with aggregation - may be slow for large datasets
4. External RNG has 2-second timeout to prevent blocking
5. Event publishing happens after successful database commits

### Security Considerations

1. SQL injection prevention: Use parameterized queries, validate sort field names
2. WebSocket authentication: Reuse existing WebSocket handler authentication
3. External RNG: Validate response range, use HTTPS in production
4. Error messages: Don't expose internal details, use generic messages for unexpected errors

## Deployment

### Rollout Plan

1. Deploy event publisher (non-breaking, events are optional)
2. Deploy enhanced error handling (improves existing endpoints)
3. Deploy room filtering (already implemented, verify functionality)
4. Deploy round history endpoint (new endpoint)
5. Deploy external RNG integration (optional feature, fallback ensures compatibility)

### Monitoring

- Log all event publishing errors
- Monitor external RNG call success rate and latency
- Track validation warnings frequency
- Monitor WebSocket connection count

### Rollback Strategy

All changes are backward compatible:
- Event publishing failures don't affect core functionality
- External RNG falls back to local implementation
- Enhanced error responses maintain HTTP status code compatibility
- New endpoints don't affect existing functionality
