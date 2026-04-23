-- +goose Up
-- +goose StatementBegin
ALTER TABLE rooms ALTER COLUMN start_time TYPE TIMESTAMPTZ;
ALTER TABLE rooms ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE rooms ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

ALTER TABLE room_players ALTER COLUMN joined_at TYPE TIMESTAMPTZ;
ALTER TABLE room_winners ALTER COLUMN won_at TYPE TIMESTAMPTZ;
ALTER TABLE room_boosts ALTER COLUMN boosted_at TYPE TIMESTAMPTZ;

ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE rooms ALTER COLUMN start_time TYPE TIMESTAMP;
ALTER TABLE rooms ALTER COLUMN created_at TYPE TIMESTAMP;
ALTER TABLE rooms ALTER COLUMN updated_at TYPE TIMESTAMP;

ALTER TABLE room_players ALTER COLUMN joined_at TYPE TIMESTAMP;
ALTER TABLE room_winners ALTER COLUMN won_at TYPE TIMESTAMP;
ALTER TABLE room_boosts ALTER COLUMN boosted_at TYPE TIMESTAMP;

ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMP;
-- +goose StatementEnd
