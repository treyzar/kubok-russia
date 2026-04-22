-- Java/Spring Boot baseline schema. Equivalent to the Go backend after applying
-- goose migrations 1..18 (verified column-for-column against backend/db/migrations).
-- All money fields are INTEGER (game currency, no decimals); fair_* tables keep
-- NUMERIC(18,8) for deposit precision.

-- =================================================================
-- USERS  (mig 001 + 003 + 006 + 007)
-- =================================================================
CREATE TABLE users (
    id          SERIAL      PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    balance     INTEGER     NOT NULL DEFAULT 0,
    bot         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_bot_balance ON users(bot, balance);

-- =================================================================
-- ROOMS  (mig 002 + 004 + 005 + 006 + 007 + 008 + 013 + 017 + 018)
-- =================================================================
CREATE TABLE rooms (
    room_id                SERIAL      PRIMARY KEY,
    jackpot                INTEGER     NOT NULL DEFAULT 0,
    status                 VARCHAR(20) NOT NULL DEFAULT 'new',
    players_needed         INTEGER     NOT NULL,
    start_time             TIMESTAMPTZ NULL,
    entry_cost             INTEGER     NOT NULL DEFAULT 100,
    winner_pct             INTEGER     NOT NULL DEFAULT 80,
    round_duration_seconds INTEGER     NOT NULL DEFAULT 30,
    start_delay_seconds    INTEGER     NOT NULL DEFAULT 60,
    game_type              VARCHAR(20) NOT NULL DEFAULT 'train',
    min_players            INTEGER     NOT NULL DEFAULT 1,
    template_id            INTEGER     NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT rooms_status_check       CHECK (status IN ('new','starting_soon','playing','finished')),
    CONSTRAINT rooms_winner_pct_check   CHECK (winner_pct BETWEEN 1 AND 99),
    CONSTRAINT check_rooms_game_type    CHECK (game_type IN ('train','fridge')),
    CONSTRAINT check_rooms_round_duration CHECK (round_duration_seconds BETWEEN 10 AND 3600),
    CONSTRAINT check_rooms_start_delay  CHECK (start_delay_seconds BETWEEN 5 AND 600),
    CONSTRAINT check_min_players_rooms  CHECK (min_players >= 1 AND min_players <= players_needed)
);
CREATE INDEX idx_rooms_status     ON rooms(status);
CREATE INDEX idx_rooms_template   ON rooms(template_id);

-- =================================================================
-- ROOM_PLACES (mig 014) — must exist before room_players FK
-- =================================================================
CREATE TABLE room_places (
    room_id     INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    place_index INTEGER NOT NULL,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (room_id, place_index)
);
CREATE INDEX idx_room_places_user ON room_places(user_id);

-- =================================================================
-- ROOM_PLAYERS (mig 002 + 014 + 015)
-- =================================================================
CREATE TABLE room_players (
    room_id   INTEGER     NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id   INTEGER     NOT NULL REFERENCES users(id),
    place_id  INTEGER     NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id, place_id),
    CONSTRAINT fk_room_players_place
        FOREIGN KEY (room_id, place_id)
        REFERENCES room_places(room_id, place_index)
        ON DELETE CASCADE
);

-- =================================================================
-- ROOM_WINNERS (mig 002 + 006 + 007)
-- =================================================================
CREATE TABLE room_winners (
    room_id INTEGER     NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id INTEGER     NOT NULL REFERENCES users(id),
    prize   INTEGER     NOT NULL,
    won_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- =================================================================
-- ROOM_BOOSTS (mig 002 + 006 + 007 + 009)
-- =================================================================
CREATE TABLE room_boosts (
    room_id    INTEGER     NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id    INTEGER     NOT NULL REFERENCES users(id),
    amount     INTEGER     NOT NULL,
    boosted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- =================================================================
-- ROOM_TEMPLATES (mig 010 + 012 + 016)
-- =================================================================
CREATE TABLE room_templates (
    template_id            SERIAL      PRIMARY KEY,
    name                   VARCHAR(255) NOT NULL,
    players_needed         INTEGER     NOT NULL,
    min_players            INTEGER     NOT NULL DEFAULT 1,
    entry_cost             INTEGER     NOT NULL,
    winner_pct             INTEGER     NOT NULL DEFAULT 80,
    round_duration_seconds INTEGER     NOT NULL DEFAULT 30,
    start_delay_seconds    INTEGER     NOT NULL DEFAULT 60,
    game_type              VARCHAR(20) NOT NULL DEFAULT 'train',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_game_type        CHECK (game_type IN ('train','fridge')),
    CONSTRAINT check_round_duration   CHECK (round_duration_seconds BETWEEN 10 AND 3600),
    CONSTRAINT check_start_delay      CHECK (start_delay_seconds BETWEEN 5 AND 600),
    CONSTRAINT check_template_winner_pct CHECK (winner_pct BETWEEN 1 AND 99),
    CONSTRAINT check_min_players      CHECK (min_players >= 1 AND min_players <= players_needed)
);

-- =================================================================
-- FAIR ROOMS  (mig 011)
-- =================================================================
CREATE TABLE fair_rooms (
    id           UUID         PRIMARY KEY,
    risk_level   VARCHAR(20)  NOT NULL,
    state        VARCHAR(20)  NOT NULL DEFAULT 'created',
    max_capacity INTEGER      NOT NULL DEFAULT 10,
    seed_phrase  TEXT         NOT NULL,
    seed_hash    TEXT         NOT NULL,
    final_fee    NUMERIC(18,8) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT check_risk_level CHECK (risk_level IN ('low','medium','high')),
    CONSTRAINT check_state      CHECK (state IN ('created','waiting','refunding','finished'))
);
CREATE INDEX idx_fair_rooms_state_risk ON fair_rooms(state, risk_level);

CREATE TABLE fair_players (
    id              UUID         PRIMARY KEY,
    room_id         UUID         NOT NULL REFERENCES fair_rooms(id) ON DELETE CASCADE,
    user_id         UUID         NOT NULL,
    initial_deposit NUMERIC(18,8) NOT NULL,
    refund_amount   NUMERIC(18,8) NOT NULL DEFAULT 0,
    refunded        BOOLEAN      NOT NULL DEFAULT FALSE,
    joined_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, user_id)
);
CREATE INDEX idx_fair_players_room ON fair_players(room_id);
