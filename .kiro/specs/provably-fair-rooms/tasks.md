# Implementation Plan

- [x] 1. Create DB migration and domain types
  - Write `backend/db/migrations/000011_create_fair_rooms.sql` with `fair_rooms` and `fair_players` tables, ENUM types, UNIQUE constraint, and indexes
  - Write `backend/internal/domain/fair_room.go` with `RiskLevel`, `RoomState`, `FairRoom`, `FairPlayer`, `RoomView`, `JoinResult`, `RiskLevelOrder`, and sentinel error vars (`ErrRoomFull`, `ErrNotAccepting`, `ErrNotWaiting`, `ErrDuplicatePlayer`, `ErrCreditFailed`)
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 2. Implement repository layer
- [x] 2.1 Implement `backend/internal/repository/room_repo.go`
  - Write `RoomRepo` with `CreateRoom`, `GetRoom` (with player_count via LEFT JOIN), `ListAvailableRooms` (state in created/waiting, player_count < max_capacity, risk_level filter), `ListActiveRoomsByRisk`, `SetRoomStateTx`, `SetRoomFinalFeeTx`
  - `GetRoom` must use `SELECT ... LEFT JOIN COUNT(fair_players)` to populate `PlayerCount`
  - _Requirements: 1.1, 1.3, 4.1, 5.1, 5.2, 5.3_

- [x] 2.2 Implement `backend/internal/repository/player_repo.go`
  - Write `PlayerRepo` with `AddPlayerTx` (INSERT with SELECT FOR UPDATE on room row for concurrency safety), `GetMinDepositTx` (SELECT MIN FOR UPDATE), `ListPlayersTx`, `UpdateRefundTx`
  - _Requirements: 2.1, 3.1, 3.2, 6.1, 6.2_

- [x] 3. Implement service layer — `backend/internal/service/room_service.go`
- [x] 3.1 Implement `CreateRoom` and `GetRoom`
  - `CreateRoom`: generate `seed_phrase = hex(crypto/rand 32 bytes)`, `seed_hash = hex(SHA-256(seed_phrase))`, assign `uuid.New()` ID, persist via `RoomRepo.CreateRoom`
  - `GetRoom`: fetch room, populate `RoomView.SeedReveal` only when `state == finished`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3.2 Implement `ListRooms` and `JoinRoom`
  - `ListRooms`: resolve levels via `domain.RiskLevelOrder[riskLevel]`, call `RoomRepo.ListAvailableRooms`
  - `JoinRoom`: open transaction, lock room row, check state (return `ErrNotAccepting` if refunding/finished), check capacity (return `ErrRoomFull`), call `PlayerRepo.AddPlayerTx`, transition state `created→waiting` on first player via `RoomRepo.SetRoomStateTx`, commit; then call `checkAndScale` outside the transaction
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

- [x] 3.3 Implement `StartGame` and `checkAndScale`
  - `StartGame`: full refund transaction per algorithm.md section 7 — BEGIN, SELECT state FOR UPDATE, SELECT MIN(deposit) FOR UPDATE, UPDATE room to refunding, loop players updating refund + calling `CreditFn`, UPDATE room to finished, COMMIT; ROLLBACK on any error
  - `checkAndScale`: fetch active rooms by risk level, compute fill ratios, if `atThreshold/total >= 0.70` create new room and return its ID
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4_

- [x] 4. Implement handler and register routes
- [x] 4.1 Implement `backend/internal/handler/room_handler.go`
  - Write `FairRoomHandler` with `Create`, `List`, `Get`, `Join`, `Start` methods using Huma-typed request/response structs
  - UUID path param validation: `uuid.Parse()` → HTTP 400 "invalid room id" on failure
  - Map sentinel errors to HTTP codes: `ErrRoomFull`→400, `ErrNotAccepting`→400, `ErrNotWaiting`→400, `ErrDuplicatePlayer`→409, `pgx.ErrNoRows`→404
  - `Join` response body: `{ player, room, scaled, new_room_id? }`
  - `Get` response: use `RoomView` — `seed_reveal` present only when finished, `seed_phrase` never present
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 3.3, 3.4_

- [x] 4.2 Register routes in `backend/services/api/main.go`
  - Add `FairRoomHandler` instantiation and register: `POST /fair-rooms`, `GET /fair-rooms`, `GET /fair-rooms/{id}`, `POST /fair-rooms/{id}/join`, `POST /fair-rooms/{id}/start`
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 5. Write unit tests — `backend/tests/fair_rooms/`
  - Test seed generation: verify `len(seed_hash)==64`, hex chars only, `SHA-256(seed_phrase)==seed_hash` (TC-01, TC-03, TC-19)
  - Test refund calculation: standard case (TC-04), equal deposits (TC-05), one minimum (TC-06)
  - Test auto-scale ratio logic: threshold not met (TC-07), threshold met (TC-08), single room (TC-09)
  - Test up-sell level filtering via `RiskLevelOrder`: low sees all (TC-10), high sees only high (TC-11)
  - _Requirements: 1.1, 3.2, 4.1, 5.1, 5.3_
