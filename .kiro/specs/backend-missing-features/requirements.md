# Requirements Document

## Introduction

This document covers the missing and incomplete backend features identified in `backend/missing.md` for the bonus-game platform. The platform allows users to join lottery-style rooms, buy boosts, and compete for a prize fund. The backend is written in Go (Gin + Huma), uses PostgreSQL (via sqlc), and Redis for pub/sub. The missing items span real-time WebSocket updates, room filtering, room configuration validation, boost uniqueness enforcement, proper error handling for insufficient balance, a round history API, user balance management, exposed list-users route, external RNG support, configurable prize percentage, and a populated Redis pub/sub client.

## Glossary

- **Room**: A game session with a jackpot, entry cost, player slots, and a lifecycle status (`new` → `starting_soon` → `playing` → `finished`).
- **Jackpot**: The accumulated prize pool for a room, funded by entry costs and boosts.
- **Boost**: An optional extra stake a player can add to a playing room to increase their win probability.
- **WinnerPct**: The configurable percentage of the jackpot awarded to the winner (default 80%).
- **RNG**: Random Number Generator — used to select the weighted winner.
- **External RNG**: An HTTP-based third-party RNG API that can replace the local PRNG.
- **Pub/Sub**: Redis publish/subscribe mechanism used to broadcast room state changes.
- **WebSocket**: A persistent bidirectional connection used to push real-time room state to clients.
- **Room Configurator**: The endpoint/logic that validates room parameters for economic soundness.
- **Round History**: A log of finished rooms with full participant, boost, winner, and balance-change detail.
- **Balance Top-Up**: An administrative operation to adjust a user's balance for testing or demo purposes.
- **sqlc**: Code-generation tool that produces Go from SQL queries; generated files must not be edited manually.
- **Huma**: The OpenAPI-aware HTTP framework wrapping Gin used for all REST handlers.

---

## Requirements

### Requirement 1 — WebSocket Real-Time Room Updates

**User Story:** As a player, I want to see live updates of room state (player list, timer, jackpot, status) without polling, so that the game feels responsive and engaging.

#### Acceptance Criteria

1. WHEN a client connects to `GET /rooms/{room_id}/ws`, THE System SHALL upgrade the connection to WebSocket and register the client as a subscriber for that room's channel.
2. WHEN room state changes (player joins/leaves, boost applied, status transitions, timer tick), THE System SHALL publish a JSON message to the Redis channel `room:{room_id}` containing the updated room snapshot.
3. WHILE a WebSocket client is connected, THE System SHALL forward every message received on the Redis channel `room:{room_id}` to that client within 500 ms.
4. IF a WebSocket client disconnects, THEN THE System SHALL unsubscribe that client from the Redis channel and release associated resources.
5. THE System SHALL implement a Redis pub/sub helper in `internal/redisclient/` that exposes `Publish(roomID, payload)` and `Subscribe(roomID)` functions.

---

### Requirement 2 — Room Filtering and Sorting

**User Story:** As a player, I want to filter and sort the room list by entry cost, player slots, and status, so that I can quickly find a room that matches my preferences.

#### Acceptance Criteria

1. WHEN a client calls `GET /rooms` with query parameter `status`, THE System SHALL return only rooms whose status matches the provided value.
2. WHEN a client calls `GET /rooms` with query parameter `entry_cost`, THE System SHALL return only rooms whose `entry_cost` equals the provided integer value.
3. WHEN a client calls `GET /rooms` with query parameter `players_needed`, THE System SHALL return only rooms whose `players_needed` equals the provided integer value.
4. WHEN a client calls `GET /rooms` with query parameters `sort_by` and `sort_order`, THE System SHALL order results by the specified column (`created_at`, `entry_cost`, `jackpot`, `players_needed`) in the specified direction (`asc` or `desc`).
5. IF no filter or sort parameters are provided, THEN THE System SHALL return all rooms ordered by `created_at DESC`, preserving existing behaviour.

---

### Requirement 3 — Room Configurator Validation

**User Story:** As an organiser, I want the system to evaluate my room configuration and warn me when it is economically unsound, so that I can create rooms that are attractive to players and profitable for me.

#### Acceptance Criteria

1. WHEN a client calls `POST /rooms/validate` with room parameters, THE System SHALL compute and return `prize_fund` (WinnerPct % of full jackpot), `organiser_cut` (remainder), `player_roi` (prize_fund / entry_cost ratio), and a `warnings` list.
2. WHEN `player_roi` is less than 1.5, THE System SHALL include the warning `"prize fund may be unattractive to players"` in the response.
3. WHEN `organiser_cut` is less than 10% of the full jackpot, THE System SHALL include the warning `"organiser margin is very low"` in the response.
4. WHEN `winner_pct` exceeds 95, THE System SHALL include the warning `"winner_pct leaves no organiser margin"` in the response.
5. WHEN `winner_pct` is less than 50, THE System SHALL include the warning `"winner receives less than half the jackpot"` in the response.
6. THE System SHALL return HTTP 200 with the analysis regardless of warnings, allowing the caller to decide whether to proceed.

---

### Requirement 4 — One Boost Per User Per Room

**User Story:** As a platform operator, I want each user to be limited to one boost per room, so that the boost mechanic cannot be exploited by repeated purchases.

#### Acceptance Criteria

1. THE System SHALL add a database migration that enforces a `UNIQUE (room_id, user_id)` constraint on the `room_boosts` table.
2. WHEN a user attempts to purchase a second boost for the same room, THE System SHALL return HTTP 409 with the message `"user has already boosted this room"`.
3. WHEN the first boost attempt succeeds, THE System SHALL return HTTP 200 with the boost record as before.

---

### Requirement 5 — Insufficient Balance Error Handling

**User Story:** As a player, I want to receive a clear error message when I cannot join a room or buy a boost due to insufficient balance, so that I understand why my action was rejected.

#### Acceptance Criteria

1. WHEN a user calls `POST /rooms/{room_id}/players` and the user's balance is less than the room's `entry_cost`, THE System SHALL return HTTP 402 with the message `"insufficient balance to join room"`.
2. WHEN a user calls `POST /rooms/{room_id}/players` and the room is full, THE System SHALL return HTTP 409 with the message `"room is full"`.
3. WHEN a user calls `POST /rooms/{room_id}/players` and the user is already in the room, THE System SHALL return HTTP 409 with the message `"user already in room"`.
4. WHEN a user calls `POST /rooms/{room_id}/boosts` and the user's balance is less than the boost amount, THE System SHALL return HTTP 402 with the message `"insufficient balance for boost"`.

---

### Requirement 6 — Round History API

**User Story:** As an administrator or auditor, I want to retrieve a full history of finished rounds including participants, boosts, winner, and balance changes, so that I can verify the fairness and correctness of each game.

#### Acceptance Criteria

1. WHEN a client calls `GET /rounds`, THE System SHALL return a list of finished rooms, each containing `room_id`, `jackpot`, `entry_cost`, `players_needed`, `winner_pct`, `start_time`, `players` (array of user IDs and join times), `boosts` (array of user IDs and amounts), and `winner` (user ID and prize).
2. WHEN a client calls `GET /rounds/{room_id}`, THE System SHALL return the full round detail for that specific finished room.
3. IF the requested room is not finished, THEN THE System SHALL return HTTP 404 with the message `"round not found or not finished"`.

---

### Requirement 7 — User Balance Top-Up Endpoint

**User Story:** As a developer or tester, I want to adjust a user's balance via API, so that I can set up test scenarios without direct database access.

#### Acceptance Criteria

1. WHEN a client calls `PATCH /users/{id}/balance` with a `delta` integer, THE System SHALL add `delta` to the user's current balance and return the updated user record.
2. IF `delta` is negative and the resulting balance would be less than zero, THEN THE System SHALL return HTTP 422 with the message `"balance cannot go below zero"`.
3. THE System SHALL add the corresponding SQL query `UpdateUserBalance` to `users.sql` and regenerate the repository.

---

### Requirement 8 — List Users Route Exposed

**User Story:** As a developer, I want `GET /users` to be available via the API, so that I can list all users without direct database access.

#### Acceptance Criteria

1. WHEN a client calls `GET /users`, THE System SHALL return a JSON array of all users ordered by `id ASC`.
2. THE System SHALL register the `GET /users` route in `MountRoutes` using the existing `ListUsers` repository query.

---

### Requirement 9 — External RNG Support

**User Story:** As a platform operator, I want to configure an external RNG API for winner selection, so that the randomness source is auditable and replaceable.

#### Acceptance Criteria

1. WHERE `RNG_URL` is set in the environment, THE System SHALL call the external RNG endpoint with the total number of weighted tickets and use the returned integer as the winning ticket index.
2. WHERE `RNG_URL` is not set, THE System SHALL fall back to the local `math/rand` weighted selection, preserving existing behaviour.
3. IF the external RNG call fails or returns an invalid response, THEN THE System SHALL log the error and fall back to local random selection.
4. THE System SHALL add `RNG_URL` as an optional field to `AppConfig`.

---

### Requirement 10 — Configurable Prize Percentage

**User Story:** As an organiser, I want to set the winner's prize percentage per room, so that I can control the economic balance of each game.

#### Acceptance Criteria

1. THE System SHALL add a database migration adding a `winner_pct` integer column (default 80, range 1–99) to the `rooms` table.
2. WHEN a room is created via `POST /rooms`, THE System SHALL accept an optional `winner_pct` field and store it; if omitted, THE System SHALL default to 80.
3. WHEN `FinishRoomAndAwardWinner` is called, THE System SHALL use the room's `winner_pct` value instead of the hardcoded 80.
4. THE System SHALL expose `winner_pct` in all room response objects.

---

### Requirement 11 — Redis Pub/Sub Client Implementation

**User Story:** As a developer, I want the `internal/redisclient/` package to contain a working pub/sub helper, so that WebSocket and other services can broadcast room events reliably.

#### Acceptance Criteria

1. THE System SHALL implement `pubsub.go` in `internal/redisclient/` with a `PubSub` struct that wraps `*redis.Client`.
2. THE System SHALL expose a `Publish(ctx, roomID int32, payload []byte) error` method on `PubSub`.
3. THE System SHALL expose a `Subscribe(ctx, roomID int32) *redis.PubSub` method on `PubSub` that returns a subscription handle.
4. THE System SHALL use the channel naming convention `room:{room_id}` for all pub/sub operations.

---

### Requirement 12 — Room Templates

**User Story:** As an administrator, I want to define reusable room templates with preset parameters, so that the system can later use them for dynamic room creation without manual configuration each time.

#### Acceptance Criteria

1. THE System SHALL add a database migration creating a `room_templates` table with columns: `template_id` (serial PK), `name` (varchar, unique), `players_needed` (integer), `entry_cost` (integer), `winner_pct` (integer, default 80), `created_at`, `updated_at`.
2. WHEN a client calls `POST /room-templates`, THE System SHALL create a new template and return the created record.
3. WHEN a client calls `GET /room-templates`, THE System SHALL return all templates ordered by `created_at DESC`.
4. WHEN a client calls `GET /room-templates/{template_id}`, THE System SHALL return the template with that ID.
5. WHEN a client calls `PUT /room-templates/{template_id}`, THE System SHALL update the template fields and return the updated record.
6. WHEN a client calls `DELETE /room-templates/{template_id}`, THE System SHALL delete the template and return a success message.
7. IF a template with the same `name` already exists, THEN THE System SHALL return HTTP 409 with the message `"template name already exists"`.