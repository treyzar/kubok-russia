-- +goose Up
-- +goose StatementBegin
CREATE TYPE fair_risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE fair_room_state  AS ENUM ('created', 'waiting', 'refunding', 'finished');

CREATE TABLE fair_rooms (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_level   fair_risk_level NOT NULL,
    state        fair_room_state NOT NULL DEFAULT 'created',
    max_capacity INT           NOT NULL DEFAULT 10,
    seed_phrase  TEXT          NOT NULL,
    seed_hash    TEXT          NOT NULL,
    final_fee    NUMERIC(18,8) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE fair_players (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID          NOT NULL REFERENCES fair_rooms(id) ON DELETE CASCADE,
    user_id         UUID          NOT NULL,
    initial_deposit NUMERIC(18,8) NOT NULL,
    refund_amount   NUMERIC(18,8) NOT NULL DEFAULT 0,
    refunded        BOOLEAN       NOT NULL DEFAULT FALSE,
    UNIQUE(room_id, user_id)
);

CREATE INDEX idx_fair_rooms_risk_state ON fair_rooms(risk_level, state);
CREATE INDEX idx_fair_players_room     ON fair_players(room_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS fair_players;
DROP TABLE IF EXISTS fair_rooms;
DROP TYPE IF EXISTS fair_room_state;
DROP TYPE IF EXISTS fair_risk_level;
-- +goose StatementEnd
