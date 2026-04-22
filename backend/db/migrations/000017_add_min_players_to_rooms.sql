-- +goose Up
-- +goose StatementBegin
ALTER TABLE rooms
ADD COLUMN min_players INTEGER NOT NULL DEFAULT 1,
ADD CONSTRAINT check_min_players_rooms CHECK (min_players >= 1 AND min_players <= players_needed);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE rooms
DROP CONSTRAINT IF EXISTS check_min_players_rooms,
DROP COLUMN IF EXISTS min_players;
-- +goose StatementEnd
