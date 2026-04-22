-- Consolidates the 18 goose migrations from backend/db/migrations/.
-- Authoritative schema for the Java port; lossless w.r.t. the Go schema.

-- ── classic users / rooms ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255)   NOT NULL,
    balance     DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_templates (
    template_id             SERIAL PRIMARY KEY,
    name                    VARCHAR(255) UNIQUE NOT NULL,
    players_needed          INTEGER     NOT NULL,
    min_players             INTEGER     NOT NULL DEFAULT 1,
    entry_cost              INTEGER     NOT NULL DEFAULT 100,
    winner_pct              INTEGER     NOT NULL DEFAULT 80,
    round_duration_seconds  INTEGER     NOT NULL DEFAULT 60,
    start_delay_seconds     INTEGER     NOT NULL DEFAULT 30,
    game_type               VARCHAR(32) NOT NULL DEFAULT 'JACKPOT',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    room_id         SERIAL PRIMARY KEY,
    jackpot         DECIMAL(10,2) NOT NULL DEFAULT 0,
    start_time      TIMESTAMP,
    status          VARCHAR(32)   NOT NULL DEFAULT 'NEW',
    players_needed  INTEGER       NOT NULL,
    template_id     INTEGER REFERENCES room_templates(template_id) ON DELETE SET NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rooms_status      ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_template_id ON rooms(template_id);

CREATE TABLE IF NOT EXISTS room_players (
    room_id    INTEGER  NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id    INTEGER  NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    joined_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON room_players(user_id);

CREATE TABLE IF NOT EXISTS room_winners (
    room_id  INTEGER       NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id  INTEGER       NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    prize    DECIMAL(10,2) NOT NULL,
    won_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_winners_user_id ON room_winners(user_id);

CREATE TABLE IF NOT EXISTS room_boosts (
    room_id    INTEGER       NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id    INTEGER       NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    amount     DECIMAL(10,2) NOT NULL,
    boosted_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_boosts_user_id ON room_boosts(user_id);

CREATE TABLE IF NOT EXISTS room_places (
    room_id     INTEGER     NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id     INTEGER     NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    place_index INTEGER     NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, place_index)
);
CREATE INDEX IF NOT EXISTS idx_room_places_user_id   ON room_places(user_id);
CREATE INDEX IF NOT EXISTS idx_room_places_room_user ON room_places(room_id, user_id);

-- ── provably fair rooms ─────────────────────────────────────────────────────
-- Stored as VARCHAR (not Postgres ENUM) so JPA EnumType.STRING binding works
-- without a custom Hibernate user-type. Functionally equivalent to the Go ENUM.

CREATE TABLE IF NOT EXISTS fair_rooms (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_level   VARCHAR(16)   NOT NULL,
    state        VARCHAR(16)   NOT NULL DEFAULT 'CREATED',
    max_capacity INT           NOT NULL DEFAULT 10,
    seed_phrase  TEXT          NOT NULL,
    seed_hash    TEXT          NOT NULL,
    final_fee    NUMERIC(18,8) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fair_rooms_risk_state ON fair_rooms(risk_level, state);

CREATE TABLE IF NOT EXISTS fair_players (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID          NOT NULL REFERENCES fair_rooms(id) ON DELETE CASCADE,
    user_id         UUID          NOT NULL,
    initial_deposit NUMERIC(18,8) NOT NULL,
    refund_amount   NUMERIC(18,8) NOT NULL DEFAULT 0,
    refunded        BOOLEAN       NOT NULL DEFAULT FALSE,
    UNIQUE(room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_fair_players_room ON fair_players(room_id);
