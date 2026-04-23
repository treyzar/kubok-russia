-- +goose Up
-- +goose StatementBegin
ALTER TABLE rooms
ADD COLUMN round_duration_seconds INTEGER NOT NULL DEFAULT 30,
ADD COLUMN start_delay_seconds INTEGER NOT NULL DEFAULT 60,
ADD COLUMN game_type VARCHAR(20) NOT NULL DEFAULT 'train',
ADD CONSTRAINT check_rooms_game_type CHECK (game_type IN ('train', 'fridge')),
ADD CONSTRAINT check_rooms_round_duration CHECK (round_duration_seconds BETWEEN 10 AND 3600),
ADD CONSTRAINT check_rooms_start_delay CHECK (start_delay_seconds BETWEEN 5 AND 600);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE rooms
DROP CONSTRAINT IF EXISTS check_rooms_start_delay,
DROP CONSTRAINT IF EXISTS check_rooms_round_duration,
DROP CONSTRAINT IF EXISTS check_rooms_game_type,
DROP COLUMN IF EXISTS game_type,
DROP COLUMN IF EXISTS start_delay_seconds,
DROP COLUMN IF EXISTS round_duration_seconds;
-- +goose StatementEnd
