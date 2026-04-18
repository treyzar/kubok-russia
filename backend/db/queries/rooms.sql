-- name: InsertRoom :one
INSERT INTO rooms (jackpot, start_time, status, players_needed, entry_cost)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: DeleteRoom :exec
DELETE FROM rooms WHERE room_id = $1;

-- name: AddMoneyToJackpot :one
WITH user_balance AS (
    SELECT balance FROM users WHERE users.id = $3
),
balance_update AS (
    UPDATE users
    SET balance = users.balance - $2
    WHERE users.id = $3 AND (SELECT balance FROM user_balance) >= $2
    RETURNING users.id
)
UPDATE rooms
SET jackpot = jackpot + $2, updated_at = CURRENT_TIMESTAMP
WHERE room_id = $1 AND EXISTS (SELECT 1 FROM balance_update)
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
WITH room_info AS (
    SELECT entry_cost, status, players_needed FROM rooms WHERE rooms.room_id = $1
),
user_balance AS (
    SELECT balance FROM users WHERE users.id = $2
),
current_player_count AS (
    SELECT COUNT(*) as count FROM room_players WHERE room_id = $1
),
inserted AS (
    INSERT INTO room_players (room_id, user_id, places)
    SELECT $1, $2, $3
    WHERE (SELECT balance FROM user_balance) >= (SELECT entry_cost FROM room_info)
      AND NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = $1 AND user_id = $2)
      AND (SELECT status FROM room_info) IN ('new', 'starting_soon')
      AND (SELECT count FROM current_player_count) < (SELECT players_needed FROM room_info)
    RETURNING room_id, user_id, places, joined_at
),
balance_update AS (
    UPDATE users
    SET balance = users.balance - (SELECT entry_cost FROM room_info)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM inserted)
    RETURNING users.id
),
jackpot_update AS (
    UPDATE rooms
    SET jackpot = jackpot + (SELECT entry_cost FROM room_info), updated_at = CURRENT_TIMESTAMP
    WHERE rooms.room_id = $1 AND EXISTS (SELECT 1 FROM inserted)
    RETURNING *
)
SELECT * FROM inserted;

-- name: CountRoomPlayers :one
SELECT COUNT(*) FROM room_players
WHERE room_id = $1;

-- name: JoinRoomAndUpdateStatus :one
WITH room_info AS (
    SELECT entry_cost, status, players_needed FROM rooms WHERE rooms.room_id = $1
),
user_balance AS (
    SELECT balance FROM users WHERE users.id = $2
),
current_player_count AS (
    SELECT COUNT(*) as count FROM room_players WHERE room_id = $1
),
inserted AS (
    INSERT INTO room_players (room_id, user_id, places)
    SELECT $1, $2, $3
    WHERE (SELECT balance FROM user_balance) >= (SELECT entry_cost FROM room_info)
      AND NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = $1 AND user_id = $2)
      AND (SELECT status FROM room_info) IN ('new', 'starting_soon')
      AND (SELECT count FROM current_player_count) < (SELECT players_needed FROM room_info)
    RETURNING room_id, user_id, places, joined_at
),
balance_update AS (
    UPDATE users
    SET balance = users.balance - (SELECT entry_cost FROM room_info)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM inserted)
    RETURNING users.id
),
player_count AS (
    SELECT COUNT(*) as count FROM room_players WHERE room_players.room_id = $1
)
UPDATE rooms
SET status = CASE 
    WHEN (SELECT status FROM room_info) = 'new' AND (SELECT count FROM player_count) > 0 THEN 'starting_soon'
    ELSE status
END,
start_time = CASE
    WHEN (SELECT status FROM room_info) = 'new' AND (SELECT count FROM player_count) = 1 THEN CURRENT_TIMESTAMP + INTERVAL '1 minute'
    ELSE start_time
END,
jackpot = CASE
    WHEN EXISTS (SELECT 1 FROM inserted) THEN jackpot + (SELECT entry_cost FROM room_info)
    ELSE jackpot
END,
updated_at = CURRENT_TIMESTAMP
WHERE rooms.room_id = $1
RETURNING *;

-- name: LeaveRoom :one
WITH room_info AS (
    SELECT entry_cost, status FROM rooms WHERE rooms.room_id = $1
),
deleted AS (
    DELETE FROM room_players
    WHERE room_id = $1 AND user_id = $2
      AND (SELECT status FROM room_info) IN ('new', 'starting_soon')
    RETURNING room_id, user_id, places, joined_at
),
balance_refund AS (
    UPDATE users
    SET balance = users.balance + (SELECT entry_cost FROM room_info)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM deleted)
    RETURNING users.id
),
jackpot_update AS (
    UPDATE rooms
    SET jackpot = GREATEST(jackpot - (SELECT entry_cost FROM room_info), 0), updated_at = CURRENT_TIMESTAMP
    WHERE rooms.room_id = $1 AND EXISTS (SELECT 1 FROM deleted)
    RETURNING *
)
SELECT * FROM deleted;

-- name: LeaveRoomAndUpdateStatus :one
WITH room_info AS (
    SELECT entry_cost, status FROM rooms WHERE rooms.room_id = $1
),
deleted AS (
    DELETE FROM room_players
    WHERE room_players.room_id = $1 AND room_players.user_id = $2
      AND (SELECT status FROM room_info) IN ('new', 'starting_soon')
    RETURNING room_id, user_id, places, joined_at
),
balance_refund AS (
    UPDATE users
    SET balance = users.balance + (SELECT entry_cost FROM room_info)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM deleted)
    RETURNING users.id
),
player_count AS (
    SELECT COUNT(*) as count FROM room_players WHERE room_players.room_id = $1
)
UPDATE rooms
SET status = CASE 
    WHEN (SELECT status FROM room_info) IN ('new', 'starting_soon') AND (SELECT count FROM player_count) = 0 THEN 'new'
    ELSE status
END,
jackpot = CASE
    WHEN EXISTS (SELECT 1 FROM deleted) THEN GREATEST(jackpot - (SELECT entry_cost FROM room_info), 0)
    ELSE jackpot
END,
updated_at = CURRENT_TIMESTAMP
WHERE rooms.room_id = $1
RETURNING *;

-- name: ListRoomPlayers :many
SELECT * FROM room_players
WHERE room_id = $1
ORDER BY joined_at ASC;

-- name: InsertRoomWin :one
WITH room_info AS (
    SELECT status, jackpot FROM rooms WHERE rooms.room_id = $1
),
player_check AS (
    SELECT 1 FROM room_players WHERE room_players.room_id = $1 AND room_players.user_id = $2
),
inserted AS (
    INSERT INTO room_winners (room_id, user_id, prize)
    SELECT $1, $2, $3
    WHERE (SELECT status FROM room_info) = 'finished'
      AND EXISTS (SELECT 1 FROM player_check)
      AND $3 > 0
      AND $3 <= (SELECT jackpot FROM room_info)
    RETURNING room_id, user_id, prize, won_at
)
SELECT * FROM inserted;

-- name: ListRoomWins :many
SELECT * FROM room_winners
WHERE room_id = $1
ORDER BY won_at DESC;

-- name: InsertRoomBoost :one
WITH room_status AS (
    SELECT status FROM rooms WHERE rooms.room_id = $1
),
user_balance_check AS (
    SELECT balance FROM users WHERE users.id = $2
),
inserted AS (
    INSERT INTO room_boosts (room_id, user_id, amount)
    SELECT $1, $2, $3
    WHERE (SELECT status FROM room_status) = 'playing'
      AND (SELECT balance FROM user_balance_check) >= $3
      AND $3 > 0
    RETURNING room_id, user_id, amount, boosted_at
),
balance_update AS (
    UPDATE users
    SET balance = users.balance - $3
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

-- name: BotJoinRoom :one
WITH room_info AS (
    SELECT entry_cost, status, players_needed FROM rooms WHERE rooms.room_id = $1
),
user_info AS (
    SELECT balance, bot FROM users WHERE users.id = $2
),
current_player_count AS (
    SELECT COUNT(*) as count FROM room_players WHERE room_id = $1
),
inserted AS (
    INSERT INTO room_players (room_id, user_id, places)
    SELECT $1, $2, $3
    WHERE (SELECT balance FROM user_info) >= (SELECT entry_cost FROM room_info)
      AND (SELECT bot FROM user_info) = true
      AND NOT EXISTS (SELECT 1 FROM room_players WHERE room_id = $1 AND user_id = $2)
      AND (SELECT status FROM room_info) IN ('new', 'starting_soon', 'playing')
      AND (SELECT count FROM current_player_count) < (SELECT players_needed FROM room_info)
    RETURNING room_id, user_id, places, joined_at
),
balance_update AS (
    UPDATE users
    SET balance = users.balance - (SELECT entry_cost FROM room_info)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM inserted)
    RETURNING users.id
),
jackpot_update AS (
    UPDATE rooms
    SET jackpot = jackpot + (SELECT entry_cost FROM room_info), updated_at = CURRENT_TIMESTAMP
    WHERE rooms.room_id = $1 AND EXISTS (SELECT 1 FROM inserted)
    RETURNING *
)
SELECT * FROM inserted;

-- name: GetBotsWithMinBalance :many
SELECT id, name, balance FROM users
WHERE bot = true AND balance >= $1
ORDER BY RANDOM()
LIMIT $2;

-- name: GetAvailableBotsForRoom :many
SELECT u.id, u.name, u.balance FROM users u
WHERE u.bot = true 
  AND u.balance >= $1
  AND NOT EXISTS (
    SELECT 1 FROM room_players rp WHERE rp.user_id = u.id AND rp.room_id = $2
  )
ORDER BY RANDOM()
LIMIT $3;
