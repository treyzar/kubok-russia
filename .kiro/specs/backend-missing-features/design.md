# Design Document — Backend Missing Features

## Overview

This document describes the technical design for implementing all 12 requirements from the requirements document. The implementation targets the existing Go backend (`github.com/SomeSuperCoder/OnlineShop`) using Gin + Huma v2, PostgreSQL via sqlc, Redis via go-redis/v9, and gorilla/websocket for WebSocket support.

The guiding principle is **minimal invasive change**: existing routes, SQL queries, and generated repository code are preserved wherever possible. New SQL queries are added to `.sql` files and the repository is regenerated with sqlc. New handlers are added to the `handlers/` package. New routes are registered in `MountRoutes`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP / WebSocket                      │
│  GET /rooms?filters   POST /rooms/validate              │
│  PATCH /users/:id/balance   GET /users                  │
│  GET /rounds   GET /rounds/:id                          │
│  GET /room-templates (CRUD)                             │
│  GET /rooms/:id/ws  ──────────────────────────────────┐ │
└──────────────────────────────────────────────────────┐│ │
                                                       ││ │
┌──────────────────────────────────────────────────────┼┼─┤
│  handlers/                                           ││ │
│  ├── room_handler.go   (List w/ filters, Validate,   ││ │
│  │                      JoinRoom w/ pre-checks,      ││ │
│  │                      BoostRoom w/ pre-checks)     ││ │
│  ├── user_handler.go   (List, UpdateBalance)         ││ │
│  ├── round_handler.go  (List, Get)                   ││ │
│  ├── template_handler.go (CRUD)                      ││ │
│  └── ws_handler.go     (WebSocket upgrade + relay) ──┘│ │
└───────────────────────────────────────────────────────┘ │
                                                          │
┌─────────────────────────────────────────────────────────┤
│  internal/                                              │
│  ├── config.go         (+RNG_URL field)                 │
│  ├── redisclient/                                       │
│  │   └── pubsub.go     (Publish / Subscribe helpers)   │
│  └── crons/                                            │
│      └── room_finisher.go  (use winner_pct, ext RNG)   │
└─────────────────────────────────────────────────────────┤
                                                          │
┌─────────────────────────────────────────────────────────┤
│  repository/  (sqlc-generated)                          │
│  ├── rooms.sql.go      (+ListRoomsFiltered,             │
│  │                       +FinishRoomAndAwardWinnerPct,  │
│  │                       +GetRoomForJoinCheck)          │
│  ├── users.sql.go      (+UpdateUserBalance)             │
│  ├── rounds.sql.go     (+ListRounds, +GetRound)         │
│  └── templates.sql.go  (+CRUD queries)                  │
└─────────────────────────────────────────────────────────┤
                                                          │
┌─────────────────────────────────────────────────────────┤
│  db/                                                    │
│  ├── migrations/                                        │
│  │   ├── 000006_add_winner_pct_to_rooms.sql             │
│  │   ├── 000007_unique_boost_per_user_room.sql          │
│  │   └── 000008_create_room_templates.sql               │
│  └── queries/                                           │
│      ├── rooms.sql     (+ListRoomsFiltered,             │
│      │                   +FinishRoomAndAwardWinnerPct)  │
│      ├── users.sql     (+UpdateUserBalance)             │
│      ├── rounds.sql    (new file)                       │
│      └── templates.sql (new file)                       │
└─────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. Redis Pub/Sub Helper (`internal/redisclient/pubsub.go`)

```go
type PubSub struct { client *redis.Client }

func New(client *redis.Client) *PubSub
func (p *PubSub) Publish(ctx context.Context, roomID int32, payload []byte) error
func (p *PubSub) Subscribe(ctx context.Context, roomID int32) *redis.PubSub
func channelName(roomID int32) string  // returns "room:{roomID}"
```

The `PubSub` struct is instantiated once in `main.go` and passed to handlers and crons that need to broadcast.

### 2. WebSocket Handler (`handlers/ws_handler.go`)

Uses `github.com/gorilla/websocket`. The WebSocket endpoint is registered on the raw Gin router (not through Huma, since Huma does not support WebSocket upgrades) as `GET /api/v1/rooms/:room_id/ws`.

```
Client connects → gorilla upgrades → goroutine subscribes to Redis channel
→ loop: receive from Redis PubSub → write to WS client
→ on disconnect: close subscription, exit goroutine
```

A ping/pong keepalive is set with a 30-second write deadline to detect dead connections.

### 3. Room Filtering (`handlers/room_handler.go` + `db/queries/rooms.sql`)

The `List` handler is updated to accept optional query parameters. Since sqlc does not support dynamic WHERE clauses, we add a new query `ListRoomsFiltered` that uses `CASE`/`IS NULL` pattern to make each filter optional:

```sql
-- name: ListRoomsFiltered :many
SELECT * FROM rooms
WHERE ($1::varchar IS NULL OR status = $1)
  AND ($2::integer IS NULL OR entry_cost = $2)
  AND ($3::integer IS NULL OR players_needed = $3)
ORDER BY
  CASE WHEN $4 = 'entry_cost'    AND $5 = 'asc'  THEN entry_cost    END ASC,
  CASE WHEN $4 = 'entry_cost'    AND $5 = 'desc' THEN entry_cost    END DESC,
  CASE WHEN $4 = 'jackpot'       AND $5 = 'asc'  THEN jackpot       END ASC,
  CASE WHEN $4 = 'jackpot'       AND $5 = 'desc' THEN jackpot       END DESC,
  CASE WHEN $4 = 'players_needed' AND $5 = 'asc' THEN players_needed END ASC,
  CASE WHEN $4 = 'players_needed' AND $5 = 'desc' THEN players_needed END DESC,
  created_at DESC;
```

The handler passes `nil` for unset filters (using `*string` / `*int32` pointers).

### 4. Room Configurator (`handlers/room_handler.go`)

New method `Validate` on `RoomHandler`. Pure computation — no DB call needed:

```
full_jackpot = players_needed * entry_cost
prize_fund   = full_jackpot * winner_pct / 100
organiser_cut = full_jackpot - prize_fund
player_roi   = prize_fund / entry_cost   (how many times entry cost the winner gets back)
```

Warnings are accumulated in a `[]string` slice and returned alongside the numbers.

### 5. Boost Uniqueness

Migration `000007` drops the existing `PRIMARY KEY (room_id, user_id)` on `room_boosts` (which already enforces uniqueness) — actually the existing PK already enforces this at the DB level. The handler needs to detect the `pgx` unique-violation error code (`23505`) and return HTTP 409.

> Note: The existing migration already has `PRIMARY KEY (room_id, user_id)` on `room_boosts`, which is a unique constraint. The handler just needs to catch the error and translate it.

### 6. Insufficient Balance Pre-Checks

Rather than adding a separate pre-check query, the handler reads the room and user state before calling the atomic SQL, then returns the appropriate HTTP error if conditions aren't met. This adds two cheap SELECT queries but gives clear error semantics:

```
JoinRoom handler:
  1. GetRoom → check status in ('new','starting_soon'), else 409
  2. CountRoomPlayers → check < players_needed, else 409 "room is full"
  3. GetUser → check balance >= entry_cost, else 402
  4. Check user not already in room via ListRoomPlayers or a dedicated query
  5. Call JoinRoomAndUpdateStatus (atomic)
```

For boost:
```
  1. GetUser → check balance >= amount, else 402
  2. Check no existing boost (query room_boosts), else 409
  3. Call InsertRoomBoost (atomic)
```

### 7. Round History (`handlers/round_handler.go`)

New handler. Uses a new SQL query `GetRoundDetail` that joins `rooms`, `room_players`, `room_boosts`, `room_winners` for a single finished room. For the list endpoint, a lighter `ListFinishedRooms` query returns room rows only (players/boosts/winner fetched per-room in a loop, acceptable for audit use).

### 8. User Balance Top-Up (`handlers/user_handler.go`)

New method `UpdateBalance`. New SQL query `UpdateUserBalance`:

```sql
-- name: UpdateUserBalance :one
UPDATE users SET balance = balance + $2
WHERE id = $1 AND balance + $2 >= 0
RETURNING *;
```

If no row is returned (balance would go negative), the handler returns HTTP 422.

### 9. List Users Route

One-liner addition to `MountRoutes` and a new `List` method on `UserHandler` that calls `repo.ListUsers`.

### 10. External RNG (`internal/crons/room_finisher.go`)

```go
func selectWinner(players []repository.GetPlayersWithStakesRow, jackpot int32, rngURL string) int32
```

When `rngURL != ""`, the function calls `GET {rngURL}?max={totalStake}` and expects a JSON response `{"result": N}`. On any error it falls back to local rand. The `rngURL` is threaded from `AppConfig.RNGURL` through `RoomFinisher(pool, config)`.

### 11. Configurable `winner_pct`

Migration `000006` adds `winner_pct INTEGER NOT NULL DEFAULT 80 CHECK (winner_pct BETWEEN 1 AND 99)`.

A new SQL query `FinishRoomAndAwardWinnerPct` replaces the hardcoded `80` with a parameter. The `Room` model gains a `WinnerPct int32` field. `InsertRoom` and all room responses are updated.

The old `FinishRoomAndAwardWinner` query is kept for backward compatibility but the cron switches to the new one.

### 12. Room Templates (`handlers/template_handler.go`)

New handler + new SQL file `db/queries/templates.sql` with standard CRUD. The `room_templates` table has no FK dependencies, making it safe to add independently.

---

## Data Models

### Updated `Room` struct (after migration 000006)

```go
type Room struct {
    RoomID        int32
    Jackpot       int32
    StartTime     pgtype.Timestamptz
    Status        string
    PlayersNeeded int32
    WinnerPct     int32   // NEW — default 80
    CreatedAt     time.Time
    UpdatedAt     time.Time
    EntryCost     int32
}
```

### New `RoomTemplate` struct

```go
type RoomTemplate struct {
    TemplateID    int32
    Name          string
    PlayersNeeded int32
    EntryCost     int32
    WinnerPct     int32
    CreatedAt     time.Time
    UpdatedAt     time.Time
}
```

### Round Detail response (not a DB model — assembled in handler)

```go
type RoundDetail struct {
    RoomID        int32
    Jackpot       int32
    EntryCost     int32
    PlayersNeeded int32
    WinnerPct     int32
    StartTime     *time.Time
    Players       []RoundPlayer   // {user_id, joined_at}
    Boosts        []RoundBoost    // {user_id, amount}
    Winner        *RoundWinner    // {user_id, prize, won_at}
}
```

---

## Error Handling

| Scenario | HTTP Code | Message |
|---|---|---|
| Insufficient balance (join) | 402 | `"insufficient balance to join room"` |
| Insufficient balance (boost) | 402 | `"insufficient balance for boost"` |
| Room full | 409 | `"room is full"` |
| User already in room | 409 | `"user already in room"` |
| Duplicate boost | 409 | `"user has already boosted this room"` |
| Balance would go negative | 422 | `"balance cannot go below zero"` |
| Round not finished | 404 | `"round not found or not finished"` |
| Template name conflict | 409 | `"template name already exists"` |

All errors use `huma.Error{Code}(message, nil)` to stay consistent with the existing error style.

---

## Testing Strategy

The existing test suites in `backend/tests/api/` and `backend/tests/room_management/` are extended:

- `tests/api/main.go` — add tests for: list users, update balance, room filtering, configurator validate, round history, template CRUD, boost duplicate rejection, insufficient balance 402 responses.
- `tests/room_management/main.go` — add tests for: winner_pct propagation, external RNG fallback (mock URL), boost uniqueness at DB level.
- A new `tests/websocket/main.go` — connects a WebSocket client, triggers a room state change via REST, and asserts the WS message arrives within 2 seconds.

All tests follow the existing pattern: standalone `main` packages that connect to a live server/DB and report pass/fail.

---

## Dependency Notes

- `github.com/gorilla/websocket` — needs to be added to `go.mod` for WebSocket support.
- No other new external dependencies are required; all other features use existing imports.
- sqlc regeneration is required after adding new `.sql` query files and migrations.
