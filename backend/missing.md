# Backend — Missing / Incomplete Items

Based on the project requirements (PROJECT.txt), here is what still needs to be added or fixed on the backend.

---

## 1. WebSocket / Real-Time Updates (Scenario 3)

The project requires real-time updates for room state: player list, timer countdown, jackpot, and room status changes.

- No WebSocket handler exists anywhere in the codebase.
- Redis client is connected (`internal/database.go`) but `internal/redisclient/` directory is **empty** — no pub/sub logic implemented.
- Required: a WebSocket endpoint (e.g. `GET /rooms/{room_id}/ws`) that pushes room state changes to connected clients using Redis pub/sub as the message bus between services.

---

## 2. Room Filtering & Sorting (Scenario 1)

`GET /rooms` returns all rooms ordered by `created_at DESC` with no filtering or sorting options.

- Missing query parameters: `entry_cost`, `players_needed`, `status`, `sort_by`, `sort_order`.
- Missing DB query: `ListRoomsFiltered` with dynamic WHERE/ORDER BY clauses.
- Required: update `rooms.sql`, regenerate with sqlc, and update `room_handler.go` `List` method.

---

## 3. Room Configurator Validation (Scenarios 5 & 7)

There is no validation logic that checks whether a room configuration is economically sound.

- `CreateRoomRequest` has no validation beyond `minimum:"1"` on `players_needed`.
- Missing: a configurator endpoint (e.g. `POST /rooms/validate` or inline in `Create`) that evaluates:
  - Whether the prize fund (80% of jackpot) is attractive to players.
  - Whether the entry cost vs. prize ratio makes sense for the organizer.
  - Whether boost cost is not disproportionate.
- Should return warnings or block saving of clearly bad configurations.

---

## 4. Boost Restriction — One Boost Per User Per Room

`InsertRoomBoost` in the SQL query does **not** enforce a one-boost-per-user-per-room limit.

- A user can call `POST /rooms/{room_id}/boosts` multiple times.
- Required: add a `UNIQUE (room_id, user_id)` constraint to `room_boosts` table (new migration) and handle the conflict in the query/handler with a clear error message.

---

## 5. Insufficient Balance Error Handling (Scenario 6)

When a user tries to join a room or buy a boost with insufficient balance, the current SQL queries silently return empty results (the INSERT simply doesn't execute).

- `JoinRoomAndUpdateStatus` returns the room row regardless of whether the join succeeded — the caller cannot distinguish "joined" from "balance too low" or "room full".
- `InsertRoomBoost` returns an empty row on failure with no error.
- Required: explicit error responses (HTTP 402 / 409) with a descriptive message so the frontend can show the correct reason for rejection.

---

## 6. Round History / Audit Log API (Scenario 8)

There is no endpoint to list historical rounds with full detail.

- `GET /rooms/{room_id}/winners` exists but only returns winner rows, not the full round context.
- Missing: a `GET /rounds` or `GET /rooms?status=finished` endpoint that returns finished rooms with their participants, boosts, winner, prize, and balance changes.
- Missing DB query: join across `rooms`, `room_players`, `room_boosts`, `room_winners` for a complete round summary.

---

## 7. User Balance Top-Up / Management Endpoint

Test users need a way to have their balance adjusted for demo/testing purposes.

- `UserHandler` only has `Create`, `Get`, `Delete` — no `UpdateBalance` or `TopUp` endpoint.
- Required: `PATCH /users/{id}/balance` endpoint and corresponding SQL query (`UpdateUserBalance`).

---

## 8. List Users Endpoint Not Exposed

`repository.ListUsers` exists in the generated code but is never registered as an API route in `services/api/main.go`.

- Required: register `GET /users` route in `MountRoutes`.

---

## 10. External Random Number Generator (RNG) Support

The project spec explicitly mentions the ability to plug in an **external RNG API** for winner determination.

- `room_finisher.go` uses `math/rand` (Go's local PRNG) — not configurable.
- Required: an `RNG_URL` config field and an HTTP client that calls the external RNG endpoint when configured, falling back to local random if not set.

---

## 11. Prize Fund Distribution is Hardcoded at 80%

The winner always receives exactly 80% of the jackpot (`$2 * 80 / 100` in SQL).

- This percentage is not configurable per room.
- Required: add a `winner_pct` column to the `rooms` table (new migration), pass it through the room creation flow, and use it in `FinishRoomAndAwardWinner`.

---

## 12. Redis Client Directory is Empty

`backend/internal/redisclient/` exists but contains no files.

- The Redis client is initialized in `database.go` and passed to `MountRoutes` but never used anywhere.
- Required: implement at minimum a pub/sub helper here to support real-time room state broadcasting (ties into item #1).
