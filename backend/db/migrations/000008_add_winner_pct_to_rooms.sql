-- +goose Up
-- +goose StatementBegin
ALTER TABLE rooms ADD COLUMN winner_pct INTEGER NOT NULL DEFAULT 80 CHECK (winner_pct BETWEEN 1 AND 99);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE rooms DROP COLUMN winner_pct;
-- +goose StatementEnd
