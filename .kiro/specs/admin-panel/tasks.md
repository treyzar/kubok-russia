# Implementation Plan

- [x] 1. Add database schema for template tracking
  - Create migration to add template_id column to rooms table with foreign key reference
  - Add index on template_id for query performance
  - Update room creation logic to store template_id when rooms are created from templates
  - _Requirements: 1.1, 3.1, 4.1_

- [x] 2. Implement historical metrics queries
  - [x] 2.1 Create admin.sql query file with GetHistoricalMetrics query
    - Calculate average real players per room from past week
    - Calculate average entry cost from past week
    - Count total completed rooms from past week
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Add CheckDuplicateTemplate query
    - Query to find templates with matching parameters (players_needed, min_players, entry_cost, winner_pct, game_type)
    - _Requirements: 2.8_

  - [x] 2.3 Add GetTemplateRoomStatus query
    - Count rooms by status for a given template_id
    - Separate counts for active (playing) and waiting (new, starting_soon) rooms
    - _Requirements: 3.1, 4.1_

  - [x] 2.4 Generate sqlc code for new queries
    - Run sqlc generate to create Go code from SQL queries
    - _Requirements: 2.1-2.8_

- [x] 3. Implement template statistics queries
  - [x] 3.1 Create GetTemplateStatistics query
    - Count completed rooms for template with time filter
    - Count total real players and bots across rooms
    - Calculate average real players per room
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_

  - [x] 3.2 Create GetWinnerStatistics query
    - Count games won by real players vs bots for a template
    - Join room_winners with users table to check bot flag
    - Apply time filter on won_at timestamp
    - _Requirements: 6.5, 6.6_

  - [x] 3.3 Create GetBoostStatistics query
    - Calculate total boost amount for template rooms
    - Calculate average boost per player
    - Calculate average boost per room
    - Apply time filter on boosted_at timestamp
    - _Requirements: 6.7, 6.8, 6.9_

  - [x] 3.4 Create GetPlaceStatistics query
    - Calculate average number of places selected per player
    - Count places from room_places table grouped by template
    - Apply time filter on created_at timestamp
    - _Requirements: 6.10_

  - [x] 3.5 Generate sqlc code for statistics queries
    - Run sqlc generate to create Go code
    - _Requirements: 5.1-5.6, 6.1-6.10_

- [x] 4. Implement AdminStatsService
  - [x] 4.1 Create admin_stats_service.go with service struct
    - Define AdminStatsService with repo and pool fields
    - Define HistoricalMetrics, TemplateStats, and TimeFilter types
    - _Requirements: 2.1-2.8, 5.1-5.6, 6.1-6.10_

  - [x] 4.2 Implement GetHistoricalMetrics method
    - Call GetHistoricalMetrics query with time calculation (now - 7 days)
    - Return structured metrics for validation logic
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 4.3 Implement ValidateTemplate method
    - Check max players = 1 warning
    - Check min/max players against historical averages
    - Check entry cost against historical average (1.75x and 0.5x thresholds)
    - Check winner_pct thresholds (>80 and <50)
    - Return array of Warning structs with field, message, and severity
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 4.4 Implement CheckDuplicateTemplate method
    - Call CheckDuplicateTemplate query with all template parameters
    - Return boolean indicating if duplicate exists
    - _Requirements: 2.8_

  - [x] 4.5 Implement GetTemplateStatistics method
    - Parse TimeFilter to calculate start/end timestamps
    - Call all statistics queries (GetTemplateStatistics, GetWinnerStatistics, GetBoostStatistics, GetPlaceStatistics)
    - Aggregate results into TemplateStats struct
    - Handle division by zero for averages
    - _Requirements: 5.1-5.6, 6.1-6.10, 7.1-7.3_

  - [x] 4.6 Write unit tests for AdminStatsService
    - Test ValidateTemplate with various parameter combinations
    - Test time filter parsing for all period types
    - Test statistics aggregation with mock data
    - _Requirements: 2.1-2.8, 5.1-5.6, 6.1-6.10_

- [x] 5. Implement TemplateLifecycleManager
  - [x] 5.1 Create template_lifecycle.go with manager struct
    - Define TemplateLifecycleManager with repo and pool fields
    - Define TemplateStatus struct
    - _Requirements: 3.1-3.4, 4.1-4.4_

  - [x] 5.2 Implement GetTemplateStatus method
    - Call GetTemplateRoomStatus query
    - Return counts of active and waiting rooms
    - Set CanDelete flag based on room counts
    - _Requirements: 3.1, 4.1_

  - [x] 5.3 Implement DeleteTemplateWithRooms method
    - Check template status first
    - If active/waiting rooms exist, return error with status
    - Delete all empty/completed rooms associated with template
    - Delete template record
    - Use transaction for atomicity
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.4 Implement UpdateTemplateWithRooms method
    - Check template status first
    - If active/waiting rooms exist, return error with status
    - Update template parameters
    - Use transaction for atomicity
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.5 Write unit tests for TemplateLifecycleManager
    - Test deletion with no active rooms
    - Test deletion blocked by active rooms
    - Test update with no active rooms
    - Test update blocked by active rooms
    - _Requirements: 3.1-3.4, 4.1-4.4_

- [x] 6. Implement AdminHandler
  - [x] 6.1 Create admin_handler.go with handler struct
    - Define AdminHandler with Repo, Pool, and StatsService fields
    - Define request/response types for all endpoints
    - _Requirements: 1.1-1.5, 2.1-2.8, 3.1-3.4, 4.1-4.4, 5.1-5.6, 6.1-6.10_

  - [x] 6.2 Implement ValidateTemplate endpoint handler
    - Parse request body with template parameters
    - Call StatsService.ValidateTemplate
    - Call StatsService.CheckDuplicateTemplate
    - Calculate expected jackpot (players_needed * entry_cost * winner_pct / 100)
    - Return validation response with warnings and jackpot
    - _Requirements: 1.3, 2.1-2.8_

  - [x] 6.3 Implement GetTemplateStatisticsList endpoint handler
    - Parse query parameters for time filter and sorting
    - Get all templates from repository
    - For each template, get completed room count with time filter
    - Apply sorting based on query parameters
    - Return list of templates with statistics
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.4 Implement GetTemplateStatisticsDetail endpoint handler
    - Parse template_id from path parameter
    - Parse time filter from query parameters
    - Call StatsService.GetTemplateStatistics
    - Return detailed statistics response
    - _Requirements: 6.1-6.10, 7.1-7.3_

  - [x] 6.5 Implement GetTemplateStatus endpoint handler
    - Parse template_id from path parameter
    - Call TemplateLifecycleManager.GetTemplateStatus
    - Return status response with room counts
    - _Requirements: 3.1, 4.1_

  - [x] 6.6 Enhance DeleteTemplate endpoint handler
    - Parse template_id from path parameter
    - Call TemplateLifecycleManager.DeleteTemplateWithRooms
    - Handle 409 Conflict if rooms are active
    - Return success or status response
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.7 Enhance UpdateTemplate endpoint handler
    - Parse template_id and parameters from request
    - Call ValidateTemplate for new parameters
    - Call TemplateLifecycleManager.UpdateTemplateWithRooms
    - Handle 409 Conflict if rooms are active
    - Return updated template or status response
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.8 Write integration tests for AdminHandler
    - Test validate endpoint with various parameters
    - Test statistics list with filters and sorting
    - Test statistics detail for specific template
    - Test template status endpoint
    - Test enhanced delete with active rooms
    - Test enhanced update with active rooms
    - _Requirements: 1.1-1.5, 2.1-2.8, 3.1-3.4, 4.1-4.4, 5.1-5.6, 6.1-6.10_

- [x] 7. Register admin routes and wire up dependencies
  - Register admin handler routes in main API setup
  - Create AdminStatsService instance with repository
  - Create TemplateLifecycleManager instance with repository
  - Create AdminHandler instance with services
  - Mount routes under /api/admin prefix
  - _Requirements: 1.1-1.5, 2.1-2.8, 3.1-3.4, 4.1-4.4, 5.1-5.6, 6.1-6.10_

- [x] 8. Update room creation to track template_id
  - Modify room creation handlers to accept optional template_id parameter
  - Store template_id when creating rooms from templates
  - Update existing room creation logic in room_handler.go
  - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1_
