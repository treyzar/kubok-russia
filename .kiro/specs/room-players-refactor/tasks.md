# Implementation Plan

- [x] 1. Создать миграцию БД для изменения схемы room_players
  - Создать файл `backend/db/migrations/000015_refactor_room_players.sql`
  - В секции Up: добавить колонку `place_id INTEGER`, мигрировать данные из `room_places`, добавить FK `(room_id, place_id) REFERENCES room_places(room_id, place_index) ON DELETE CASCADE`, сменить PK на `(room_id, user_id, place_id)`
  - В секции Down: удалить FK, новый PK, колонку `place_id`, восстановить PK `(room_id, user_id)`
  - _Requirements: 1.1, 1.4, 1.5_

- [x] 2. Обновить SQL-запросы
- [x] 2.1 Добавить запрос InsertRoomPlayer и обновить JoinRoom/BotJoinRoom
  - В `backend/db/queries/rooms.sql` добавить `InsertRoomPlayer` — вставка одной записи в `room_players (room_id, user_id, place_id)`
  - Убрать вставку в `room_players` из CTE запросов `JoinRoom`, `JoinRoomAndUpdateStatus`, `BotJoinRoom` — оставить только обновление баланса, джекпота, статуса
  - _Requirements: 2.1_

- [x] 2.2 Обновить CountRoomPlayers, GetPlayersWithStakes, GetRoundPlayers, GetRoundDetails
  - `CountRoomPlayers`: изменить на `COUNT(DISTINCT user_id)` для корректной проверки вместимости
  - `GetPlayersWithStakes`: заменить LEFT JOIN с `room_places` на `COUNT(rp.place_id)` из `room_players`
  - `GetRoundPlayers`: аналогично упростить через `COUNT(rp.place_id)`
  - `GetRoundDetails`: подзапрос `COUNT(*) FROM room_places` заменить на `COUNT(rp2.place_id) FROM room_players rp2`
  - _Requirements: 2.4, 2.5, 2.6_

- [x] 2.3 Обновить ListRoomPlayers и LeaveRoom запросы
  - `ListRoomPlayers`: агрегировать по `(room_id, user_id, joined_at)` с `COUNT(rp.place_id) AS places`
  - `LeaveRoom` / `LeaveRoomAndUpdateStatus`: удаление по `(room_id, user_id)` из `room_players` — каскад удалит `room_places`; убрать явный `DELETE FROM room_places`
  - _Requirements: 2.2, 2.3_

- [x] 3. Обновить сгенерированный Go-код репозитория
- [x] 3.1 Обновить models.go
  - В `backend/repository/models.go` добавить поле `PlaceID int32` в структуру `RoomPlayer`
  - _Requirements: 3.1_

- [x] 3.2 Обновить rooms.sql.go
  - В `backend/repository/rooms.sql.go` добавить функцию `InsertRoomPlayer` с соответствующими типами параметров и строкой запроса
  - Обновить функции `JoinRoom`, `JoinRoomAndUpdateStatus`, `BotJoinRoom` — убрать сканирование полей `room_players` из результата (они больше не возвращаются из CTE)
  - Обновить `CountRoomPlayers` — запрос теперь `COUNT(DISTINCT user_id)`
  - Обновить `GetPlayersWithStakes`, `ListRoomPlayers` — новые SQL-строки и типы строк результата
  - _Requirements: 3.2_

- [x] 3.3 Обновить rounds.sql.go
  - В `backend/repository/rounds.sql.go` обновить строки запросов `GetRoundPlayers` и `GetRoundDetails` в соответствии с новыми SQL-запросами
  - _Requirements: 3.2_

- [x] 4. Обновить хендлер JoinRoom
  - В `backend/handlers/room_handler.go` в методе `JoinRoom`: после вызова `JoinRoomAndUpdateStatus` добавить цикл вставки мест — `InsertRoomPlace` + `InsertRoomPlayer` для каждого места
  - Убедиться, что все операции выполняются в одной транзакции
  - _Requirements: 3.3_

- [x] 5. Обновить крон RoomStarter для ботов
  - В `backend/internal/crons/room_starter.go` после `BotJoinRoom` + `InsertRoomPlace` добавить вызов `InsertRoomPlayer` с полученным `place_index` как `place_id`
  - _Requirements: 3.3_

- [x] 6. Обновить интеграционные тесты
  - В `backend/tests/room_places/main.go` обновить тесты `testJoinRoomSinglePlace`, `testJoinRoomMultiplePlaces`, `testLeaveRoomCascade`: проверять наличие записей в `room_players` (N строк на N мест) и их удаление при выходе
  - _Requirements: 4.1, 4.2_

- [x] 6.1 Добавить проверку инварианта place_id в тестах
  - Добавить тест, проверяющий что `place_id` в `room_players` совпадает с `place_index` в `room_places` для каждой записи
  - _Requirements: 4.1_
