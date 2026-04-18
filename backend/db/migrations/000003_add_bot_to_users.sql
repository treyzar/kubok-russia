-- +goose Up
-- +goose StatementBegin
ALTER TABLE users ADD COLUMN bot BOOLEAN NOT NULL DEFAULT FALSE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN bot;
-- +goose StatementEnd
