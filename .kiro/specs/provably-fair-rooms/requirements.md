# Requirements Document

## Introduction

This document describes the requirements for a Provably Fair Room Management System. The system manages game rooms with UUID-based identities, risk levels (low/medium/high), a cryptographic seed-based fairness mechanism, dynamic auto-scaling of room supply, deposit-based refund logic, and an up-sell room discovery flow. The system is implemented as a clean-architecture Go backend with HTTP handlers, a service layer, and a repository layer backed by PostgreSQL.

## Glossary

- **Room**: A game session entity identified by a UUID v4, with a risk level, lifecycle state, capacity, seed phrase, seed hash, and final fee.
- **Player**: A participant in a Room, identified by a UUID v4 user_id, with an initial deposit, refund amount, and refund status.
- **RiskLevel**: An enumeration of `low`, `medium`, or `high` indicating the risk category of a Room.
- **State**: The lifecycle state of a Room: `created` → `waiting` → `refunding` → `finished`.
- **SeedPhrase**: A 32-byte cryptographically random hex string generated at Room creation, kept secret until the Room reaches `finished` state.
- **SeedHash**: The SHA-256 hex digest of the SeedPhrase, publicly exposed from Room creation onward.
- **SeedReveal**: The optional field in the Room API response that exposes SeedPhrase only when the Room state is `finished`.
- **FinalFee**: The minimum `initial_deposit` across all Players in a Room, set atomically when the game starts.
- **RefundAmount**: The difference `initial_deposit − final_fee` for each Player, floored at zero.
- **AutoScale**: The mechanism that creates a new Room of the same RiskLevel when ≥70% of active rooms of that level are at ≥70% capacity.
- **UpSell**: The room discovery behavior where querying rooms by RiskLevel returns rooms at that level and all higher levels.
- **Handler**: The HTTP layer responsible for request parsing, UUID validation, and HTTP error mapping.
- **Service**: The business logic layer responsible for seed generation, auto-scale checks, and refund orchestration.
- **Repository**: The data access layer responsible for CRUD operations on Rooms and Players.
- **PlayerCount**: A virtual count of players in a Room, computed via LEFT JOIN rather than stored in the rooms table.
- **MaxCapacity**: The maximum number of Players allowed in a Room (default 10).
- **CreditUserBalance**: An external service call that credits a user's balance with a refund amount.

---

## Requirements

### Requirement 1

**User Story:** As a game operator, I want to create rooms with a risk level and provably fair seed, so that players can verify the fairness of the game outcome.

#### Acceptance Criteria

1. WHEN a POST /rooms request is received with a valid risk_level, THE System SHALL create a Room with a UUID v4 id, state `created`, a cryptographically random 32-byte hex seed_phrase, a seed_hash equal to SHA-256(seed_phrase), final_fee of 0, and max_capacity of 10.
2. THE System SHALL return the Room's id, state, seed_hash, final_fee, risk_level, and max_capacity in the response, with seed_phrase absent from the response body.
3. WHEN a GET /rooms/{id} request is received and the Room state is not `finished`, THE System SHALL return seed_hash and omit seed_phrase from the response.
4. WHEN a GET /rooms/{id} request is received and the Room state is `finished`, THE System SHALL include seed_phrase in the response under the field seed_reveal.
5. IF the id path parameter is not a valid UUID v4, THEN THE System SHALL return HTTP 400 with the message "invalid room id".

---

### Requirement 2

**User Story:** As a player, I want to join a room and have my deposit recorded, so that I can participate in the game and receive a fair refund.

#### Acceptance Criteria

1. WHEN a POST /rooms/{id}/join request is received with a valid user_id and deposit, THE System SHALL add the Player to the Room, record the initial_deposit, and transition the Room state from `created` to `waiting` if this is the first Player.
2. IF the Room state is `refunding` or `finished`, THEN THE System SHALL return HTTP 400 with the message "room is not accepting players".
3. IF the Room's player_count equals max_capacity, THEN THE System SHALL return HTTP 400 with the message "room is full".
4. IF the same user_id attempts to join the same Room more than once, THEN THE System SHALL return HTTP 400 or HTTP 409 due to a UNIQUE(room_id, user_id) constraint violation.
5. WHEN a Player joins a Room, THE System SHALL invoke checkAndScale outside the join transaction to evaluate whether a new Room of the same risk_level should be created.

---

### Requirement 3

**User Story:** As a game operator, I want to start a game and trigger atomic refunds, so that all players receive the correct refund based on the minimum deposit.

#### Acceptance Criteria

1. WHEN a POST /rooms/{id}/start request is received and the Room state is `waiting`, THE System SHALL execute the refund algorithm atomically within a single database transaction.
2. WHEN the refund transaction executes, THE System SHALL set final_fee to MIN(initial_deposit) across all Players, update the Room state to `refunding`, compute each Player's refund_amount as MAX(0, initial_deposit − final_fee), mark each Player as refunded, call creditUserBalance for each Player, and then update the Room state to `finished`.
3. IF the Room state is not `waiting` when POST /rooms/{id}/start is received, THEN THE System SHALL return HTTP 400 with the message "room must be in waiting state to start".
4. IF creditUserBalance returns an error for any Player during the refund transaction, THEN THE System SHALL roll back the entire transaction so that no Player is partially refunded and the Room state remains `waiting`.

---

### Requirement 4

**User Story:** As a platform operator, I want rooms to auto-scale when demand is high, so that players always have available rooms to join.

#### Acceptance Criteria

1. WHEN a Player joins a Room, THE System SHALL retrieve all active Rooms (state `created` or `waiting`) for the same risk_level and compute the fill ratio (player_count / max_capacity) for each.
2. WHEN the ratio of Rooms with fill ≥ 0.70 to total active Rooms of that risk_level is ≥ 0.70, THE System SHALL create a new Room with the same risk_level, state `created`, and a fresh seed.
3. WHEN auto-scale creates a new Room, THE System SHALL include scaled: true and new_room_id in the join response.
4. WHEN the auto-scale threshold is not met, THE System SHALL include scaled: false in the join response and not create a new Room.
5. THE System SHALL perform the auto-scale check outside the main join transaction to avoid holding long-duration locks.

---

### Requirement 5

**User Story:** As a player, I want to discover available rooms at my risk level and above, so that I can choose a room that suits my preferences.

#### Acceptance Criteria

1. WHEN a GET /rooms request is received with query parameter risk_level=low, THE System SHALL return Rooms with risk_level in (low, medium, high) that have state `created` or `waiting` and player_count < max_capacity.
2. WHEN a GET /rooms request is received with query parameter risk_level=medium, THE System SHALL return Rooms with risk_level in (medium, high) that have state `created` or `waiting` and player_count < max_capacity.
3. WHEN a GET /rooms request is received with query parameter risk_level=high, THE System SHALL return only Rooms with risk_level = high that have state `created` or `waiting` and player_count < max_capacity.

---

### Requirement 6

**User Story:** As a developer, I want the system to handle concurrent join requests safely, so that room capacity is never exceeded.

#### Acceptance Criteria

1. WHEN two concurrent POST /rooms/{id}/join requests target the last available slot in a Room, THE System SHALL allow exactly one request to succeed with HTTP 200 and return HTTP 400 "room is full" for the other.
2. THE System SHALL use transactional locking (e.g., SELECT FOR UPDATE) to prevent player_count from exceeding max_capacity under concurrent load.
