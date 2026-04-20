# Requirements Document

## Introduction

This feature transforms the room places system from a simple integer field in the `room_players` table to a dedicated `room_places` table with individual place records. Currently, the `places` field in `room_players` stores the count of places a user occupies. The new design will create individual place records, each with a unique index (starting from 1) per room, establishing a one-to-many relationship between `room_players` and `room_places`.

## Glossary

- **Room**: A game session where players compete for a jackpot
- **Room Player**: A user who has joined a specific room
- **Place**: An individual slot or position that a player occupies in a room
- **Place Index**: A sequential number (starting from 1) that uniquely identifies a place within a room
- **Room Places Table**: The new database table that stores individual place records
- **Database System**: The PostgreSQL database that stores all application data
- **Migration System**: The goose migration tool used to manage database schema changes
- **SQLC**: The code generation tool that generates Go code from SQL queries

## Requirements

### Requirement 1

**User Story:** As a backend developer, I want to create a new `room_places` table with proper relationships, so that each place a player occupies is stored as an individual record with a unique index per room.

#### Acceptance Criteria

1. THE Database System SHALL create a table named `room_places` with columns for room_id, user_id, place_index, and created_at
2. THE Database System SHALL enforce that place_index values start from 1 and increment sequentially within each room
3. THE Database System SHALL establish a foreign key relationship from `room_places.room_id` to `rooms.room_id` with CASCADE delete
4. THE Database System SHALL establish a foreign key relationship from `room_places.user_id` to `users.id` with CASCADE delete
5. THE Database System SHALL enforce a composite primary key on (room_id, place_index) to ensure uniqueness

### Requirement 2

**User Story:** As a backend developer, I want to migrate existing place data from the `room_players.places` field to the new `room_places` table, so that no data is lost during the schema transition.

#### Acceptance Criteria

1. WHEN the migration executes, THE Migration System SHALL read all existing `room_players` records with non-null `places` values
2. FOR each room_player record, THE Migration System SHALL create the corresponding number of `room_places` records with sequential place_index values
3. THE Migration System SHALL assign place_index values starting from the next available index for each room to avoid conflicts
4. AFTER successful data migration, THE Migration System SHALL remove the `places` column from the `room_players` table
5. IF the migration fails, THEN THE Migration System SHALL rollback all changes to preserve data integrity

### Requirement 3

**User Story:** As a backend developer, I want to update all SQL queries that reference the `places` field, so that they work correctly with the new `room_places` table structure.

#### Acceptance Criteria

1. THE Database System SHALL replace queries that insert into `room_players.places` with queries that insert into `room_places`
2. THE Database System SHALL replace queries that read `room_players.places` with queries that count records in `room_places`
3. WHEN joining a room with multiple places, THE Database System SHALL insert multiple `room_places` records with sequential place_index values
4. WHEN leaving a room, THE Database System SHALL delete all associated `room_places` records through CASCADE delete
5. THE Database System SHALL update the `GetPlayersWithStakes` query to count places from the `room_places` table instead of reading the `places` field

### Requirement 4

**User Story:** As a backend developer, I want the generated Go models and query functions to reflect the new schema, so that the application code can interact with the `room_places` table correctly.

#### Acceptance Criteria

1. WHEN SQLC regenerates code, THE SQLC SHALL create a `RoomPlace` struct with fields for RoomID, UserID, PlaceIndex, and CreatedAt
2. THE SQLC SHALL remove the `Places` field from the `RoomPlayer` struct
3. THE SQLC SHALL generate query functions for inserting, selecting, and counting `room_places` records
4. THE SQLC SHALL generate query functions that join `room_players` with `room_places` for aggregate operations
5. THE SQLC SHALL ensure all generated code compiles without errors

### Requirement 5

**User Story:** As a backend developer, I want to update application handlers and services that use the places field, so that they correctly interact with the new `room_places` table.

#### Acceptance Criteria

1. THE Application SHALL update room join logic to create individual `room_places` records instead of setting a `places` count
2. THE Application SHALL update room leave logic to rely on CASCADE delete for removing `room_places` records
3. THE Application SHALL update stake calculation logic to count `room_places` records instead of reading a `places` field
4. THE Application SHALL update bot join logic to create individual `room_places` records
5. THE Application SHALL update any response models or DTOs that expose place information to clients
