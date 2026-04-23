-- name: Greet :one
SELECT 'Hello, ' || sqlc.arg(name)::text AS greeting;