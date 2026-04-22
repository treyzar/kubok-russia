# Отчёт о расхождениях между Go-бэкендом и Java/Spring Boot портом

> **Источник истины:** каталог `backend/` (Go).
> **Подсистема под аудитом:** каталог `backend-java/` (Java 21 + Spring Boot 3, JPA + Flyway).
> **Дата:** 2026-04-22.
> **Цель:** один проход — глубокий аудит всех модулей и устранение всех расхождений в этом же коммите.

Расхождения сгруппированы по слоям. Для каждого пункта указано: место в Go (истина), место в Java (отличие), и какой fix применён в этой итерации.

---

## 1. Схема БД (`backend-java/src/main/resources/db/migration/V1__init_schema.sql`)

| # | Описание | Go (истина) | Java (было) | Fix |
|---|----------|-------------|-------------|-----|
| 1.1 | `room_templates.name` должно быть `UNIQUE` | mig 010: `VARCHAR(255) UNIQUE NOT NULL` | `VARCHAR(255) NOT NULL` (без UNIQUE) | Добавлен `UNIQUE` |
| 1.2 | `room_templates.updated_at` присутствует в Go | mig 010: `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | колонка отсутствовала | Добавлена |
| 1.3 | `room_places.created_at` присутствует в Go | mig 014: `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | колонка отсутствовала | Добавлена |
| 1.4 | FK `users(id)` для `room_places/room_players/room_winners/room_boosts` должны иметь `ON DELETE CASCADE` | mig 002 + 014 | стояло без `ON DELETE CASCADE` | Добавлено |
| 1.5 | Имя индекса `idx_rooms_template_id` (а не `idx_rooms_template`) | mig 018 | было `idx_rooms_template` | Переименовано |
| 1.6 | Индексы на `user_id` для room_winners / room_boosts / room_players | mig 002 | отсутствовали | Добавлены |
| 1.7 | Индекс `idx_room_places_room_user` (составной) | mig 014 | отсутствовал | Добавлен |
| 1.8 | UUID-таблицы `fair_rooms`/`fair_players` должны иметь `DEFAULT gen_random_uuid()` | mig 011 | дефолта не было | Добавлен |
| 1.9 | В `fair_players` колонки `joined_at` нет в Go | mig 011 | в Java была | Удалена |
| 1.10 | `idx_fair_rooms_risk_state` (порядок: risk_level, state) | mig 011 | было `idx_fair_rooms_state_risk` (state, risk_level) | Переименован/переупорядочен |
| 1.11 | Индекс `idx_users_bot_balance` присутствует в Go (после mig 007) | mig 007 | присутствует — OK | без изменений |

---

## 2. Эндпоинты `RoomController` (`/api/v1/rooms`)

| # | Go-эндпоинт | Java (было) | Fix |
|---|-------------|-------------|-----|
| 2.1 | `POST /rooms/from-template/{id}` — **отсутствует**, шаблон передаётся через поле `template_id` в `POST /rooms` | был отдельный эндпоинт `createFromTemplate` | Удалён эндпоинт; логика fallback из шаблона перенесена в `RoomService.create()` (см. п. 3.1) |
| 2.2 | `POST /rooms/{id}/places` — **отсутствует** в Go | был `claimPlaces` | Удалены и эндпоинт, и метод сервиса, и DTO `ClaimPlaceRequest` |
| 2.3 | `POST /rooms/{id}/settle` — **отсутствует** в HTTP API Go (settle вызывается только `RoomFinisher` крон-задачей) | был HTTP endpoint | Эндпоинт удалён; `RoomService.settle(...)` остаётся как internal API для `RoomFinisherJob` |
| 2.4 | `POST /rooms/validate` принимает **только три поля** `{players_needed, entry_cost, winner_pct}` и возвращает `{prize_fund, organiser_cut, player_roi, player_win_probability, warnings}` | принимал полный `CreateRoomRequest`, возвращал `EconomicValidationResult` (поле `isViable`) | Введён DTO `ValidateRoomRequest`; форма ответа `ValidateRoomResponse` совпадает с Go |
| 2.5 | `POST /rooms/{id}/players` (join) поддерживает поле `places` (несколько мест в одной операции) | поддерживал только 1 место | Добавлено поле `places` (default 1) в `JoinRoomRequest` и обрабатывается в сервисе |
| 2.6 | `POST /rooms/{id}/players` (join) делает pre-check баланса и возвращает HTTP 402 c телом `InsufficientBalanceError{message,required,current_balance,shortfall}` | дебитовалось по факту, выбрасывалось обычное `InsufficientBalanceException` без структуры | Добавлен pre-check в `RoomService.join`; новое исключение `InsufficientBalanceForRoomException` с полями; в `GlobalExceptionHandler` добавлен маппинг → 402 со структурой Go |
| 2.7 | `POST /rooms/{id}/players` (join) публикует `player_joined` с фактическим `places` | публиковалось всегда `1` | Передаётся реальное число |
| 2.8 | Все мутирующие эндпоинты (join/leave/boost) возвращают **полный объект Room**, а не `{message:"..."}` | возвращали `{message: "..."}` | Возвращают `Room` |
| 2.9 | Все list-эндпоинты возвращают обёртку `{rooms:[...]}/{players:[...]}/{winners:[...]}/{boosts:[...]}` | возвращали голый JSON-массив | Введены обёртки на уровне контроллера |
| 2.10 | `DELETE /rooms/{id}/players` (leave) разрешён в статусах `new` **и** `starting_soon` (см. SQL `LeaveRoomAndUpdateStatus`) | разрешался только в `new` | Добавлен `STARTING_SOON` |
| 2.11 | `POST /rooms/{id}/boosts` отклоняет повторный буст того же пользователя с HTTP **409 Conflict** | суммировал с существующим бустом | Сервис теперь отклоняет дубликат (`DuplicateBoostException` → 409) |
| 2.12 | `POST /rooms/{id}/boosts` делает pre-check баланса и при недостатке возвращает HTTP 402 со структурой `InsufficientBalanceError{...}` | возвращал стандартное 402 без структуры | Унифицирован формат через `InsufficientBalanceForRoomException` |

---

## 3. `RoomService` (`backend-java/src/main/java/com/onlineshop/service/RoomService.java`)

| # | Go-поведение | Java (было) | Fix |
|---|--------------|-------------|-----|
| 3.1 | `Create` принимает поле `template_id`; если задано — берёт `players_needed/entry_cost/winner_pct/round_duration_seconds/start_delay_seconds/game_type/min_players` из шаблона; иначе — defaults как в Go (`min_players=1, winner_pct=80, round=30, delay=60, game_type=train`) | была отдельная пара методов `createFromTemplate`/`createDirect`, defaults частично не совпадали | Объединено в `RoomService.create(...)` |
| 3.2 | Формула `calcBoostProbability`: `poolBase = players_needed * entry_cost` (фиксированный пул всех мест), `acc = SUM(boost у ВСЕХ игроков)`, `total_player = entry_cost*places(user) + boost(user)`. Денoм = `poolBase + acc + boost`, числитель = `total_player + boost`. Никакого вычитания у `userPlaces/userBoost` | вычитала `userPlaces*entryCost`, `userBoost` — это другая модель (без учёта пустых слотов) | Заменено на формулу Go |
| 3.3 | Формула `calcRequiredBoost`: `ceil( (p*(poolBase+acc) - 100*total_player) / (100-p) )` с тем же `poolBase = players_needed*entry_cost`, `acc = SUM всех бустов` | использовала ту же ошибочную модель, что и 3.2 | Заменено на формулу Go |
| 3.4 | `JoinRoom` использует `LeaveRoomAndUpdateStatus` SQL — статус `starting_soon` тоже валиден | разрешал только `new`/`starting_soon` (это OK), но `leave` — только `new` | См. п. 2.10 |
| 3.5 | `BoostRoom` отклоняет дубликат | суммировал | См. п. 2.11 |
| 3.6 | `JoinRoom` поддерживает `places` (несколько мест за одну операцию, дебит = `entry_cost * places`, столько же `room_places` строк) | не поддерживал | Реализовано |

---

## 4. `BotManagerJob` (`backend-java/src/main/java/com/onlineshop/scheduler/BotManagerJob.java`)

| # | Go-истина (`backend/internal/crons/bot_manager.go`) | Java (было) | Fix |
|---|------------------------------------------------------|-------------|-----|
| 4.1 | Список ровно 35 русских имён: Александр, Дмитрий, Максим, Сергей, Андрей, Алексей, **Артём** (с буквой ё), Илья, Кирилл, Михаил, **Никита**, **Матвей**, Роман, **Егор**, **Арсений**, **Иван**, **Денис**, Евгений, **Даниил**, **Тимофей**, Владимир, Павел, **Руслан**, **Марк**, **Глеб**, Анна, Мария, Елена, Ольга, Наталья, Татьяна, Ирина, Екатерина, **Светлана**, Юлия | Список содержал **другие** имена: Анастасия, Антон, Виктор, Виктория, Дарья, Игорь, Константин, Николай, Полина, София, Юрий, Яна, Ярослав; «Артем» без ё; не было Никиты/Матвея/Егора/Арсения/Ивана/Дениса/Даниила/Тимофея/Руслана/Марка/Глеба/Светланы | Список приведён к Go-версии (включая ё в «Артём») |
| 4.2 | Суффикс генерится как `rand.Intn(10000)` — диапазон `[0..9999]` включительно | Java использовала `1 + rnd.nextInt(9999)` — диапазон `[1..9999]` | Изменено на `rnd.nextInt(10000)` (диапазон `[0..9999]`) |
| 4.3 | Дефолтное число ботов в Go-конфиге — 50 | в Java было 50 — OK | без изменений |
| 4.4 | Пополнение баланса — single SQL `IncreaseBalanceForLowBalanceBots` (+200 всем ботам с balance<500). Атомарно. | в Java цикл по DTO + `users.credit` (по одной транзакции на бота). Семантически эквивалентно (одинаковый итог). | оставлено как есть — поведение совпадает |

---

## 5. `RoomStarterJob` (`backend-java/src/main/java/com/onlineshop/scheduler/RoomStarterJob.java`)

| # | Go-истина (`backend/internal/crons/room_starter.go`) | Java (было) | Fix |
|---|------------------------------------------------------|-------------|-----|
| 5.1 | Если доступных ботов меньше, чем нужно — **транзакция полностью откатывается, комната не стартует**. Старт пробуется снова на следующем тике | Java продолжала старт с тем количеством ботов, которое нашлось | Добавлен ранний выход с откатом |
| 5.2 | При заполнении ботами **`player_joined`-событие НЕ публикуется** (публикуется только итоговый `game_started`) | Публиковалось `player_joined` на каждого бота | Удалено |
| 5.3 | `start_time` не обновляется при переходе в `playing` (`SetRoomStatus` в Go меняет только `status`) | Java делала `room.setStartTime(Instant.now())` | Удалено |
| 5.4 | Используется атомарный SQL `BotJoinRoom` (списание + пополнение jackpot одним запросом). Java делает это в два шага в той же транзакции — функционально эквивалентно | — | без изменений (поведение совпадает в рамках @Transactional) |
| 5.5 | `room_starting`-события публикуются только пока `start_time` ещё не наступил | в Java та же логика — OK | без изменений |

---

## 6. `AdminController` / `AdminStatsService`

| # | Go-эндпоинт | Java (было) | Fix |
|---|-------------|-------------|-----|
| 6.1 | `POST /admin/templates/validate` принимает `{players_needed, min_players, entry_cost, winner_pct, game_type}` и возвращает `{valid, warnings, expected_jackpot, is_duplicate}`. Включает в `warnings` запись о дубликате (severity=`error`) если шаблон уже существует. | принимал полный `TemplateDto` (с name/round_duration/start_delay) и возвращал `{warnings:[...]}` | Введён `AdminValidateTemplateRequest`; ответ — `AdminValidateTemplateResponse` с тем же набором полей; внутри добавляется warning о дубликате |
| 6.2 | Эндпоинты `POST /admin/templates/economic` и `POST /admin/templates/duplicate-check` **отсутствуют в Go** | присутствовали | Удалены |
| 6.3 | `GET /admin/statistics/templates` возвращает `{templates: [TemplateStatisticsListItem]}`, где каждый item включает `completed_rooms` и поддерживается query `period`, `start_time`, `end_time`, `sort_by`, `sort_order` | возвращал `{templates: [RoomTemplate]}` без статистики и без сортировки | Реализовано: query-параметры, `completed_rooms`, сортировка, обёртка |
| 6.4 | `GET /admin/statistics/templates/{id}` принимает period/start_time/end_time | Java принимала те же параметры — OK | без изменений |
| 6.5 | `POST /admin/templates/economic` отсутствует у Go | присутствовал в Java | Удалён |
| 6.6 | `validateTemplate` использует условие `MinPlayers > avgRealPlayersPerRoom` — Java делает то же (`dto.minPlayers() > avg`) | OK | без изменений |

---

## 7. `TemplateController`, `UserController`, `RoundController`

| # | Эндпоинт | Go-формат | Java (было) | Fix |
|---|----------|-----------|-------------|-----|
| 7.1 | `GET /api/v1/room-templates` | `{templates:[...]}` | голый массив | Обёрнут |
| 7.2 | `GET /api/v1/users` | `{users:[...]}` | голый массив | Обёрнут |
| 7.3 | `GET /api/v1/rounds` | `{rounds:[...]}` | уже обёрнут — OK | без изменений |
| 7.4 | `DELETE /api/v1/users/{id}`, `/room-templates/{id}` | `{message:"deleted"}` | OK | без изменений |

---

## 8. Несовпадения, осознанно оставленные (с обоснованием)

* **HTTP-фреймворк.** Go использует `huma`, Java — Spring MVC; маршруты и формы тел теперь идентичны. OpenAPI-схема может незначительно отличаться по секциям `errors`/`tags`, но это не функциональное расхождение.
* **Транзакционность.** Go использует pgx-транзакции, Java — Spring `@Transactional`. Семантика at-row-level совпадает (PESSIMISTIC_WRITE используется для `users` и `rooms` где Go берёт `BEGIN; UPDATE ... WHERE id = $1`).
* **`RngClient`.** Java вызывает Go-микросервис RNG через REST — это идентично оригиналу.
* **`fair_*`-маршруты.** Go-сервис `fair_room_manager` существует отдельно; Java эмулирует его через `FairRoomService`. Этот аудит охватывал основной геймплей-флоу; деталь fair_room аудитировалась только на уровне схемы (см. п. 1.8–1.10).

---

## 9. Сводка изменённых файлов

* `backend-java/src/main/resources/db/migration/V1__init_schema.sql`
* `backend-java/src/main/java/com/onlineshop/dto/RoomDtos.java`
* `backend-java/src/main/java/com/onlineshop/dto/AdminDtos.java`
* `backend-java/src/main/java/com/onlineshop/exception/DomainExceptions.java`
* `backend-java/src/main/java/com/onlineshop/exception/GlobalExceptionHandler.java`
* `backend-java/src/main/java/com/onlineshop/controller/RoomController.java`
* `backend-java/src/main/java/com/onlineshop/controller/AdminController.java`
* `backend-java/src/main/java/com/onlineshop/controller/TemplateController.java`
* `backend-java/src/main/java/com/onlineshop/controller/UserController.java`
* `backend-java/src/main/java/com/onlineshop/service/RoomService.java`
* `backend-java/src/main/java/com/onlineshop/service/AdminStatsService.java`
* `backend-java/src/main/java/com/onlineshop/scheduler/RoomStarterJob.java`
* `backend-java/src/main/java/com/onlineshop/scheduler/BotManagerJob.java`
