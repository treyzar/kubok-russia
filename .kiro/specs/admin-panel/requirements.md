# Requirements Document

## Introduction

The admin panel provides administrators with comprehensive capabilities to manage and control the entire game system. It enables template management (create, edit, delete), provides intelligent recommendations based on historical data, and offers detailed statistics for monitoring system performance and player behavior.

## Glossary

- **Admin Panel**: The administrative interface for system management
- **Template**: A game room configuration defining game type, player limits, entry cost, and prize pool percentage
- **Room**: An active game instance created from a template
- **Entry Cost**: The amount of bonuses a player must pay to join a room
- **Prize Pool Percentage**: The percentage of total entry costs distributed as jackpot (winner_pct)
- **Real Player**: A human user participating in the game
- **Bot**: An automated player managed by the system
- **Boost**: Additional bonuses spent by players to improve their chances
- **Historical Metrics**: Statistical data calculated from the past week of gameplay

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to create game templates with configurable parameters, so that I can define different game types for players

#### Acceptance Criteria

1. WHEN the administrator accesses the template creation interface, THE Admin Panel SHALL display input fields for game type, maximum players, entry cost, prize pool percentage, and minimum players
2. THE Admin Panel SHALL set default values of maximum players to 1, entry cost to 0, prize pool percentage to 100, and minimum players to 1
3. WHEN the administrator modifies entry cost, maximum players, or prize pool percentage, THE Admin Panel SHALL dynamically calculate and display the expected jackpot amount
4. THE Admin Panel SHALL accept game type selection from a predefined list of available game types
5. THE Admin Panel SHALL validate that minimum players does not exceed maximum players before template creation

### Requirement 2

**User Story:** As an administrator, I want to receive intelligent recommendations when creating templates, so that I can make economically viable decisions

#### Acceptance Criteria

1. WHEN maximum players equals 1, THE Admin Panel SHALL display a warning that the player count is too low
2. WHEN minimum players exceeds the average real player count per room from the past week, THE Admin Panel SHALL display a warning that the minimum requirement is too high
3. WHEN maximum players exceeds twice the average real player count per room from the past week, THE Admin Panel SHALL display a warning that the maximum requirement is too high
4. WHEN entry cost exceeds 1.75 times the average entry cost per player from the past week, THE Admin Panel SHALL display a warning that the entry cost is too high
5. WHEN entry cost is less than 0.5 times the average entry cost per player from the past week, THE Admin Panel SHALL display a warning that the entry cost is too low
6. WHEN prize pool percentage exceeds 80, THE Admin Panel SHALL display a warning that the jackpot percentage is too high
7. WHEN prize pool percentage is less than 50, THE Admin Panel SHALL display a warning that the jackpot percentage is too low
8. WHEN a template with identical parameters already exists, THE Admin Panel SHALL prevent creation and display a duplicate template warning

### Requirement 3

**User Story:** As an administrator, I want to delete templates, so that I can remove game configurations that are no longer needed

#### Acceptance Criteria

1. WHEN the administrator initiates template deletion, THE Admin Panel SHALL identify all rooms associated with the template
2. WHEN a room has active players or is in player recruitment phase, THE Admin Panel SHALL wait until the game completes or all players leave before deletion
3. WHEN all associated rooms are empty or completed, THE Admin Panel SHALL delete the rooms and then delete the template
4. THE Admin Panel SHALL provide status feedback on the deletion progress for templates with active rooms

### Requirement 4

**User Story:** As an administrator, I want to edit existing templates, so that I can adjust game parameters without creating new templates

#### Acceptance Criteria

1. WHEN the administrator initiates template editing, THE Admin Panel SHALL display current template parameters in editable fields
2. WHEN a template has active rooms, THE Admin Panel SHALL wait until all associated rooms complete or empty before applying changes
3. WHEN template modifications are saved, THE Admin Panel SHALL apply the same validation and recommendation rules as template creation
4. THE Admin Panel SHALL update the template parameters after all associated rooms are resolved

### Requirement 5

**User Story:** As an administrator, I want to view a summary of all templates with their performance metrics, so that I can monitor the system at a glance

#### Acceptance Criteria

1. WHEN the administrator accesses the statistics page, THE Admin Panel SHALL display a list of all templates with their configuration parameters
2. THE Admin Panel SHALL display the count of completed rooms for each template
3. THE Admin Panel SHALL provide time period filters with options for 1 hour, 1 day, 1 week, 1 month, all time, and custom range
4. WHEN a time filter is applied, THE Admin Panel SHALL update all displayed metrics to reflect only data from the selected period
5. THE Admin Panel SHALL allow sorting templates by any configuration parameter or performance metric
6. WHEN the administrator clicks on a template, THE Admin Panel SHALL navigate to the detailed statistics page for that template

### Requirement 6

**User Story:** As an administrator, I want to view detailed statistics for a specific template, so that I can analyze its performance and player behavior

#### Acceptance Criteria

1. WHEN the administrator views template details, THE Admin Panel SHALL display the count of completed rooms for the template
2. THE Admin Panel SHALL display the total count of real players who participated in rooms from this template
3. THE Admin Panel SHALL display the total count of bots who participated in rooms from this template
4. THE Admin Panel SHALL calculate and display the average count of real players per room for this template
5. THE Admin Panel SHALL display the count of games won by real players for this template
6. THE Admin Panel SHALL display the count of games won by bots for this template
7. THE Admin Panel SHALL calculate and display the total sum of bonuses spent on boosts in rooms from this template
8. THE Admin Panel SHALL calculate and display the average boost expenditure per player in rooms from this template
9. THE Admin Panel SHALL calculate and display the average total boost expenditure per room for this template
10. THE Admin Panel SHALL calculate and display the average number of places selected by players per room for this template

### Requirement 7

**User Story:** As an administrator, I want to filter and sort detailed template statistics, so that I can analyze specific time periods and metrics

#### Acceptance Criteria

1. WHEN viewing detailed template statistics, THE Admin Panel SHALL provide the same time period filters available on the main statistics page
2. WHEN a time filter is applied to detailed statistics, THE Admin Panel SHALL recalculate all metrics based on the selected period
3. THE Admin Panel SHALL allow sorting detailed statistics by any displayed metric
