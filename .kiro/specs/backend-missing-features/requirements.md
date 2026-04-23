# Requirements Document

## Introduction

This document specifies the requirements for implementing missing and incomplete features in the OnlineShop lottery room platform backend. The platform currently has a partially implemented system for managing lottery rooms, players, boosts, and provably fair mechanics. Several critical features identified in the backend README need to be completed to meet the project requirements.

## Glossary

- **System**: The OnlineShop lottery room platform backend
- **Room**: A lottery game instance with configurable parameters
- **Player**: A user participating in a room
- **Boost**: An additional payment to increase winning probability
- **WebSocket**: Real-time bidirectional communication protocol
- **Redis**: In-memory data store used for pub/sub messaging
- **RNG**: Random Number Generator service
- **ROI**: Return on Investment
- **HTTP Handler**: Go function that processes HTTP requests

## Requirements

### Requirement 1: Real-Time Event Broadcasting

**User Story:** As a player, I want to receive real-time updates about room changes, so that I can see when other players join, boost, or when the game starts/finishes without refreshing.

#### Acceptance Criteria

1.1 WHEN a Player joins a Room, THE System SHALL publish a "player_joined" event to the Redis pub/sub channel for that Room

1.2 WHEN a Player applies a Boost to a Room, THE System SHALL publish a "boost_applied" event to the Redis pub/sub channel for that Room

1.3 WHEN a Room transitions to "starting_soon" status, THE System SHALL publish a "room_starting" event with countdown timer information to the Redis pub/sub channel

1.4 WHEN a Room transitions to "playing" status, THE System SHALL publish a "game_started" event to the Redis pub/sub channel for that Room

1.5 WHEN a Room transitions to "finished" status, THE System SHALL publish a "game_finished" event with winner information to the Redis pub/sub channel for that Room

1.6 WHERE a Room has status "starting_soon", THE System SHALL include the remaining seconds until start_time in all published events

### Requirement 2: Room Filtering and Sorting

**User Story:** As a player, I want to filter and sort available rooms by entry cost, player count, and status, so that I can quickly find games that match my preferences.

#### Acceptance Criteria

2.1 WHEN a GET request is made to "/rooms" endpoint with query parameter "entry_cost", THE System SHALL return only Rooms where entry_cost matches the specified value

2.2 WHEN a GET request is made to "/rooms" endpoint with query parameter "players_needed", THE System SHALL return only Rooms where players_needed matches the specified value

2.3 WHEN a GET request is made to "/rooms" endpoint with query parameter "status", THE System SHALL return only Rooms where status matches the specified value

2.4 WHEN a GET request is made to "/rooms" endpoint with query parameter "sort_by" set to a valid field name, THE System SHALL sort the returned Rooms by that field

2.5 WHEN a GET request is made to "/rooms" endpoint with query parameter "sort_order" set to "asc" or "desc", THE System SHALL apply ascending or descending sort order respectively

2.6 WHERE multiple filter parameters are provided, THE System SHALL apply all filters using AND logic

### Requirement 3: Room Configuration Validation

**User Story:** As a room creator, I want the system to validate my room configuration for economic viability, so that I can create balanced and attractive games.

#### Acceptance Criteria

3.1 WHEN a POST request is made to "/rooms/validate" endpoint with room configuration, THE System SHALL calculate the expected ROI for players

3.2 WHEN a POST request is made to "/rooms/validate" endpoint with room configuration, THE System SHALL calculate the organizer commission percentage

3.3 IF the calculated player ROI is below 70 percent, THEN THE System SHALL include a warning in the validation response

3.4 IF the calculated organizer commission is below 5 percent, THEN THE System SHALL include a warning in the validation response

3.5 WHEN validation completes, THE System SHALL return a response containing calculated metrics and any warnings

### Requirement 4: Boost Constraint Error Handling

**User Story:** As a player, I want clear error messages when I try to boost a room multiple times, so that I understand why my action failed.

#### Acceptance Criteria

4.1 WHEN a Player attempts to create a second Boost for the same Room, THE System SHALL return HTTP status code 409 Conflict

4.2 WHEN a duplicate Boost attempt is detected, THE System SHALL include an error message stating "You have already boosted this room"

4.3 WHEN a duplicate Boost attempt is detected, THE System SHALL not modify the Player balance or Room jackpot

### Requirement 5: Insufficient Balance Error Handling

**User Story:** As a player, I want clear error messages when I don't have enough balance, so that I know exactly why I cannot join a room or apply a boost.

#### Acceptance Criteria

5.1 WHEN a Player attempts to join a Room with insufficient balance, THE System SHALL return HTTP status code 402 Payment Required

5.2 WHEN a Player attempts to apply a Boost with insufficient balance, THE System SHALL return HTTP status code 402 Payment Required

5.3 WHEN insufficient balance is detected for room entry, THE System SHALL include an error message stating "Insufficient balance for entry"

5.4 WHEN insufficient balance is detected for boost, THE System SHALL include an error message stating "Insufficient balance for boost"

5.5 WHEN insufficient balance is detected, THE System SHALL include the required amount and current balance in the error response

### Requirement 6: Comprehensive Round History

**User Story:** As a player or auditor, I want to view complete round history including all participants, boosts, and balance changes, so that I can verify game fairness and track my performance.

#### Acceptance Criteria

6.1 WHEN a GET request is made to "/rounds/{round_id}" endpoint, THE System SHALL return the Room information including entry_cost and jackpot

6.2 WHEN a GET request is made to "/rounds/{round_id}" endpoint, THE System SHALL return a list of all Players who participated in that round

6.3 WHEN a GET request is made to "/rounds/{round_id}" endpoint, THE System SHALL return all Boosts applied during that round with player and amount information

6.4 WHEN a GET request is made to "/rounds/{round_id}" endpoint, THE System SHALL return the winner information including user_id and prize amount

6.5 WHEN a GET request is made to "/rounds/{round_id}" endpoint, THE System SHALL aggregate data using SQL JOIN operations across room_players, room_boosts, and room_winners tables

### Requirement 7: External Random Number Generator Integration

**User Story:** As a system operator, I want to use an external RNG service for winner selection, so that the randomness is verifiable and trustworthy.

#### Acceptance Criteria

7.1 WHEN the System starts, THE System SHALL read the RNG_URL configuration from environment variables

7.2 WHERE RNG_URL is configured, WHEN selecting a winner, THE System SHALL make an HTTP request to the external RNG service

7.3 WHERE RNG_URL is configured, IF the external RNG request fails, THEN THE System SHALL fall back to the local math/rand implementation

7.4 WHERE RNG_URL is not configured, THE System SHALL use the local math/rand implementation for winner selection

7.5 WHEN using external RNG, THE System SHALL include the room_id and player count in the request parameters

7.6 WHEN using external RNG, THE System SHALL validate that the returned random number is within the expected range before using it
