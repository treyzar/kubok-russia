-- name: InsertRoom :one
INSERT INTO rooms (jackpot, start_time, status, players_needed, entry_cost)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: DeleteRoom :exec
DELETE FROM rooms WHERE room_id = $1;

-- name: AddMoneyToJackpot :one
UPDATE rooms
SET jackpot = jackpot + $2, updated_at = CURRENT_TIMESTAMP
WHERE room_id = $1
RETURNING *;

-- name: SetRoomStatus :one
UPDATE rooms
SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE room_id = $1
RETURNING *;

-- name: ListRooms :many
SELECT * FROM rooms
ORDER BY created_at DESC;

-- name: JoinRoom :one
INSERT INTO room_players (room_id, user_id, places)
VALUES ($1, $2, $3)
RETURNING *;

-- name: CountRoomPlayers :one
SELECT COUNT(*) FROM room_players
WHERE room_id = $1;

-- name: JoinRoomAndUpdateStatus :one
WITH room_info AS (
    SELECT entry_cost FROM rooms WHERE rooms.room_id = $1
),
user_balance AS (
    SELECT balance FROM users WHERE users.id = $2
),
inserted AS (
    INSERT INTO room_players (room_id, user_id, places)
    SELECT $1, $2, $3
    WHERE (SELECT balance FROM user_balance) >= (SELECT entry_cost FROM room_info)
    RETURNING room_id, user_id, places, joined_at
),
balance_update AS (
    UPDATE users
    SET balance = balance - (SELECT entry_cost FROM room_info)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM inserted)
    RETURNING users.id
),
player_count AS (
    SELECT COUNT(*) as count FROM room_players WHERE room_players.room_id = $1
)
UPDATE rooms
SET status = CASE 
    WHEN (SELECT count FROM player_count) > 0 THEN 'starting_soon'
    ELSE status
END,
start_time = CASE
    WHEN (SELECT count FROM player_count) = 1 THEN CURRENT_TIMESTAMP + INTERVAL '1 minute'
    ELSE start_time
END,
jackpot = CASE
    WHEN EXISTS (SELECT 1 FROM inserted) THEN jackpot + (SELECT entry_cost FROM room_info)
    ELSE jackpot
END,
updated_at = CURRENT_TIMESTAMP
WHERE rooms.room_id = $1
RETURNING *;

-- name: LeaveRoom :exec
DELETE FROM room_players
WHERE room_id = $1 AND user_id = $2;

-- name: LeaveRoomAndUpdateStatus :one
WITH deleted AS (
    DELETE FROM room_players
    WHERE room_players.room_id = $1 AND room_players.user_id = $2
    RETURNING room_id, user_id, places, joined_at
),
player_count AS (
    SELECT COUNT(*) as count FROM room_players WHERE room_players.room_id = $1
)
UPDATE rooms
SET status = CASE 
    WHEN (SELECT count FROM player_count) = 0 THEN 'waiting'
    ELSE status
END,
updated_at = CURRENT_TIMESTAMP
WHERE rooms.room_id = $1
RETURNING *;

-- name: ListRoomPlayers :many
SELECT * FROM room_players
WHERE room_id = $1
ORDER BY joined_at ASC;

-- name: InsertRoomWin :one
INSERT INTO room_winners (room_id, user_id, prize)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListRoomWins :many
SELECT * FROM room_winners
WHERE room_id = $1
ORDER BY won_at DESC;

-- name: InsertRoomBoost :one
WITH room_status AS (
    SELECT status FROM rooms WHERE rooms.room_id = $1
),
user_balance AS (
    SELECT balance FROM users WHERE users.id = $2
),
inserted AS (
    INSERT INTO room_boosts (room_id, user_id, amount)
    SELECT $1, $2, $3
    WHERE (SELECT status FROM room_status) = 'playing'
      AND (SELECT balance FROM user_balance) >= $3
    RETURNING room_id, user_id, amount, boosted_at
),
balance_update AS (
    UPDATE users
    SET balance = balance - $3
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM inserted)
    RETURNING users.id
),
jackpot_update AS (
    UPDATE rooms
    SET jackpot = jackpot + $3, updated_at = CURRENT_TIMESTAMP
    WHERE rooms.room_id = $1 AND EXISTS (SELECT 1 FROM inserted)
    RETURNING *
)
SELECT * FROM inserted;

-- name: ListRoomBoosts :many
SELECT * FROM room_boosts
WHERE room_id = $1
ORDER BY boosted_at DESC;
