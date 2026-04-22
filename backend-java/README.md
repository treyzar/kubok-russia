# 🎮 OnlineShop — Java/Spring Boot Backend

> **Полная документация Java-порта**: Spring Boot 3.3 (Java 17/21) реализация бэкенда платформы быстрых бонусных игр с лотерейными комнатами, ботами, бустами и provably fair механикой. Функциональный паритет с эталонной Go-реализацией (`backend/`).

---

## 📋 Содержание

1. [Обзор](#-обзор)
2. [Архитектура](#-архитектура)
3. [Технологический стек](#-технологический-стек)
4. [Структура проекта](#-структура-проекта)
5. [База данных](#-база-данных)
6. [Конфигурация](#-конфигурация)
7. [Установка и запуск](#-установка-и-запуск)
8. [API документация (Swagger)](#-api-документация-swagger)
9. [Игровые механики](#-игровые-механики)
10. [Provably Fair](#-provably-fair)
11. [Тестирование](#-тестирование)
12. [Паритет с Go](#-паритет-с-go)
13. [Разработка](#-разработка)

---

## 🎯 Обзор

Java-порт Go-бэкенда для платформы быстрых бонусных игр. Реализованы:

- **Создание и управление игровыми комнатами** с настраиваемыми параметрами
- **Автоматический матчмейкинг** и подбор комнат
- **Система бустов** с расчётом вероятности по формуле Go
- **Автозаполнение ботами** (35 русских имён, баланс 500)
- **Real-time обновления** через WebSocket + Redis Pub/Sub
- **Provably Fair** с SHA-256 seed verification
- **Auto-scaling fair-rooms** по правилу 70%
- **Админ-панель** с валидацией шаблонов и метриками
- **Внешний RNG** с локальным fallback

### Ключевые отличия от Go-версии

- **Один Spring Boot процесс** заменяет три Go-сервиса (`api` + `bot_manager` + `room_manager`). Cron-задачи реализованы через `@Scheduled` с теми же интервалами.
- **JPA/Hibernate** вместо `sqlc` + `pgx/v5`.
- **Flyway-миграция** консолидирует 18 Goose-миграций в одну `V1__init_schema.sql`.
- **springdoc-openapi** автоматически генерирует Swagger UI вместо Huma v2.
- **Spring Data Redis** + `RedisMessageListenerContainer` вместо `go-redis/v9`.

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  Vite + TypeScript + TailwindCSS + shadcn/ui                │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP / WebSocket (STOMP)
┌────────────────────▼────────────────────────────────────────┐
│              Spring Boot Application (Java)                  │
│  Tomcat + Spring MVC + WebSocket + springdoc-openapi        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Controllers → Services → Repositories (JPA)         │    │
│  │  Schedulers (BotManager / RoomStarter / Finisher)    │    │
│  │  Events (Redis Pub/Sub bridge)                       │    │
│  └─────────────────────────────────────────────────────┘    │
└────────┬─────────────────────────────────┬──────────────────┘
         │                                 │
         ▼                                 ▼
   ┌──────────┐                      ┌──────────┐
   │PostgreSQL│                      │  Redis   │
   │   15+    │                      │  7+      │
   └──────────┘                      └──────────┘
```

### Слои приложения

```
HTTP Request
    │
    ▼
Controller (controller/)        ← @RestController, валидация DTO
    │
    ▼
Service (service/)              ← бизнес-логика, @Transactional
    │
    ▼
Repository (repository/)        ← Spring Data JPA
    │
    ▼
PostgreSQL (HikariCP пул)
```

### Шедулеры (cron-аналоги)

| Job | Интервал | Аналог в Go |
|---|---|---|
| `BotManagerJob` | 10 секунд | `services/bot_manager` |
| `RoomStarterJob` | 1 секунда | `services/room_manager` (RoomStarter) |
| `RoomFinisherJob` | 1 секунда | `services/room_manager` (RoomFinisher) |

### События (Redis Pub/Sub)

Канал: **`room:{roomId}`** (идентично Go).

Типизированные payload-ы:
- `PlayerJoinedData{user_id, places}`
- `BoostAppliedData{user_id, amount}`
- `RoomStartingData{start_time, countdown_seconds}`
- `GameFinishedData{winner_id, prize}`
- `RoomEvent` — общий wrapper

---

## 📦 Технологический стек

| Технология | Версия | Назначение |
|---|---|---|
| **Java** | 17 (минимум) / 21 (рекомендуется) | Язык |
| **Spring Boot** | 3.3.5 | Фреймворк |
| **Spring Web MVC** | 3.3.5 | HTTP REST |
| **Spring WebSocket** | 3.3.5 | Real-time |
| **Spring Data JPA** | 3.3.5 | ORM поверх Hibernate 6 |
| **Spring Data Redis** | 3.3.5 | Redis-клиент + Pub/Sub |
| **Spring Validation** | 3.3.5 | Bean Validation (Jakarta) |
| **Spring Actuator** | 3.3.5 | Health checks + metrics |
| **springdoc-openapi** | 2.6.0 | Swagger UI / OpenAPI 3 |
| **PostgreSQL JDBC** | 42.x | Драйвер |
| **HikariCP** | 5.x | Пул соединений (5..20) |
| **Flyway** | 10.x | Миграции БД |
| **Hibernate** | 6.x | ORM |
| **Lettuce** | 6.x | Async Redis-клиент |
| **Maven** | 3.9+ | Сборка |
| **JUnit Jupiter** | 5.10 | Тесты |
| **Mockito** | 5.x | Моки в тестах |

---

## 🗂️ Структура проекта

```
backend-java/
├── pom.xml                                # Maven конфигурация
├── README.md                              # Этот файл
├── MIGRATION.md                           # Подробный mapping Go → Java
├── PARITY_AUDIT.md                        # Аудит паритета с Go
└── src/
    ├── main/
    │   ├── java/com/onlineshop/
    │   │   ├── OnlineShopApplication.java   # Точка входа Spring Boot
    │   │   │
    │   │   ├── config/                      # Конфигурация
    │   │   │   ├── OpenApiConfig.java       # OpenAPI/Swagger (relative server)
    │   │   │   ├── RedisConfig.java         # RedisTemplate + listener container
    │   │   │   └── WebSocketConfig.java     # Регистрация WS-эндпоинтов
    │   │   │
    │   │   ├── controller/                  # REST + WS контроллеры
    │   │   │   ├── HealthController.java    # GET /api/v1/hello
    │   │   │   ├── UserController.java      # /api/v1/users (CRUD + balance)
    │   │   │   ├── RoomController.java      # /api/v1/rooms (комнаты, игроки, бусты)
    │   │   │   ├── RoundController.java     # /api/v1/rounds (история раундов)
    │   │   │   ├── TemplateController.java  # /api/v1/room-templates
    │   │   │   ├── FairRoomController.java  # /api/v1/fair-rooms (provably fair)
    │   │   │   └── AdminController.java     # /api/v1/admin (валидация, статистика)
    │   │   │
    │   │   ├── domain/
    │   │   │   ├── entity/                  # JPA-сущности
    │   │   │   │   ├── User.java
    │   │   │   │   ├── Room.java
    │   │   │   │   ├── RoomPlayer.java
    │   │   │   │   ├── RoomPlace.java
    │   │   │   │   ├── RoomBoost.java
    │   │   │   │   ├── RoomWinner.java
    │   │   │   │   ├── RoomTemplate.java
    │   │   │   │   ├── FairRoom.java
    │   │   │   │   └── FairPlayer.java
    │   │   │   └── enums/                   # Доменные enum-ы (lowercase storage)
    │   │   │       ├── RoomStatus.java      # new / starting_soon / playing / finished
    │   │   │       ├── GameType.java        # train / fridge
    │   │   │       ├── FairRoomState.java   # created / waiting / refunding / finished
    │   │   │       └── RiskLevel.java       # low / medium / high (+ ORDER map)
    │   │   │
    │   │   ├── dto/                         # Request/Response DTO
    │   │   │   ├── RoomDtos.java
    │   │   │   ├── TemplateDto.java
    │   │   │   ├── AdminDtos.java
    │   │   │   ├── FairRoomDto.java
    │   │   │   ├── CreateFairRoomRequest.java
    │   │   │   ├── JoinFairRoomRequest.java
    │   │   │   ├── JoinResultDto.java
    │   │   │   └── EconomicValidationResult.java
    │   │   │
    │   │   ├── repository/                  # Spring Data JPA репозитории
    │   │   │   ├── UserRepository.java
    │   │   │   ├── RoomRepository.java
    │   │   │   ├── RoomPlayerRepository.java
    │   │   │   ├── RoomPlaceRepository.java
    │   │   │   ├── RoomBoostRepository.java
    │   │   │   ├── RoomWinnerRepository.java
    │   │   │   ├── RoomTemplateRepository.java
    │   │   │   ├── FairRoomRepository.java
    │   │   │   └── FairPlayerRepository.java
    │   │   │
    │   │   ├── service/                     # Бизнес-логика
    │   │   │   ├── UserService.java
    │   │   │   ├── RoomService.java         # join/leave/boost + формулы вероятности
    │   │   │   ├── FairRoomService.java     # seed, auto-scale (70% rule), refund
    │   │   │   ├── AdminStatsService.java   # парсинг временных фильтров, метрики
    │   │   │   ├── TemplateLifecycleService.java # canDelete/canUpdate
    │   │   │   ├── EconomicValidator.java   # привлекательность игры/комиссия
    │   │   │   └── RngClient.java           # внешний RNG + локальный fallback
    │   │   │
    │   │   ├── scheduler/                   # @Scheduled job-ы
    │   │   │   ├── BotManagerJob.java       # 10s: создаёт/пополняет ботов
    │   │   │   ├── RoomStarterJob.java      # 1s: добивает ботами + старт
    │   │   │   └── RoomFinisherJob.java     # 1s: weighted RNG + выплата
    │   │   │
    │   │   ├── events/                      # Redis Pub/Sub bridge
    │   │   │   ├── EventPublisher.java
    │   │   │   ├── RoomEventListener.java
    │   │   │   ├── RoomEvent.java
    │   │   │   ├── PlayerJoinedData.java
    │   │   │   ├── BoostAppliedData.java
    │   │   │   ├── RoomStartingData.java
    │   │   │   └── GameFinishedData.java
    │   │   │
    │   │   ├── websocket/
    │   │   │   └── RoomWebSocketHandler.java # Bridge Redis → WS клиентам
    │   │   │
    │   │   ├── exception/                   # Сентиналы и обработчик
    │   │   │   ├── DomainExceptions.java    # InsufficientBalance, RoomFull, ...
    │   │   │   └── GlobalExceptionHandler.java # → HTTP 402/404/409/500
    │   │   │
    │   │   └── util/
    │   │       └── SeedGenerator.java       # SHA-256 для provably fair
    │   │
    │   └── resources/
    │       ├── application.yml              # Основная конфигурация
    │       └── db/migration/
    │           └── V1__init_schema.sql      # Консолидация 18 Go-миграций
    │
    └── test/java/com/onlineshop/            # Unit-тесты (JUnit 5)
        ├── AdminStatsServiceTest.java       # 10 тестов
        ├── EconomicValidatorTest.java       # 3 теста
        ├── FairRoomsUnitTest.java           # 11 тестов
        ├── RngClientTest.java               # 7 тестов
        └── TemplateLifecycleServiceTest.java # 9 тестов
```

---

## 🗄️ База данных

Миграция `V1__init_schema.sql` создаёт 9 таблиц, эквивалентных результату прогона всех 18 Go-миграций.

### `users`
| Поле | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | Идентификатор |
| `name` | VARCHAR(255) | Имя |
| `balance` | INTEGER | Баланс (целочисленная игровая валюта) |
| `bot` | BOOLEAN | Является ли ботом |
| `created_at` | TIMESTAMPTZ | Дата создания |

### `rooms`
| Поле | Тип | Описание |
|---|---|---|
| `room_id` | SERIAL PK | ID комнаты |
| `jackpot` | INTEGER | Текущий джекпот |
| `entry_cost` | INTEGER | Стоимость входа |
| `players_needed` | INTEGER | Сколько игроков нужно для финиша |
| `min_players` | INTEGER CHECK 1..players_needed | Минимум реальных игроков для старта таймера |
| `winner_pct` | INTEGER CHECK 1..99 | Процент призового фонда |
| `status` | VARCHAR(20) | `new` / `starting_soon` / `playing` / `finished` |
| `start_time` | TIMESTAMPTZ | Время старта |
| `round_duration_seconds` | INTEGER CHECK 10..3600 | Длительность раунда |
| `start_delay_seconds` | INTEGER CHECK 5..600 | Задержка перед стартом |
| `game_type` | VARCHAR(20) CHECK in ('train','fridge') | Тип визуализации |
| `template_id` | INTEGER FK → room_templates | Шаблон-источник |
| `created_at`, `updated_at` | TIMESTAMPTZ | Метаданные |

### `room_players`
| Поле | Тип | Описание |
|---|---|---|
| `room_id` | INTEGER FK | Комната |
| `user_id` | INTEGER FK | Игрок |
| `place_id` | INTEGER FK → room_places | Конкретное место |
| `joined_at` | TIMESTAMPTZ | Время входа |

PK: `(room_id, user_id, place_id)` (миграция 015).

### `room_places`
Реляционная замена `room_players.places INTEGER` (миграции 014–015): `(room_id, place_index)` PK + CASCADE DELETE.

### `room_boosts`
| Поле | Тип |
|---|---|
| `room_id, user_id` | PK |
| `amount` | INTEGER |

UNIQUE (`room_id`, `user_id`) — один буст на игрока.

### `room_winners`
| Поле | Тип |
|---|---|
| `room_id, user_id` | PK |
| `prize` | INTEGER |

### `room_templates`
Все настройки игры (`round_duration_seconds`, `start_delay_seconds`, `game_type`, `min_players`, `winner_pct`) с теми же CHECK-ограничениями, что и у `rooms`. `game_type` default — `'train'`.

### `fair_rooms` / `fair_players`
Используют `NUMERIC(18,8)` (вещественные deposits/balances) — единственное место с decimals.

---

## ⚙️ Конфигурация

Все параметры читаются из переменных окружения (Spring Boot `${VAR:default}`-синтаксис в `application.yml`).

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `8080` | HTTP-порт Spring Boot |
| `PGHOST` | `localhost` | Хост PostgreSQL |
| `PGPORT` | `5432` | Порт PostgreSQL |
| `PGDATABASE` | `online_shop` | Имя БД |
| `PGUSER` | `postgres` | Пользователь БД |
| `PGPASSWORD` | `postgres` | Пароль БД |
| `REDIS_HOST` | `localhost` | Хост Redis |
| `REDIS_PORT` | `6379` | Порт Redis |
| `REDIS_PASSWORD` | (пусто) | Пароль Redis |
| `RNG_BASE_URL` | `http://localhost:9000` | URL внешнего RNG-сервиса (есть локальный fallback) |

Прочее в `application.yml`:

```yaml
app:
  scheduler:
    room-starter-fixed-rate: 1000   # ms
    room-finisher-fixed-rate: 1000  # ms
    bot-manager-fixed-rate: 10000   # ms
spring:
  jpa:
    hibernate:
      ddl-auto: validate            # схема создаётся только Flyway
  flyway:
    enabled: true
    baseline-on-migrate: true
```

---

## 🚀 Установка и запуск

### Требования

- Java 17+ (рекомендуется 21)
- Maven 3.9+
- PostgreSQL 15+ (сервер запущен и доступен)
- Redis 7+ (можно поднять локально)

### Запуск в Replit

В этом репозитории воркфлоу **`Backend Java`** уже настроен и запускается одной командой:

1. Поднимает Redis в фоне (`redis-server --daemonize yes --port 6379 ...`).
2. Создаёт БД `online_shop`, если её ещё нет.
3. Запускает `mvn -q spring-boot:run` из `backend-java/`.
4. Ждёт открытия порта **8080**.

```bash
# вручную (если нужно)
redis-server --daemonize yes --port 6379 --bind 127.0.0.1 --save '' --appendonly no
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE \
  -c "CREATE DATABASE online_shop;" 2>/dev/null
cd backend-java
PGDATABASE=online_shop REDIS_HOST=127.0.0.1 REDIS_PORT=6379 mvn -q spring-boot:run
```

### Локальный запуск (вне Replit)

```bash
# 1. Поднять Postgres + Redis (можно через docker-compose из backend/db/)
cd backend && make databases && cd ..

# 2. Создать БД (один раз)
createdb online_shop

# 3. Запустить приложение
cd backend-java
mvn spring-boot:run
```

Flyway применит `V1__init_schema.sql` автоматически при первом запуске.

### Сборка JAR

```bash
cd backend-java
mvn -q -DskipTests package
java -jar target/online-shop-java-1.0.0.jar
```

### Проверка работоспособности

```bash
curl http://localhost:8080/actuator/health      # {"status":"UP"}
curl http://localhost:8080/api/v1/users         # 50 ботов уже создано
curl http://localhost:8080/api/v1/rooms         # {"rooms":[]}
```

---

## 📖 API документация (Swagger)

После запуска доступны:

- **Swagger UI** — `http://localhost:8080/swagger-ui/index.html`
- **OpenAPI JSON** — `http://localhost:8080/v3/api-docs`

В `OpenApiConfig` сервер настроен как относительный (`/`), поэтому кнопка **Try it out** работает через любой прокси (включая Replit).

### Полный список эндпоинтов

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/v1/hello` | Smoke-test |
| **Users** ||
| POST | `/api/v1/users` | Создать пользователя |
| GET | `/api/v1/users` | Список пользователей |
| GET | `/api/v1/users/{id}` | Пользователь по ID |
| POST | `/api/v1/users/{id}/balance/increase` | Увеличить баланс |
| POST | `/api/v1/users/{id}/balance/decrease` | Уменьшить баланс |
| PUT | `/api/v1/users/{id}/balance` | Установить баланс |
| **Rooms** ||
| POST | `/api/v1/rooms` | Создать комнату (можно из template) |
| GET | `/api/v1/rooms` | Список комнат |
| GET | `/api/v1/rooms/{roomId}` | Детали комнаты |
| POST | `/api/v1/rooms/validate` | Валидация конфига комнаты |
| POST | `/api/v1/rooms/{roomId}/players` | Войти в комнату |
| GET | `/api/v1/rooms/{roomId}/players` | Список игроков |
| GET | `/api/v1/rooms/{roomId}/winners` | Победитель комнаты |
| GET | `/api/v1/rooms/{roomId}/winners/{userId}` | Запись о победе |
| POST | `/api/v1/rooms/{roomId}/boosts` | Применить буст |
| GET | `/api/v1/rooms/{roomId}/boosts` | Бусты в комнате |
| GET | `/api/v1/rooms/{roomId}/boosts/calc/probability` | Расчёт вероятности |
| GET | `/api/v1/rooms/{roomId}/boosts/calc/boost` | Расчёт нужного буста |
| **Rounds** ||
| GET | `/api/v1/rounds` | История раундов |
| GET | `/api/v1/rounds/{roomId}` | Раунд по комнате |
| GET | `/api/v1/rounds/{roomId}/details` | Полная история (с участниками, бустами, победителем) |
| **Room templates** ||
| POST | `/api/v1/room-templates` | Создать шаблон |
| GET | `/api/v1/room-templates` | Список шаблонов |
| GET | `/api/v1/room-templates/{id}` | Шаблон по ID |
| **Fair rooms** ||
| POST | `/api/v1/fair-rooms` | Создать fair-комнату |
| GET | `/api/v1/fair-rooms?risk_level=low` | Список (фильтр по риску) |
| GET | `/api/v1/fair-rooms/{id}` | Детали |
| POST | `/api/v1/fair-rooms/{id}/join` | Войти |
| POST | `/api/v1/fair-rooms/{id}/start` | Начать игру (раскрытие seed) |
| **Admin** ||
| POST | `/api/v1/admin/templates/validate` | Валидация шаблона по истории |
| GET | `/api/v1/admin/statistics/templates` | Метрики по всем шаблонам |
| GET | `/api/v1/admin/statistics/templates/{id}` | Метрики одного шаблона |
| GET | `/api/v1/admin/templates/{id}/status` | Можно ли удалить/изменить |
| GET | `/api/v1/admin/metrics/historical` | Исторические метрики (фильтр по времени) |
| **Health / Metrics** ||
| GET | `/actuator/health` | Health check |
| GET | `/actuator/metrics` | Метрики JVM/HTTP |

### WebSocket

- Эндпоинт: `ws://localhost:8080/ws/rooms`
- Сообщения от сервера приходят при наступлении событий в комнатах (player_joined, boost_applied, room_starting, game_started, game_finished).

---

## 🎮 Игровые механики

### 1. Создание комнаты

Комната создаётся либо вручную (`POST /api/v1/rooms` с явными параметрами), либо из шаблона (`template_id`). При создании из шаблона все параметры наследуются, но могут быть переопределены.

### 2. Вход игрока

`POST /api/v1/rooms/{id}/players` с `user_id`:

1. Списывает `entry_cost` с баланса (при недостатке → **HTTP 402** Payment Required).
2. Резервирует следующее свободное место (`room_places`), создаёт `room_players`.
3. Добавляет `entry_cost` в `jackpot`.
4. Если число реальных игроков ≥ `min_players` и комната `new` → переводит в `starting_soon`, выставляет `start_time = now + start_delay_seconds`.
5. Публикует `PlayerJoinedData` в Redis.

### 3. Бусты

`POST /api/v1/rooms/{id}/boosts` с `user_id, amount`:

- Уникальность по `(room_id, user_id)` (UNIQUE constraint) → при повторе **HTTP 409**.
- Списывает `amount` (при нехватке → **HTTP 402**).
- Увеличивает `jackpot` и шансы пользователя.

**Формулы (идентичны Go):**

```
probability(p)   = 100 * (totalPlayerAmount + boost) / (poolBase + acc + boost)
requiredBoost(p) = ceil((p * (poolBase + acc) - 100 * totalPlayer) / (100 - p))
```

### 4. Автостарт комнат (`RoomStarterJob`, 1 секунда)

Для каждой комнаты в статусе `starting_soon` с `start_time ≤ now`:

1. Считает недостающих игроков.
2. Подбирает ботов с `balance ≥ entry_cost`.
3. Резервирует им места + `room_players`, списывает `entry_cost`.
4. Переводит комнату в `playing`, публикует `game_started`.

Для комнат с `start_time > now` публикует `RoomStartingData` с обратным отсчётом.

### 5. Финиш комнаты (`RoomFinisherJob`, 1 секунда)

Для комнат в `playing`:

1. Считает `prize = jackpot * winner_pct / 100`.
2. **Weighted RNG** по сумме `entry_cost * places + boost` для каждого игрока.
3. Зовёт `RngClient.selectRandom(max, roomId, playerCount)` с локальным fallback.
4. Кредитует приз победителю, переводит в `finished`, публикует `GameFinishedData`.

### 6. Боты (`BotManagerJob`, 10 секунд)

- Поддерживает целевое количество ботов (по умолчанию из ENV).
- Создаёт ботов с именами вида `{РусскоеИмя}_{1..9999}` и балансом 500 (35 русских имён, см. список в `BotManagerJob`).
- Пополняет ботов с `balance < 500` на `+200`.

---

## 🔐 Provably Fair

Реализовано в `FairRoomService` + `SeedGenerator`:

1. **Seed** — случайная фраза, генерируемая при создании комнаты.
2. **SeedHash** — `sha256(seed)`, отдаётся клиенту сразу.
3. **Reveal** — оригинальная фраза публикуется при старте игры — клиент может проверить хэш.
4. **Auto-scaling 70%** (`checkAndScale`): если ≥ 70% активных комнат имеют ≥ 70% заполнения — автоматически создаётся новая.
5. **RiskLevelOrder** — апселл рисков:
   - `low` → видит [low, medium, high]
   - `medium` → видит [medium, high]
   - `high` → видит [high]
6. **Refund** — пропорциональный возврат депозитов с минимумом 1 единицы каждому участнику при отмене.

---

## 🧪 Тестирование

40 unit-тестов на JUnit 5 + Mockito. Покрывают весь набор Go-тестов 1:1.

```bash
cd backend-java
mvn test
```

### Состав

| Класс | Тесты | Аналог в Go |
|---|---|---|
| `AdminStatsServiceTest` | 10 | `internal/service/admin_stats_service_test.go` (валидация шаблонов + парсинг временных фильтров) |
| `EconomicValidatorTest` | 3 | сценарии экономической валидации |
| `FairRoomsUnitTest` | 11 | `tests/fair_rooms/unit_test.go` (auto-scale, risk levels, seed hash, refund) |
| `RngClientTest` | 7 | `tests/rng/rng_test.go` (внешний RNG + fallback в 5 сценариях) |
| `TemplateLifecycleServiceTest` | 9 | `internal/service/template_lifecycle_test.go` (canDelete/canUpdate) |
| **Итого** | **40** | |

### Запуск отдельных тестов

```bash
mvn -q test -Dtest=RngClientTest
mvn -q test -Dtest=FairRoomsUnitTest#autoScale_thresholdMet
```

### Текущий статус

```
Tests run: 40, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

---

## ✅ Паритет с Go

Полная таблица отличий и их статус — в **`PARITY_AUDIT.md`**. Краткая сводка ключевых правок:

| Область | Статус |
|---|---|
| Схема БД (18 миграций → V1) | ✅ полный паритет |
| Денежные поля (`INTEGER` для игровой валюты, `NUMERIC(18,8)` только в fair-rooms) | ✅ |
| Enum-ы (`lowercase` storage: `new`/`train`/`low`/...) | ✅ |
| HTTP-коды ошибок (402 / 404 / 409 / 500) | ✅ |
| Канал Redis Pub/Sub `room:{id}` + типизированные payload | ✅ |
| Формулы буста (`probability`, `requiredBoost`) | ✅ |
| BotManager: 35 русских имён, баланс 500, `+200` refill | ✅ |
| RoomStarter: добивание ботами, переход в `playing`, события | ✅ |
| RoomFinisher: weighted RNG по ставкам, `winner_pct`-выплата | ✅ |
| Внешний RNG: `?max=&room_id=&player_count=` + `{result}` + fallback | ✅ |
| Fair-rooms: 70%-auto-scale, RiskLevelOrder, refund-логика | ✅ |

---

## 💻 Разработка

### Добавить новый эндпоинт

1. Создать DTO в `dto/`.
2. Добавить метод в нужный `*Repository` (Spring Data — derived query или `@Query`).
3. Реализовать бизнес-логику в `*Service` (с `@Transactional`).
4. Добавить метод в `*Controller` с аннотациями `@GetMapping/@PostMapping`.
5. Покрыть тестом в `src/test/java/...`.

### Добавить миграцию БД

Поскольку используется Flyway и одна консолидированная миграция:

- **Способ 1 (рекомендуемо)** — создать `V2__<имя>.sql` в `src/main/resources/db/migration/`. Flyway автоматически применит её при следующем запуске.
- **Способ 2** — изменять `V1__init_schema.sql` допустимо только до первого деплоя; после — только новые `V2`, `V3`, ...

### Добавить шедулер

```java
@Component
public class MyJob {
    @Scheduled(fixedRateString = "${app.scheduler.my-job-rate:5000}")
    public void tick() { /* ... */ }
}
```

И добавить параметр в `application.yml` под `app.scheduler.*`.

### Транзакции

```java
@Service
public class MyService {
    @Transactional
    public Result doStuff(...) {
        // несколько repo.save()/delete() — всё в одной транзакции
    }
}
```

### Отладка

```bash
# Логи приложения (workflow Backend Java) — через панель Workspace
# или
tail -f /tmp/logs/Backend_Java_*.log

# Подключение к БД
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d online_shop
\dt                                # список таблиц
SELECT * FROM users LIMIT 5;

# Redis
redis-cli
KEYS *
PUBSUB CHANNELS
SUBSCRIBE 'room:1'
```

### Best Practices

1. **`@Transactional`** на всех write-методах в сервисах.
2. **DTO ≠ entity**: сущности не утекают в JSON.
3. **`@Validated`** + `jakarta.validation` аннотации в DTO.
4. **Нативные exception-ы** из `DomainExceptions` → автоматически маппятся в HTTP-коды.
5. **Не использовать `EntityManager` напрямую** без необходимости — Spring Data достаточно.
6. **Логировать через SLF4J** (`private static final Logger log = LoggerFactory.getLogger(...)`).
7. **Никаких `Thread.sleep`** в шедулерах — только `@Scheduled(fixedRate=...)`.
8. **`ddl-auto: validate`** — менять схему только через Flyway.

---

## 📚 Дополнительные ресурсы

- [`MIGRATION.md`](MIGRATION.md) — построчный mapping Go-кода в Java-классы.
- [`PARITY_AUDIT.md`](PARITY_AUDIT.md) — полный аудит расхождений и их фиксов.
- [`../backend/README.md`](../backend/README.md) — эталонная Go-документация.
- [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/3.3.5/reference/html/)
- [springdoc-openapi](https://springdoc.org/)
- [Flyway Documentation](https://documentation.red-gate.com/fd)
- [Spring Data JPA](https://docs.spring.io/spring-data/jpa/reference/)

---

## 📄 Лицензия

Проект разработан в рамках конкурса. Все права защищены.

---

**Последнее обновление**: 2026-04-22
**Версия документации**: 1.0 (Java port)
