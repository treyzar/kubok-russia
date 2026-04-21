# Requirements Document

## Introduction

Рефакторинг таблицы `room_players` в бэкенде веб-сервиса. Цель — изменить архитектуру так, чтобы каждая запись в `room_players` соответствовала одному конкретному месту (`place`), а не одному игроку с полем `places` (количество мест). Таблица `room_places` становится первичной: сначала создаётся запись в `room_places`, затем в `room_players` появляется запись с FK на эту запись. Составной первичный ключ `room_players` меняется с `(room_id, user_id)` на `(room_id, user_id, place_id)`.

Все связанные компоненты бэкенда (SQL-запросы, сгенерированный Go-код, хендлеры, крон-джобы, тесты) должны быть обновлены в соответствии с новой схемой.

## Glossary

- **room_players**: таблица, хранящая участие игрока в комнате. После рефакторинга — одна запись на одно место.
- **room_places**: таблица, хранящая конкретное место (`place_index`) в комнате, принадлежащее игроку.
- **place_id**: FK в `room_players`, ссылающийся на `room_places(room_id, place_index)` — уникальный идентификатор места.
- **place_index**: порядковый номер места в комнате (уникален в рамках комнаты).
- **JoinRoom**: операция входа игрока в комнату; теперь создаёт одну запись в `room_places` и одну запись в `room_players` за одну транзакцию.
- **LeaveRoom**: операция выхода игрока из комнаты; удаляет все его записи из `room_players` и `room_places`.
- **stake**: ставка игрока = количество его мест × entry_cost + boost.
- **sqlc**: инструмент генерации Go-кода из SQL-запросов.
- **Goose**: инструмент управления миграциями БД.

## Requirements

### Requirement 1

**User Story:** As a backend developer, I want `room_players` to have one row per place (not per player), so that each place is a first-class entity with a direct FK reference.

#### Acceptance Criteria

1. THE Database SHALL contain a migration that drops the existing PRIMARY KEY `(room_id, user_id)` from `room_players` and adds column `place_id INTEGER NOT NULL REFERENCES room_places(room_id, place_index)` with new PRIMARY KEY `(room_id, user_id, place_id)`.
2. WHEN a player joins a room with N places, THE System SHALL insert N rows into `room_places` and N rows into `room_players`, each `room_players` row referencing a distinct `room_places` row via `place_id`.
3. WHEN a player leaves a room, THE System SHALL delete all `room_players` rows for that `(room_id, user_id)` and all corresponding `room_places` rows.
4. THE Database SHALL enforce referential integrity so that IF a `room_places` row is deleted, THEN THE System SHALL cascade-delete the corresponding `room_players` row.
5. THE Database migration SHALL be reversible (goose Down section).

### Requirement 2

**User Story:** As a backend developer, I want all SQL queries to reflect the new schema, so that the application logic remains correct after the migration.

#### Acceptance Criteria

1. THE `JoinRoom` SQL query SHALL insert into `room_places` first, then insert into `room_players` with the resulting `place_index` as `place_id`, within a single transaction.
2. THE `LeaveRoom` SQL query SHALL delete from `room_players` by `(room_id, user_id)` and cascade to `room_places`.
3. THE `ListRoomPlayers` SQL query SHALL return one row per place (not per player), joining `room_players` with `room_places` to expose `place_index`.
4. THE `GetPlayersWithStakes` SQL query SHALL count stakes by counting `room_players` rows per user (since each row = one place), without needing a JOIN to `room_places` for the count.
5. THE `GetRoundPlayers` SQL query SHALL be updated to reflect the new schema.
6. THE `CountRoomPlayers` SQL query SHALL count distinct `user_id` values OR count total rows depending on the business context (total places = total rows).

### Requirement 3

**User Story:** As a backend developer, I want the generated Go repository code (sqlc) to be updated, so that handlers and cron jobs compile and work correctly.

#### Acceptance Criteria

1. THE `repository/models.go` SHALL reflect the updated `RoomPlayer` struct with `PlaceID` field.
2. THE `repository/rooms.sql.go` SHALL be regenerated or manually updated to match the new SQL queries.
3. WHEN the `JoinRoom` handler is called, THE System SHALL use a transaction to insert into `room_places` then `room_players` atomically.
4. THE `ListRoomPlayers` handler SHALL return one entry per place per player (or aggregate by user — per business decision).
5. THE `GetPlayersWithStakes` handler and `RoomFinisher` cron SHALL correctly compute weighted stakes using the new schema.

### Requirement 4

**User Story:** As a backend developer, I want the integration tests to be updated, so that the test suite validates the new schema end-to-end.

#### Acceptance Criteria

1. THE `tests/room_places/main.go` integration test SHALL be updated to reflect the new join/leave flow where `room_players` rows are created per place.
2. WHEN a player with N places leaves a room, THE test SHALL verify that N rows are removed from both `room_players` and `room_places`.
3. THE `GetRoundDetails` SQL query SHALL correctly aggregate player data using the new schema.
