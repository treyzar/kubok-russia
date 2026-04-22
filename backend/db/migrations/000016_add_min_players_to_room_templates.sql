-- +goose Up
-- +goose StatementBegin
ALTER TABLE room_templates
ADD COLUMN min_players INTEGER NOT NULL DEFAULT 1,
ADD CONSTRAINT check_min_players CHECK (min_players >= 1 AND min_players <= players_needed);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE room_templates
DROP CONSTRAINT IF EXISTS check_min_players,
DROP COLUMN IF EXISTS min_players;
-- +goose StatementEnd
