-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS rooms (
    room_id SERIAL PRIMARY KEY,
    jackpot DECIMAL(10, 2) NOT NULL DEFAULT 0,
    start_time TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('new', 'starting_soon', 'playing')),
    players_needed INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_players (
    room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    places INTEGER,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_winners (
    room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prize DECIMAL(10, 2) NOT NULL,
    won_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_boosts (
    room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    boosted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_players_user_id ON room_players(user_id);
CREATE INDEX idx_room_winners_user_id ON room_winners(user_id);
CREATE INDEX idx_room_boosts_user_id ON room_boosts(user_id);

ALTER TABLE room_players ADD CONSTRAINT chk_places_not_exceed_needed 
    CHECK (places <= (SELECT players_needed FROM rooms WHERE rooms.room_id = room_players.room_id));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS room_boosts;
DROP TABLE IF EXISTS room_winners;
DROP TABLE IF EXISTS room_players;
DROP TABLE IF EXISTS rooms;
-- +goose StatementEnd
