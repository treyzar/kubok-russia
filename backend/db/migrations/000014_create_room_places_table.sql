-- +goose Up
-- +goose StatementBegin

-- Create the room_places table
CREATE TABLE IF NOT EXISTS room_places (
    room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, place_index)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_room_places_user_id ON room_places(user_id);
CREATE INDEX idx_room_places_room_user ON room_places(room_id, user_id);

-- Migrate existing data from room_players.places to room_places
-- For each room, assign sequential place_index values starting from 1
WITH room_place_data AS (
    SELECT 
        rp.room_id,
        rp.user_id,
        rp.joined_at,
        rp.places,
        -- Calculate the starting place_index for this user in this room
        (SELECT COALESCE(SUM(places), 0) 
         FROM room_players rp2 
         WHERE rp2.room_id = rp.room_id 
         AND (rp2.user_id < rp.user_id OR (rp2.user_id = rp.user_id AND rp2.joined_at < rp.joined_at))
        ) AS start_index
    FROM room_players rp
    WHERE rp.places IS NOT NULL AND rp.places > 0
)
INSERT INTO room_places (room_id, user_id, place_index, created_at)
SELECT 
    rpd.room_id,
    rpd.user_id,
    rpd.start_index + gs.place_num AS place_index,
    rpd.joined_at
FROM room_place_data rpd
CROSS JOIN LATERAL generate_series(1, rpd.places) AS gs(place_num);

-- Drop the places column from room_players
ALTER TABLE room_players DROP COLUMN IF EXISTS places;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Restore the places column to room_players
ALTER TABLE room_players ADD COLUMN places INTEGER;

-- Migrate data back from room_places to room_players.places
UPDATE room_players rp
SET places = (
    SELECT COUNT(*)
    FROM room_places rpl
    WHERE rpl.room_id = rp.room_id AND rpl.user_id = rp.user_id
);

-- Drop the room_places table
DROP INDEX IF EXISTS idx_room_places_room_user;
DROP INDEX IF EXISTS idx_room_places_user_id;
DROP TABLE IF EXISTS room_places;

-- +goose StatementEnd
