-- name: InsertRoom :one
INSERT INTO rooms (jackpot, start_time, status, players_needed, entry_cost, winner_pct, round_duration_seconds, start_delay_seconds, game_type, min_players, template_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

-- name: GetRoom :one
SELECT * FROM rooms WHERE room_id = $1;

-- name: GetRoomWinner :one
SELECT * FROM room_winners WHERE room_id = $1 AND user_id = $2;

-- name: JoinRoom :one
-- TEMPORARILY DISABLED DUE TO SQLC LIMITATION
-- WITH room_info AS (
--     SELECT r.entry_cost, r.status, r.players_needed FROM rooms r WHERE r.room_id = $1
-- ),
-- user_balance AS (
--     SELECT balance FROM users WHERE users.id = $2
-- ),
-- current_player_count AS (
--     SELECT COUNT(DISTINCT user_id) as count FROM room_players WHERE room_id = $1
-- ),
-- can_join AS (
--     SELECT 1
--     WHERE (SELECT balance FROM user_balance) >= (SELECT entry_cost FROM room_info LIMIT 1) * $3
--       AND NOT EXISTS (SELECT 1 FROM room_players WHERE room_players.room_id = $1 AND room_players.user_id = $2)
--       AND (SELECT status FROM room_info) IN ('new', 'starting_soon')
--       AND (SELECT count FROM current_player_count) < (SELECT players_needed FROM room_info)
-- ),
-- balance_update AS (
--     UPDATE users u
--     SET balance = u.balance - (SELECT entry_cost FROM room_info LIMIT 1) * $3
--     WHERE u.id = $2 AND EXISTS (SELECT 1 FROM can_join)
--     RETURNING u.id
-- ),
-- jackpot_update AS (
--     UPDATE rooms r
--     SET jackpot = r.jackpot + (SELECT entry_cost FROM room_info LIMIT 1) * $3, updated_at = CURRENT_TIMESTAMP
--     WHERE r.room_id = $1 AND EXISTS (SELECT 1 FROM can_join)
--     RETURNING r.*
-- )
SELECT false AS joined;

-- name: CountRoomPlayers :one
SELECT COUNT(DISTINCT user_id) FROM room_players
WHERE room_id = $1;

-- name: CountRealPlayersInRoom :one
SELECT COUNT(DISTINCT rp.user_id) FROM room_players rp
JOIN users u ON u.id = rp.user_id
WHERE rp.room_id = $1 AND u.bot = false;

-- name: JoinRoomAndUpdateStatus :one
-- TEMPORARILY DISABLED DUE TO SQLC LIMITATION
-- WITH room_info AS (
--     SELECT r.entry_cost, r.status, r.players_needed, r.start_delay_seconds FROM rooms r WHERE r.room_id = $1
-- ),
-- user_balance AS (
--     SELECT balance FROM users WHERE users.id = $2
-- ),
-- current_player_count AS (
--     SELECT COUNT(DISTINCT user_id) as count FROM room_players WHERE room_id = $1
-- ),
-- can_join AS (
--     SELECT 1
--     WHERE (SELECT balance FROM user_balance) >= (SELECT entry_cost FROM room_info LIMIT 1) * $3
--       AND NOT EXISTS (SELECT 1 FROM room_players WHERE room_players.room_id = $1 AND room_players.user_id = $2)
--       AND (SELECT status FROM room_info) IN ('new', 'starting_soon')
--       AND (SELECT count FROM current_player_count) < (SELECT players_needed FROM room_info)
-- ),
-- balance_update AS (
--     UPDATE users u
--     SET balance = u.balance - (SELECT entry_cost FROM room_info LIMIT 1) * $3
--     WHERE u.id = $2 AND EXISTS (SELECT 1 FROM can_join)
--     RETURNING u.id
-- )
-- UPDATE rooms r
-- SET status = CASE 
--     WHEN (SELECT status FROM room_info) = 'new' AND EXISTS (SELECT 1 FROM can_join) THEN 'starting_soon'
--     ELSE r.status
-- END,
-- start_time = CASE
--     WHEN (SELECT status FROM room_info) = 'new' AND (SELECT count FROM current_player_count) = 0 AND EXISTS (SELECT 1 FROM can_join) THEN CURRENT_TIMESTAMP + (SELECT start_delay_seconds FROM room_info) * INTERVAL '1 second'
--     ELSE r.start_time
-- END,
-- jackpot = CASE
--     WHEN EXISTS (SELECT 1 FROM can_join) THEN r.jackpot + (SELECT entry_cost FROM room_info LIMIT 1) * $3
--     ELSE r.jackpot
-- END,
-- updated_at = CURRENT_TIMESTAMP
-- WHERE r.room_id = $1
-- RETURNING r.*;
SELECT * FROM rooms WHERE room_id = $1;

-- name: LeaveRoom :one
WITH room_info AS (
    SELECT entry_cost, status FROM rooms WHERE rooms.room_id = $1
),
player_places AS (
    SELECT COUNT(place_id) AS place_count FROM room_players
    WHERE room_players.room_id = $1 AND room_players.user_id = $2
),
deleted AS (
    DELETE FROM room_players
    WHERE room_players.room_id = $1 AND room_players.user_id = $2
      AND (SELECT status FROM room_info) IN ('new', 'starting_soon')
    RETURNING room_id, user_id, joined_at
),
balance_refund AS (
    UPDATE users
    SET balance = users.balance + (SELECT entry_cost FROM room_info) * (SELECT place_count FROM player_places)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM deleted)
    RETURNING users.id
),
jackpot_update AS (
    UPDATE rooms
    SET jackpot = GREATEST(jackpot - (SELECT entry_cost FROM room_info) * (SELECT place_count FROM player_places), 0), updated_at = CURRENT_TIMESTAMP
    WHERE rooms.room_id = $1 AND EXISTS (SELECT 1 FROM deleted)
    RETURNING *
)
SELECT * FROM deleted;

-- name: LeaveRoomAndUpdateStatus :one
WITH room_info AS (
    SELECT entry_cost, status FROM rooms WHERE rooms.room_id = $1
),
player_places AS (
    SELECT COUNT(place_id) AS place_count FROM room_players
    WHERE room_players.room_id = $1 AND room_players.user_id = $2
),
deleted_players AS (
    DELETE FROM room_players
    WHERE room_players.room_id = $1 AND room_players.user_id = $2
      AND (SELECT status FROM room_info) IN ('new', 'starting_soon')
    RETURNING room_id, user_id, joined_at
),
deleted_places AS (
    DELETE FROM room_places
    WHERE room_places.room_id = $1 AND room_places.user_id = $2
      AND EXISTS (SELECT 1 FROM deleted_players)
    RETURNING room_id
),
balance_refund AS (
    UPDATE users
    SET balance = users.balance + (SELECT entry_cost FROM room_info) * (SELECT place_count FROM player_places)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM deleted_players)
    RETURNING users.id
),
player_count AS (
    SELECT COUNT(DISTINCT user_id) as count FROM room_players WHERE room_players.room_id = $1
)
UPDATE rooms
SET status = CASE 
    WHEN (SELECT status FROM room_info) IN ('new', 'starting_soon') AND (SELECT count FROM player_count) = 0 THEN 'new'
    ELSE status
END,
jackpot = CASE
    WHEN EXISTS (SELECT 1 FROM deleted_players) THEN GREATEST(jackpot - (SELECT entry_cost FROM room_info) * (SELECT place_count FROM player_places), 0)
    ELSE jackpot
END,
updated_at = CURRENT_TIMESTAMP
WHERE rooms.room_id = $1
RETURNING *;

-- name: ListRoomPlayers :many
SELECT 
    rp.room_id,
    rp.user_id,
    MIN(rp.joined_at)::TIMESTAMPTZ AS joined_at,
    COUNT(rp.place_id) AS places
FROM room_players rp
WHERE rp.room_id = $1
GROUP BY rp.room_id, rp.user_id
ORDER BY MIN(rp.joined_at) ASC;

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
    SELECT COUNT(DISTINCT user_id) as count FROM room_players WHERE room_id = $1
),
can_join AS (
    SELECT 1
    WHERE (SELECT balance FROM user_info) >= (SELECT entry_cost FROM room_info)
      AND (SELECT bot FROM user_info) = true
      AND NOT EXISTS (SELECT 1 FROM room_players WHERE room_players.room_id = $1 AND room_players.user_id = $2)
      AND (SELECT status FROM room_info) IN ('new', 'starting_soon', 'playing')
      AND (SELECT count FROM current_player_count) < (SELECT players_needed FROM room_info)
),
balance_update AS (
    UPDATE users
    SET balance = users.balance - (SELECT entry_cost FROM room_info)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM can_join)
    RETURNING users.id
),
jackpot_update AS (
    UPDATE rooms
    SET jackpot = jackpot + (SELECT entry_cost FROM room_info), updated_at = CURRENT_TIMESTAMP
    WHERE rooms.room_id = $1 AND EXISTS (SELECT 1 FROM can_join)
    RETURNING *
)
SELECT EXISTS (SELECT 1 FROM can_join) AS joined;

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

-- name: ListPlayingRoomsReadyToFinish :many
SELECT * FROM rooms
WHERE status = 'playing'
  AND start_time IS NOT NULL
  AND start_time + (round_duration_seconds * INTERVAL '1 second') <= CURRENT_TIMESTAMP;

-- name: GetPlayersWithStakes :many
SELECT
    rp.user_id,
    COUNT(rp.place_id)::INTEGER AS places,
    COUNT(rp.place_id) * r.entry_cost AS stake,
    COALESCE(rb.amount, 0) AS boost_amount,
    COUNT(rp.place_id) * r.entry_cost + COALESCE(rb.amount, 0) AS total_stake
FROM room_players rp
JOIN rooms r ON r.room_id = rp.room_id
LEFT JOIN room_boosts rb ON rb.room_id = rp.room_id AND rb.user_id = rp.user_id
WHERE rp.room_id = $1
GROUP BY rp.user_id, r.entry_cost, rb.amount;

-- name: FinishRoomAndAwardWinner :one
WITH finish_room AS (
    UPDATE rooms
    SET status = 'finished', updated_at = CURRENT_TIMESTAMP
    WHERE rooms.room_id = $1 AND rooms.status = 'playing'
    RETURNING jackpot
),
award_winner AS (
    UPDATE users
    SET balance = users.balance + ($2 * 80 / 100)
    WHERE users.id = $3 AND EXISTS (SELECT 1 FROM finish_room)
    RETURNING users.id
),
insert_win AS (
    INSERT INTO room_winners (room_id, user_id, prize)
    SELECT $1, $3, ($2 * 80 / 100)
    WHERE EXISTS (SELECT 1 FROM finish_room)
    RETURNING room_id, user_id, prize, won_at
)
SELECT * FROM insert_win;

-- name: ListRoomsFiltered :many
SELECT * FROM rooms
WHERE ($1::varchar = '' OR status = $1)
  AND ($2::integer = 0 OR entry_cost = $2)
  AND ($3::integer = 0 OR players_needed = $3)
ORDER BY
  CASE WHEN $4 = 'entry_cost'     AND $5 = 'asc'  THEN entry_cost     END ASC,
  CASE WHEN $4 = 'entry_cost'     AND $5 = 'desc' THEN entry_cost     END DESC,
  CASE WHEN $4 = 'jackpot'        AND $5 = 'asc'  THEN jackpot        END ASC,
  CASE WHEN $4 = 'jackpot'        AND $5 = 'desc' THEN jackpot        END DESC,
  CASE WHEN $4 = 'players_needed' AND $5 = 'asc'  THEN players_needed END ASC,
  CASE WHEN $4 = 'players_needed' AND $5 = 'desc' THEN players_needed END DESC,
  created_at DESC;

-- name: FinishRoomAndAwardWinnerPct :one
WITH finish_room AS (
    UPDATE rooms
    SET status = 'finished', updated_at = CURRENT_TIMESTAMP
    WHERE rooms.room_id = $1 AND rooms.status = 'playing'
    RETURNING jackpot, winner_pct
),
prize AS (
    SELECT (jackpot * winner_pct / 100) AS amount FROM finish_room
),
award_winner AS (
    UPDATE users
    SET balance = users.balance + (SELECT amount FROM prize)
    WHERE users.id = $2 AND EXISTS (SELECT 1 FROM finish_room)
    RETURNING users.id
),
insert_win AS (
    INSERT INTO room_winners (room_id, user_id, prize)
    SELECT $1, $2, (SELECT amount FROM prize)
    WHERE EXISTS (SELECT 1 FROM finish_room)
    RETURNING room_id, user_id, prize, won_at
)
SELECT * FROM insert_win;

-- name: InsertRoomPlace :one
INSERT INTO room_places (room_id, user_id, place_index)
VALUES ($1, $2, $3)
RETURNING *;

-- name: InsertRoomPlayer :one
INSERT INTO room_players (room_id, user_id, place_id, joined_at)
VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
RETURNING *;

-- name: GetNextPlaceIndex :one
SELECT COALESCE(MAX(place_index), 0) + 1 AS next_index
FROM room_places
WHERE room_id = $1;

-- name: CountUserPlacesInRoom :one
SELECT COUNT(*) FROM room_places
WHERE room_id = $1 AND user_id = $2;

-- name: ListRoomPlacesByUser :many
SELECT * FROM room_places
WHERE room_id = $1 AND user_id = $2
ORDER BY place_index ASC;
