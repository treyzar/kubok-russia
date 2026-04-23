-- +goose Up
-- +goose StatementBegin
ALTER TABLE rooms ADD COLUMN entry_cost DECIMAL(10, 2) NOT NULL DEFAULT 100;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE rooms DROP COLUMN entry_cost;
-- +goose StatementEnd
