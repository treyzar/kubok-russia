# Requirements Document

## Introduction

This feature extends the room template system to support configurable game settings that control room lifecycle timing, winner payouts, and game categorization. Currently, several critical settings are hardcoded in the application (round duration at 30 seconds, start delay at 1 minute), limiting the flexibility of room configurations. This feature will move these settings into the template configuration, allowing administrators to create diverse game types with different timing characteristics and payout structures.

## Glossary

- **Room Template System**: The database-backed configuration system that defines reusable room configurations including player capacity, entry costs, and game rules
- **Round Duration**: The time interval in seconds from when a room enters "playing" status until the winner is declared
- **Start Delay**: The time interval in seconds from when the first player joins a room until the room automatically transitions to "playing" status
- **Win Percent**: The percentage of the total jackpot awarded to the winner (remainder goes to the organizer)
- **Game Type**: An enumerated categorical identifier that classifies rooms by their gameplay characteristics with predefined values: "train", "fridge"
- **Entry Cost**: The amount of currency deducted from a player's balance when joining a room
- **Room Finisher Cron**: The background process that monitors playing rooms and declares winners when the round duration expires
- **Room Starter Cron**: The background process that monitors starting_soon rooms and transitions them to playing status when the start delay expires

## Requirements

### Requirement 1

**User Story:** As a game administrator, I want to configure round duration in room templates, so that I can create games with different time limits

#### Acceptance Criteria

1. WHEN creating a room template, THE Room Template System SHALL accept a round_duration_seconds parameter with integer values between 10 and 3600
2. WHEN updating a room template, THE Room Template System SHALL accept a round_duration_seconds parameter with integer values between 10 and 3600
3. WHEN a room is created from a template, THE Room Template System SHALL copy the round_duration_seconds value to the room record
4. WHEN the Room Finisher Cron evaluates a playing room, THE Room Finisher Cron SHALL use the room's round_duration_seconds value to determine if the round has expired
5. WHERE round_duration_seconds is not provided during template creation, THE Room Template System SHALL default to 30 seconds

### Requirement 2

**User Story:** As a game administrator, I want to configure start delay in room templates, so that players have appropriate time to join before the game begins

#### Acceptance Criteria

1. WHEN creating a room template, THE Room Template System SHALL accept a start_delay_seconds parameter with integer values between 5 and 600
2. WHEN updating a room template, THE Room Template System SHALL accept a start_delay_seconds parameter with integer values between 5 and 600
3. WHEN a room is created from a template, THE Room Template System SHALL copy the start_delay_seconds value to the room record
4. WHEN the first player joins a room, THE Room Starter Cron SHALL set the start_time to current timestamp plus the room's start_delay_seconds value
5. WHERE start_delay_seconds is not provided during template creation, THE Room Template System SHALL default to 60 seconds

### Requirement 3

**User Story:** As a game administrator, I want to verify that win percent is properly configured in templates, so that winner payouts are calculated correctly

#### Acceptance Criteria

1. THE Room Template System SHALL store winner_pct values in room templates with integer values between 1 and 99
2. WHEN a room is created from a template, THE Room Template System SHALL copy the winner_pct value to the room record
3. WHEN the Room Finisher Cron awards a prize, THE Room Finisher Cron SHALL calculate the prize as jackpot multiplied by winner_pct divided by 100
4. THE Room Template System SHALL default winner_pct to 80 when not explicitly provided

### Requirement 4

**User Story:** As a game administrator, I want to categorize room templates by game type, so that players can filter and find games that match their preferences

#### Acceptance Criteria

1. WHEN creating a room template, THE Room Template System SHALL accept a game_type parameter with values from the enumeration: "train", "fridge"
2. WHEN updating a room template, THE Room Template System SHALL accept a game_type parameter with values from the enumeration: "train", "fridge"
3. WHEN creating or updating a room template with an invalid game_type value, THE Room Template System SHALL reject the request with a validation error
4. WHEN listing room templates, THE Room Template System SHALL include the game_type field in the response
5. WHERE game_type is not provided during template creation, THE Room Template System SHALL default to "train"

### Requirement 5

**User Story:** As a game administrator, I want to verify that entry cost is properly multiplied when players join with multiple places, so that the jackpot reflects the correct total stake

#### Acceptance Criteria

1. WHEN a player joins a room with a places value, THE Room Template System SHALL deduct entry_cost multiplied by places from the player's balance
2. WHEN a player joins a room with a places value, THE Room Template System SHALL add entry_cost multiplied by places to the room's jackpot
3. WHEN a player joins a room without specifying places, THE Room Template System SHALL treat places as 1 for cost calculations
4. THE Room Template System SHALL reject join attempts where the player's balance is less than entry_cost multiplied by places

### Requirement 6

**User Story:** As a game administrator, I want to create rooms from templates with all configured settings, so that rooms inherit the complete template configuration

#### Acceptance Criteria

1. WHEN creating a room from a template, THE Room Template System SHALL copy all template fields including round_duration_seconds, start_delay_seconds, winner_pct, game_type, entry_cost, and players_needed to the room record
2. THE Room Template System SHALL validate that all copied values meet the same constraints as the template fields
3. WHEN a template is updated, THE Room Template System SHALL not modify existing rooms created from that template
