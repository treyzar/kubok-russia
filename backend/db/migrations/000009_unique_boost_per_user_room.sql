-- +goose Up
-- The room_boosts table already has PRIMARY KEY (room_id, user_id) which enforces uniqueness.
-- This migration is a no-op confirming that constraint exists.
SELECT 1;

-- +goose Down
SELECT 1;
