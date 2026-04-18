-- name: InsertRoom :one
INSERT INTO rooms (jackpot, start_time, status, players_needed)
VALUES ($1, $2, $3, $4)
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

-- name: LeaveRoom :exec
DELETE FROM room_players
WHERE room_id = $1 AND user_id = $2;

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
INSERT INTO room_boosts (room_id, user_id, amount)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListRoomBoosts :many
SELECT * FROM room_boosts
WHERE room_id = $1
ORDER BY boosted_at DESC;
