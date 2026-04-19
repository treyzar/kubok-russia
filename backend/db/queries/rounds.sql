-- name: ListFinishedRooms :many
SELECT * FROM rooms
WHERE status = 'finished'
ORDER BY created_at DESC;

-- name: GetFinishedRoom :one
SELECT * FROM rooms
WHERE room_id = $1 AND status = 'finished';

-- name: GetRoundPlayers :many
SELECT room_id, user_id, places, joined_at FROM room_players
WHERE room_id = $1
ORDER BY joined_at ASC;

-- name: GetRoundBoosts :many
SELECT room_id, user_id, amount, boosted_at FROM room_boosts
WHERE room_id = $1
ORDER BY boosted_at ASC;

-- name: GetRoundWinner :one
SELECT room_id, user_id, prize, won_at FROM room_winners
WHERE room_id = $1;
