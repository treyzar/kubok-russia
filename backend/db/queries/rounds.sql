-- name: ListFinishedRooms :many
SELECT * FROM rooms
WHERE status = 'finished'
ORDER BY created_at DESC;

-- name: GetFinishedRoom :one
SELECT * FROM rooms
WHERE room_id = $1 AND status = 'finished';

-- name: GetRoundPlayers :many
SELECT 
    rp.room_id, 
    rp.user_id, 
    COUNT(rpl.place_index)::INTEGER AS places, 
    rp.joined_at 
FROM room_players rp
LEFT JOIN room_places rpl ON rp.room_id = rpl.room_id AND rp.user_id = rpl.user_id
WHERE rp.room_id = $1
GROUP BY rp.room_id, rp.user_id, rp.joined_at
ORDER BY rp.joined_at ASC;

-- name: GetRoundBoosts :many
SELECT room_id, user_id, amount, boosted_at FROM room_boosts
WHERE room_id = $1
ORDER BY boosted_at ASC;

-- name: GetRoundWinner :one
SELECT room_id, user_id, prize, won_at FROM room_winners
WHERE room_id = $1;
