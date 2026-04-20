# Implementation Plan

- [x] 1. Create database migration for room_places table
  - Create new migration file that adds the room_places table with proper schema
  - Add composite primary key on (room_id, place_index)
  - Add foreign key constraints with CASCADE delete to rooms and users tables
  - Add indexes for user_id and (room_id, user_id) lookups
  - Migrate existing data from room_players.places to room_places with sequential place_index assignment
  - Drop the places column from room_players table
  - Include rollback logic in DOWN migration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Update SQL queries to work with room_places table
  - [x] 2.1 Create new queries for room_places operations
    - Write InsertRoomPlace query to insert individual place records
    - Write GetNextPlaceIndex query to calculate next available place_index for a room
    - Write CountUserPlacesInRoom query to count places for a user in a room
    - Write ListRoomPlacesByUser query to list all places for a user in a room
    - _Requirements: 3.1, 3.3_

  - [x] 2.2 Update JoinRoom and JoinRoomAndUpdateStatus queries
    - Remove places parameter from INSERT into room_players
    - Modify queries to work without the places field
    - _Requirements: 3.1, 3.3_

  - [x] 2.3 Update BotJoinRoom query
    - Remove places parameter from INSERT into room_players
    - Modify query to work without the places field
    - _Requirements: 3.1, 3.3_

  - [x] 2.4 Update GetPlayersWithStakes query
    - Replace COALESCE(rp.places, 1) with COUNT from room_places table
    - Add LEFT JOIN with room_places and GROUP BY to aggregate place counts
    - Ensure stake calculations remain correct
    - _Requirements: 3.2, 3.5_

  - [x] 2.5 Update ListRoomPlayers query
    - Add LEFT JOIN with room_places to count places per user
    - Return place count as a computed field for backward compatibility
    - _Requirements: 3.2_

- [x] 3. Regenerate Go code with SQLC
  - Run sqlc generate to create updated repository code
  - Verify RoomPlayer struct no longer has Places field
  - Verify new RoomPlace struct is generated with correct fields
  - Verify all query functions compile without errors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Update room handler to use room_places table
  - [x] 4.1 Update JoinRoom handler logic
    - Accept places parameter from request body
    - Get next available place_index for the room using GetNextPlaceIndex
    - Insert places number of records into room_places with sequential indices
    - Wrap operations in a transaction for atomicity
    - _Requirements: 5.1_

  - [x] 4.2 Update ListRoomPlayers handler response
    - Ensure response includes computed places field from COUNT query
    - Maintain backward compatibility with existing API contract
    - _Requirements: 5.5_

  - [x] 4.3 Verify LeaveRoom handler
    - Confirm CASCADE delete automatically removes room_places records
    - No code changes needed, just verification
    - _Requirements: 5.2_

- [x] 5. Update bot manager to use room_places table
  - Modify bot join logic to create individual room_places records
  - Use the same place insertion logic as regular users
  - Ensure bots can join with multiple places
  - _Requirements: 5.4_

- [x] 6. Run and verify migration
  - Apply the migration to a test database
  - Verify existing data is correctly migrated to room_places
  - Verify places column is removed from room_players
  - Test rollback migration to ensure it restores original schema
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Integration verification
  - [x] 7.1 Test room join flow with multiple places
    - Create a room and join with 1 place
    - Join with multiple places and verify sequential place_index assignment
    - Verify place counts are correct in API responses
    - _Requirements: 3.3, 5.1_

  - [x] 7.2 Test room leave flow
    - Join a room with multiple places
    - Leave the room and verify all place records are deleted via CASCADE
    - _Requirements: 5.2_

  - [x] 7.3 Test stake calculations
    - Join room with varying place counts
    - Add boosts
    - Verify GetPlayersWithStakes returns correct stake values
    - Verify winner selection uses correct probabilities
    - _Requirements: 3.5, 5.3_

  - [x] 7.4 Test bot integration
    - Verify bots can join rooms with places
    - Verify bot places are counted correctly in stake calculations
    - _Requirements: 5.4_
