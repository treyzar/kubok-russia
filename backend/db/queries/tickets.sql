-- name: GetTicketByID :one
SELECT id, description, status, created_at
FROM tickets
WHERE id = $1;

-- name: ListTickets :many
SELECT id, description, status, created_at
FROM tickets
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;
