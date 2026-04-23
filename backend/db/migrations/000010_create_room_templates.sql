-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS room_templates (
    template_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    players_needed INTEGER NOT NULL,
    entry_cost INTEGER NOT NULL DEFAULT 100,
    winner_pct INTEGER NOT NULL DEFAULT 80,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS room_templates;
-- +goose StatementEnd
