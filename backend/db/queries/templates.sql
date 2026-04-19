-- name: InsertTemplate :one
INSERT INTO room_templates (name, players_needed, entry_cost, winner_pct)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListTemplates :many
SELECT * FROM room_templates
ORDER BY created_at DESC;

-- name: GetTemplate :one
SELECT * FROM room_templates
WHERE template_id = $1;

-- name: UpdateTemplate :one
UPDATE room_templates
SET name = $2,
    players_needed = $3,
    entry_cost = $4,
    winner_pct = $5,
    updated_at = CURRENT_TIMESTAMP
WHERE template_id = $1
RETURNING *;

-- name: DeleteTemplate :exec
DELETE FROM room_templates
WHERE template_id = $1;
