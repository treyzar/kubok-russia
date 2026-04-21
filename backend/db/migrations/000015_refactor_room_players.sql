-- +goose Up
-- +goose StatementBegin

-- Step 1: Add place_id column with a temporary default so existing rows don't violate NOT NULL
ALTER TABLE room_players ADD COLUMN place_id INTEGER NOT NULL DEFAULT 0;

-- Step 2: Migrate existing data — match each room_players row to its room_places row
-- Each player currently has exactly one room_players row; find the first place_index for that player
UPDATE room_players rp
SET place_id = (
    SELECT rpl.place_index
    FROM room_places rpl
    WHERE rpl.room_id = rp.room_id
      AND rpl.user_id = rp.user_id
    ORDER BY rpl.place_index
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM room_places rpl
    WHERE rpl.room_id = rp.room_id AND rpl.user_id = rp.user_id
);

-- Step 3: Drop the old primary key
ALTER TABLE room_players DROP CONSTRAINT room_players_pkey;

-- Step 4: Remove the temporary default
ALTER TABLE room_players ALTER COLUMN place_id DROP DEFAULT;

-- Step 5: Add FK referencing room_places(room_id, place_index)
ALTER TABLE room_players
    ADD CONSTRAINT fk_room_players_place
    FOREIGN KEY (room_id, place_id)
    REFERENCES room_places(room_id, place_index)
    ON DELETE CASCADE;

-- Step 6: Add new composite primary key
ALTER TABLE room_players ADD PRIMARY KEY (room_id, user_id, place_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Step 1: Drop the new primary key
ALTER TABLE room_players DROP CONSTRAINT room_players_pkey;

-- Step 2: Drop the FK constraint
ALTER TABLE room_players DROP CONSTRAINT fk_room_players_place;

-- Step 3: Remove the place_id column
ALTER TABLE room_players DROP COLUMN place_id;

-- Step 4: Restore the original primary key
ALTER TABLE room_players ADD PRIMARY KEY (room_id, user_id);

-- +goose StatementEnd
