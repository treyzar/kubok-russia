-- name: GetHistoricalMetrics :one
WITH completed_rooms AS (
    SELECT 
        r.room_id,
        r.entry_cost,
        COUNT(DISTINCT rp.user_id) FILTER (WHERE u.bot = false) AS real_players
    FROM rooms r
    LEFT JOIN room_players rp ON r.room_id = rp.room_id
    LEFT JOIN users u ON rp.user_id = u.id
    WHERE r.status = 'finished'
      AND r.created_at >= $1
    GROUP BY r.room_id, r.entry_cost
)
SELECT 
    COALESCE(AVG(real_players), 0)::FLOAT AS avg_real_players_per_room,
    COALESCE(AVG(entry_cost), 0)::FLOAT AS avg_entry_cost,
    COUNT(*)::BIGINT AS total_completed_rooms
FROM completed_rooms;

-- name: CheckDuplicateTemplate :one
SELECT EXISTS (
    SELECT 1 
    FROM room_templates
    WHERE players_needed = $1
      AND min_players = $2
      AND entry_cost = $3
      AND winner_pct = $4
      AND game_type = $5
) AS duplicate_exists;

-- name: GetTemplateRoomStatus :one
SELECT 
    COUNT(*) FILTER (WHERE status = 'playing')::INTEGER AS active_rooms,
    COUNT(*) FILTER (WHERE status IN ('new', 'starting_soon'))::INTEGER AS waiting_rooms
FROM rooms
WHERE template_id = $1;

-- name: GetTemplateStatistics :one
WITH template_rooms AS (
    SELECT r.room_id
    FROM rooms r
    WHERE r.template_id = $1
      AND r.status = 'finished'
      AND r.created_at >= $2
      AND r.created_at <= $3
)
SELECT 
    COUNT(DISTINCT tr.room_id)::INTEGER AS completed_rooms,
    COUNT(DISTINCT rp.user_id) FILTER (WHERE u.bot = false)::INTEGER AS total_real_players,
    COUNT(DISTINCT rp.user_id) FILTER (WHERE u.bot = true)::INTEGER AS total_bots,
    COALESCE(
        COUNT(DISTINCT rp.user_id) FILTER (WHERE u.bot = false)::FLOAT / 
        NULLIF(COUNT(DISTINCT tr.room_id), 0), 
        0
    )::FLOAT AS avg_real_players_per_room
FROM template_rooms tr
LEFT JOIN room_players rp ON tr.room_id = rp.room_id
LEFT JOIN users u ON rp.user_id = u.id;


-- name: GetWinnerStatistics :one
SELECT 
    COUNT(*) FILTER (WHERE u.bot = false)::INTEGER AS real_player_wins,
    COUNT(*) FILTER (WHERE u.bot = true)::INTEGER AS bot_wins
FROM room_winners rw
INNER JOIN users u ON rw.user_id = u.id
INNER JOIN rooms r ON rw.room_id = r.room_id
WHERE r.template_id = $1
  AND rw.won_at >= $2
  AND rw.won_at <= $3;


-- name: GetBoostStatistics :one
WITH boost_data AS (
    SELECT 
        SUM(rb.amount)::BIGINT AS total_boost_amount,
        COUNT(DISTINCT rb.user_id)::INTEGER AS total_players,
        COUNT(DISTINCT rb.room_id)::INTEGER AS total_rooms
    FROM room_boosts rb
    INNER JOIN rooms r ON rb.room_id = r.room_id
    WHERE r.template_id = $1
      AND rb.boosted_at >= $2
      AND rb.boosted_at <= $3
)
SELECT 
    COALESCE(total_boost_amount, 0)::BIGINT AS total_boost_amount,
    COALESCE(total_boost_amount::FLOAT / NULLIF(total_players, 0), 0)::FLOAT AS avg_boost_per_player,
    COALESCE(total_boost_amount::FLOAT / NULLIF(total_rooms, 0), 0)::FLOAT AS avg_boost_per_room
FROM boost_data;


-- name: GetPlaceStatistics :one
WITH place_data AS (
    SELECT 
        COUNT(*)::INTEGER AS total_places,
        COUNT(DISTINCT rpl.user_id)::INTEGER AS total_players
    FROM room_places rpl
    INNER JOIN rooms r ON rpl.room_id = r.room_id
    WHERE r.template_id = $1
      AND rpl.created_at >= $2
      AND rpl.created_at <= $3
)
SELECT 
    COALESCE(total_places::FLOAT / NULLIF(total_players, 0), 0)::FLOAT AS avg_places_per_player
FROM place_data;

-- name: DeleteRoomsByTemplate :exec
DELETE FROM rooms
WHERE template_id = $1
  AND status IN ('finished', 'new');

-- name: GetRoomsByTemplate :many
SELECT * FROM rooms
WHERE template_id = $1;
