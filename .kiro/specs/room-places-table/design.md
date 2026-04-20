# Design Document

## Overview

This design transforms the room places system from a simple integer counter to a normalized relational structure. The current `room_players.places` field stores how many places a user occupies as a single nullable integer. The new design creates a `room_places` table where each place is an individual record with a unique `place_index` that starts from 1 for each room.

This change provides better data integrity, enables future features like place-specific metadata, and aligns with relational database best practices by eliminating redundant data storage.

## Architecture

### Database Schema Changes

#### New Table: room_places

```sql
CREATE TABLE room_places (
    room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_index INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, place_index)
);

CREATE INDEX idx_room_places_user_id ON room_places(user_id);
CREATE INDEX idx_room_places_room_user ON room_places(room_id, user_id);
```

#### Modified Table: room_players

The `places` column will be removed:

```sql
ALTER TABLE room_players DROP COLUMN places;
```

### Data Migration Strategy

The migration will follow this sequence:

1. Create the new `room_places` table
2. Migrate existing data from `room_players.places` to `room_places`
3. Drop the `places` column from `room_players`

For data migration, the logic will:
- For each room, track the current maximum `place_index`
- For each `room_player` with a non-null `places` value, insert that many records into `room_places`
- Assign sequential `place_index` values starting from the next available index in that room

Example migration logic:
```sql
-- For each room_player with places, create individual place records
INSERT INTO room_places (room_id, user_id, place_index, created_at)
SELECT 
    rp.room_id,
    rp.user_id,
    -- Generate sequential place_index for each place
    (SELECT COALESCE(MAX(place_index), 0) FROM room_places WHERE room_id = rp.room_id) + 
    generate_series(1, rp.places),
    rp.joined_at
FROM room_players rp
WHERE rp.places IS NOT NULL AND rp.places > 0;
```

## Components and Interfaces

### SQL Queries

#### Modified Queries

1. **JoinRoom / JoinRoomAndUpdateStatus**
   - Remove `places` parameter from INSERT into `room_players`
   - Add logic to insert into `room_places` with sequential `place_index` values
   - Use a CTE to calculate the next available `place_index` for the room

2. **BotJoinRoom**
   - Similar changes as JoinRoom
   - Insert individual `room_places` records based on the places count

3. **GetPlayersWithStakes**
   - Replace `COALESCE(rp.places, 1)` with a COUNT of `room_places` records
   - Join with `room_places` and GROUP BY to count places per user

4. **ListRoomPlayers**
   - Add a LEFT JOIN with `room_places` to count places per user
   - Return the count as a computed field for backward compatibility

#### New Queries

1. **InsertRoomPlace**
   ```sql
   INSERT INTO room_places (room_id, user_id, place_index)
   VALUES ($1, $2, $3)
   RETURNING *;
   ```

2. **GetNextPlaceIndex**
   ```sql
   SELECT COALESCE(MAX(place_index), 0) + 1 AS next_index
   FROM room_places
   WHERE room_id = $1;
   ```

3. **CountUserPlacesInRoom**
   ```sql
   SELECT COUNT(*) FROM room_places
   WHERE room_id = $1 AND user_id = $2;
   ```

4. **ListRoomPlacesByUser**
   ```sql
   SELECT * FROM room_places
   WHERE room_id = $1 AND user_id = $2
   ORDER BY place_index ASC;
   ```

### Go Code Changes

#### Repository Layer (SQLC Generated)

The `RoomPlayer` struct will change:
```go
// Before
type RoomPlayer struct {
    RoomID   int32     `json:"room_id"`
    UserID   int32     `json:"user_id"`
    Places   *int32    `json:"places"`
    JoinedAt time.Time `json:"joined_at"`
}

// After
type RoomPlayer struct {
    RoomID   int32     `json:"room_id"`
    UserID   int32     `json:"user_id"`
    JoinedAt time.Time `json:"joined_at"`
}
```

New struct:
```go
type RoomPlace struct {
    RoomID     int32     `json:"room_id"`
    UserID     int32     `json:"user_id"`
    PlaceIndex int32     `json:"place_index"`
    CreatedAt  time.Time `json:"created_at"`
}
```

#### Handler Layer

**JoinRoom Handler** (`backend/handlers/room_handler.go`):
- Accept `places` parameter in request body
- When inserting, first get the next available `place_index` for the room
- Insert `places` number of records into `room_places` with sequential indices
- Use a transaction to ensure atomicity

**ListRoomPlayers Handler**:
- Modify the query to include a count of places from `room_places`
- Keep the response structure compatible by including a computed `places` field

**LeaveRoom Handler**:
- No code changes required in the handler itself
- The CASCADE delete constraint on the `room_places` table automatically removes all place records when a `room_player` record is deleted
- This simplifies the leave logic and ensures data consistency

**Design Decision**: Using CASCADE delete for place cleanup was chosen because:
- It ensures atomicity - places are always removed when a player leaves
- It reduces code complexity - no need for explicit place deletion logic
- It prevents orphaned records - impossible to have places without a room_player
- It aligns with database best practices for dependent data

**Response DTOs**:
```go
type roomPlayerItem struct {
    RoomID   int32     `json:"room_id"`
    UserID   int32     `json:"user_id"`
    Places   int32     `json:"places"` // Computed from COUNT(room_places)
    JoinedAt time.Time `json:"joined_at"`
}
```

#### Cron Jobs

**bot_manager.go**:
- No changes needed (uses existing join logic)

**room_finisher.go**:
- The `GetPlayersWithStakes` query will be updated to count from `room_places`
- No handler code changes needed

## Data Models

### Entity Relationship

```
rooms (1) ----< (N) room_players (1) ----< (N) room_places
users (1) ----< (N) room_players
users (1) ----< (N) room_places
```

### Constraints

1. **Primary Key**: `(room_id, place_index)` ensures each place index is unique within a room
2. **Foreign Keys**: 
   - `room_id` references `rooms(room_id)` with CASCADE delete
   - `user_id` references `users(id)` with CASCADE delete
3. **Indexes**:
   - `idx_room_places_user_id` for user-based queries
   - `idx_room_places_room_user` for room+user lookups

### Place Index Assignment

Place indices are assigned sequentially starting from 1 for each room:
- When the first player joins with 2 places: indices 1, 2
- When the second player joins with 1 place: index 3
- When the third player joins with 3 places: indices 4, 5, 6

This ensures:
- No gaps in the sequence
- Deterministic ordering
- Easy to calculate the next available index

**Design Decision**: Sequential indexing starting from 1 was chosen over other approaches (like UUID or timestamp-based) because:
- It provides a clear, human-readable ordering of places
- It simplifies debugging and data inspection
- It enables efficient range queries if needed in the future
- It aligns with common database practices for ordered records

The next available index is calculated using:
```sql
SELECT COALESCE(MAX(place_index), 0) + 1 FROM room_places WHERE room_id = $1
```

This query is wrapped in a transaction with the insert operations to prevent race conditions during concurrent joins.

## Error Handling

### Migration Errors

1. **Data Integrity**: If migration fails mid-process, the DOWN migration will restore the original schema
2. **Null Places**: Records with `NULL` or `0` places will be skipped during migration (treated as having no places)
3. **Duplicate Detection**: The migration will check for existing `room_places` records to support idempotent execution
4. **Transaction Safety**: The entire migration runs in a transaction to ensure all-or-nothing execution

**Design Decision**: Treating NULL and 0 places as "no places" was chosen because:
- It aligns with the current system behavior where NULL places defaults to 1 in calculations
- It prevents creating meaningless records in the new table
- It simplifies the migration logic and reduces edge cases

### Application Errors

1. **Concurrent Joins**: Use database transactions to prevent race conditions when assigning place indices
2. **Invalid Place Count**: Validate that `places` parameter is positive before insertion
3. **Room Capacity**: Existing validation logic remains unchanged

### Query Errors

1. **Missing Places**: Queries that count places will return 0 if no `room_places` records exist
2. **Orphaned Records**: CASCADE delete ensures `room_places` are automatically removed when rooms or users are deleted

## Testing Strategy

### Migration Testing

1. **Forward Migration**:
   - Create test data with various `places` values (NULL, 0, 1, multiple)
   - Run migration
   - Verify all places are correctly created in `room_places`
   - Verify `places` column is removed

2. **Backward Migration**:
   - Run forward migration
   - Run backward migration
   - Verify `places` column is restored
   - Verify data integrity

3. **Idempotency**:
   - Run forward migration twice
   - Verify no duplicate records or errors

### Query Testing

1. **Join Room**:
   - Test joining with 1 place
   - Test joining with multiple places
   - Test sequential place_index assignment
   - Test concurrent joins (race conditions)

2. **Leave Room**:
   - Verify CASCADE delete removes all places
   - Test with multiple places

3. **Get Players with Stakes**:
   - Verify correct place counts
   - Verify stake calculations match previous behavior

### Integration Testing

1. **End-to-End Flow**:
   - Create room
   - Multiple users join with varying place counts
   - Verify place indices are sequential
   - Finish room
   - Verify winner selection uses correct stake calculations

2. **Bot Integration**:
   - Verify bots can join with places
   - Verify bot places are counted correctly

3. **API Compatibility**:
   - Verify API responses maintain backward compatibility
   - Verify `places` field is still present in responses (as computed value)

### Performance Testing

1. **Query Performance**:
   - Benchmark queries before and after migration
   - Verify indexes are used effectively
   - Test with large numbers of places per room

2. **Migration Performance**:
   - Test migration with large datasets
   - Measure migration time
   - Verify no locks or blocking issues
