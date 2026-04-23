# Implementation Plan

- [x] 1. Create Event Publisher Service
  - Create `internal/events/publisher.go` with EventPublisher struct and RoomEvent types
  - Implement PublishPlayerJoined, PublishBoostApplied, PublishRoomStarting, PublishGameStarted, PublishGameFinished methods
  - Add error logging for failed publish operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Integrate Event Publishing into Room Handlers
- [x] 2.1 Add event publishing to JoinRoom handler
  - Inject EventPublisher into RoomHandler struct
  - Call PublishPlayerJoined after successful JoinRoomAndUpdateStatus
  - Include countdown_seconds in event data when status is "starting_soon"
  - _Requirements: 1.1, 1.6_

- [x] 2.2 Add event publishing to BoostRoom handler
  - Call PublishBoostApplied after successful InsertRoomBoost
  - _Requirements: 1.2_

- [x] 3. Integrate Event Publishing into Room Manager Crons
- [x] 3.1 Add event publishing to RoomStarter
  - Inject EventPublisher into RoomStarter function
  - Publish "room_starting" event when room transitions to starting_soon
  - Publish "game_started" event when room transitions to playing
  - _Requirements: 1.3, 1.4_

- [x] 3.2 Enhance RoomFinisher event publishing
  - Update existing publishRoomSnapshot call to use new PublishGameFinished method
  - Include winner_id and prize in event data
  - _Requirements: 1.5_

- [x] 4. Verify Room Filtering Implementation
- [x] 4.1 Review ListRoomsFiltered SQL query
  - Verify query in `db/queries/rooms.sql` handles empty filters correctly
  - Verify sort_by field validation prevents SQL injection
  - Run sqlc generate if query needs updates
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4.2 Verify ListRooms handler implementation
  - Confirm handler in `handlers/room_handler.go` properly maps query parameters
  - Test with various filter combinations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Enhance Room Configuration Validation
- [x] 5.1 Create economic validator service
  - Create `internal/validator/economic.go` with EconomicValidator struct
  - Implement ValidateRoomConfig method with all validation rules
  - Calculate player win probability (1 / players_needed)
  - Add warnings for low ROI, low margin, extreme winner_pct, low win probability
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.2 Enhance Validate handler
  - Inject EconomicValidator into RoomHandler
  - Update Validate method to use EconomicValidator
  - Add player win probability to response
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Improve Boost Constraint Error Handling
  - Update BoostRoom handler error message to "You have already boosted this room"
  - Ensure both pre-check and DB constraint violation return same message
  - Verify HTTP 409 status code is returned
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Enhance Insufficient Balance Error Handling
- [x] 7.1 Create InsufficientBalanceError type
  - Define struct with message, required, current_balance, shortfall fields
  - _Requirements: 5.5_

- [x] 7.2 Update JoinRoom balance error
  - Replace generic error with detailed InsufficientBalanceError
  - Include required amount, current balance, and shortfall
  - Ensure HTTP 402 status code with message "Insufficient balance for entry"
  - _Requirements: 5.1, 5.3, 5.5_

- [x] 7.3 Update BoostRoom balance error
  - Replace generic error with detailed InsufficientBalanceError
  - Include required amount, current balance, and shortfall
  - Ensure HTTP 402 status code with message "Insufficient balance for boost"
  - _Requirements: 5.2, 5.4, 5.5_

- [x] 8. Implement Comprehensive Round History
- [x] 8.1 Create GetRoundDetails SQL query
  - Add query to `db/queries/rounds.sql` with LEFT JOINs
  - Aggregate players, boosts, and winner data using json_agg
  - Include room_places count for each player
  - Run sqlc generate to create Go code
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.2 Create GetRoundDetails handler
  - Add GetRoundDetailsRequest and GetRoundDetailsResponse types to `handlers/round_handler.go`
  - Implement handler method that calls repository query
  - Parse JSON aggregated data into structured response
  - Register route in `services/api/main.go`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Implement External RNG Integration
- [x] 9.1 Create RNG client service
  - Create `internal/rng/client.go` with RNGClient struct
  - Implement NewRNGClient constructor that reads RNG_URL from config
  - Implement SelectRandom method with external call and fallback
  - Implement callExternalRNG with context, timeout, and parameter passing
  - Implement fallbackRandom using math/rand
  - Add request parameters: max, room_id, player_count
  - Validate response is in range [0, max)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 9.2 Integrate RNG client into RoomFinisher
  - Refactor selectWinner function to use RNGClient
  - Pass RNGClient instance to RoomFinisher cron
  - Remove duplicate callExternalRNG code from room_finisher.go
  - Add logging for RNG source (external vs fallback)
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 9.3 Add RNG_URL configuration
  - Add RNG_URL field to AppConfig struct in `internal/config.go`
  - Document RNG_URL in backend README configuration section
  - _Requirements: 7.1_

- [x] 10. Update API Service Main
- [x] 10.1 Initialize EventPublisher
  - Create EventPublisher instance in services/api/main.go
  - Inject into RoomHandler constructor
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 10.2 Initialize EconomicValidator
  - Create EconomicValidator instance in services/api/main.go
  - Inject into RoomHandler constructor
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 10.3 Register new round history endpoint
  - Register GET /rounds/{room_id}/details route
  - Map to GetRoundDetails handler
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Update Room Manager Service
- [x] 11.1 Initialize EventPublisher for crons
  - Create EventPublisher instance in services/room_manager/main.go
  - Pass to RoomStarter and RoomFinisher functions
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 11.2 Initialize RNG client
  - Create RNGClient instance in services/room_manager/main.go
  - Pass to RoomFinisher function
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Create Integration Tests
- [x] 12.1 Add event publishing tests
  - Create test script in tests/websocket/ to verify events
  - Test player_joined, boost_applied, room_starting, game_started, game_finished events
  - Verify countdown_seconds in room_starting events
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 12.2 Add room filtering tests
  - Extend tests/api/run.sh with filtering test cases
  - Test each filter parameter individually
  - Test combined filters
  - Test sorting by different fields
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 12.3 Add validation tests
  - Add test cases for room configuration validation
  - Verify warnings are generated correctly
  - Test edge cases (zero values, extreme percentages)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 12.4 Add error handling tests
  - Test insufficient balance for join and boost
  - Test duplicate boost attempt
  - Verify error response structure and status codes
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12.5 Add round history tests
  - Create complete round with players, boosts, and winner
  - Call GetRoundDetails endpoint
  - Verify all data is returned correctly
  - Test with missing data (no boosts, no winner)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 12.6 Add RNG integration tests
  - Create mock RNG service for testing
  - Test successful external RNG call
  - Test fallback on timeout
  - Test fallback on invalid response
  - Verify range validation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
