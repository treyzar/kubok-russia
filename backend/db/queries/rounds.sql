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
    COUNT(rp.place_id)::INTEGER AS places, 
    MIN(rp.joined_at) AS joined_at
FROM room_players rp
WHERE rp.room_id = $1
GROUP BY rp.room_id, rp.user_id
ORDER BY MIN(rp.joined_at) ASC;

-- name: GetRoundBoosts :many
SELECT room_id, user_id, amount, boosted_at FROM room_boosts
WHERE room_id = $1
ORDER BY boosted_at ASC;

-- name: GetRoundWinner :one
SELECT room_id, user_id, prize, won_at FROM room_winners
WHERE room_id = $1;

-- name: GetRoundDetails :one
SELECT
    r.room_id,
    r.jackpot,
    r.entry_cost,
    r.winner_pct,
    r.players_needed,
    r.status,
    r.created_at,
    r.start_time,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'user_id', rp.user_id,
                'places', (SELECT COUNT(rp2.place_id)::INTEGER FROM room_players rp2 WHERE rp2.room_id = r.room_id AND rp2.user_id = rp.user_id),
                'joined_at', rp.joined_at
            )
        ) FILTER (WHERE rp.user_id IS NOT NULL),
        '[]'
    ) AS players,
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'user_id', rb.user_id,
                'amount', rb.amount,
                'boosted_at', rb.boosted_at
            )
        ) FILTER (WHERE rb.user_id IS NOT NULL),
        '[]'
    ) AS boosts,
    CASE WHEN rw.user_id IS NOT NULL THEN
        jsonb_build_object(
            'user_id', rw.user_id,
            'prize', rw.prize,
            'won_at', rw.won_at
        )
    ELSE NULL END AS winner
FROM rooms r
LEFT JOIN room_players rp ON r.room_id = rp.room_id
LEFT JOIN room_boosts rb ON r.room_id = rb.room_id
LEFT JOIN room_winners rw ON r.room_id = rw.room_id
WHERE r.room_id = $1
GROUP BY r.room_id, rw.user_id, rw.prize, rw.won_at;
