# 🎮 OnlineShop — Lottery Room Platform

> **Полная документация проекта**: Платформа быстрых бонусных игр с лотерейными комнатами, автоматическим управлением, ботами, системой бустов и provably fair механикой.

---

## 📋 Содержание

1. [Обзор проекта](#-обзор-проекта)
2. [Архитектура системы](#-архитектура-системы)
3. [Технологический стек](#-технологический-стек)
4. [Структура проекта](#-структура-проекта)
5. [База данных](#-база-данных)
6. [Конфигурация](#-конфигурация)
7. [Установка и запуск](#-установка-и-запуск)
8. [API документация](#-api-документация)
9. [Игровые механики](#-игровые-механики)
10. [Provably Fair система](#-provably-fair-система)
11. [Тестирование](#-тестирование)
12. [Недостающие функции](#-недостающие-функции)
13. [Разработка](#-разработка)

---

## 🎯 Обзор проекта

Это платформа для проведения быстрых бонусных игр (лотерейных комнат), разработанная в рамках конкурса. Система поддерживает:

- **Создание и управление игровыми комнатами** с настраиваемыми параметрами
- **Автоматический матчмейкинг** и подбор комнат для игроков
- **Систему бустов** для увеличения шансов на победу
- **Автоматическое заполнение ботами** для быстрого старта игр
- **Real-time обновления** через WebSocket
- **Provably Fair механику** для честной игры с криптографической проверкой
- **Динамическое масштабирование** комнат по правилу 70%
- **Экономическую модель** с конфигуратором и валидацией

### Ключевые особенности

- **Микросервисная архитектура**: API, Bot Manager, Room Manager работают независимо
- **Транзакционная целостность**: все критические операции выполняются атомарно
- **UUID v4 для безопасности**: исключает перебор и предсказание ID
- **Криптографическая честность**: SHA-256 seed verification для provably fair игр
- **Автоматизация**: боты, старт комнат, определение победителей — всё автоматически

---

## 🏗️ Архитектура системы

Система построена по принципу **чистой архитектуры** с разделением на слои:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  Vite + TypeScript + TailwindCSS + shadcn/ui                │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────────┐
│                   API Service (Go)                           │
│  Gin + Huma v2 (OpenAPI) + WebSocket Handler                │
└─────┬──────────────┬──────────────┬────────────────────────┘
      │              │              │
      ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│   Bot    │  │  Room    │  │   Database   │
│ Manager  │  │ Manager  │  │  PostgreSQL  │
│ Service  │  │ Service  │  │   + Redis    │
└──────────┘  └──────────┘  └──────────────┘
```

### Микросервисы

1. **API Service** (`services/api`)
   - HTTP REST API с OpenAPI документацией
   - WebSocket для real-time обновлений
   - Обработка всех клиентских запросов
   - Порт: 8888 (по умолчанию)

2. **Bot Manager** (`services/bot_manager`)
   - Автоматическое создание и управление ботами
   - Пополнение балансов ботов
   - Cron: каждые 10 секунд
   - Целевое количество ботов: 400 (настраивается)

3. **Room Manager** (`services/room_manager`)
   - Автоматический старт комнат (RoomStarter)
   - Определение победителей (RoomFinisher)
   - Cron: каждую 1 секунду
   - Заполнение комнат ботами

### Слои приложения

```
HTTP Request
    │
    ▼
Handler (handlers/ + internal/handler/)
    │  Huma-типизированные Input/Output
    │  Валидация UUID, маппинг ошибок в HTTP-коды
    ▼
Service (internal/service/)
    │  Бизнес-логика: seed, auto-scale, refund
    │  Управление транзакциями
    ▼
Repository (repository/ + internal/repository/)
    │  CRUD операции, агрегация данных
    │  Сгенерированный sqlc код
    ▼
PostgreSQL (pgx/v5 pool)
```

---

## 📦 Технологический стек

### Backend

| Технология | Версия | Назначение |
|---|---|---|
| **Go** | 1.25.5 | Основной язык программирования |
| **Gin** | 1.11.0 | HTTP-роутер и middleware |
| **Huma v2** | 2.35.0 | OpenAPI-обёртка, автоматическая валидация и документация |
| **PostgreSQL** | 15 | Основная реляционная база данных |
| **Redis** | 7-alpine | Pub/Sub для real-time, кэширование |
| **pgx/v5** | 5.8.0 | Высокопроизводительный драйвер PostgreSQL + connection pool |
| **sqlc** | 2.x | Генерация типобезопасного Go-кода из SQL |
| **Goose** | - | Система миграций базы данных |
| **go-redis/v9** | 9.17.3 | Redis-клиент для Go |
| **eon** | 0.1.1 | Легковесный планировщик cron-задач |
| **godotenv** | 1.5.1 | Загрузка переменных окружения из .env |
| **envconfig** | 1.4.0 | Парсинг конфигурации из environment variables |
| **golang-jwt/v5** | 5.3.1 | JWT токены (зарезервировано для аутентификации) |
| **google/uuid** | 1.6.0 | Генерация UUID v4 |
| **gorilla/websocket** | 1.5.3 | WebSocket сервер |
| **Docker Compose** | - | Оркестрация контейнеров (PostgreSQL, Redis, Frontend) |

### Frontend

| Технология | Версия | Назначение |
|---|---|---|
| **React** | 19.2.4 | UI библиотека |
| **TypeScript** | 6.0.2 | Типизация |
| **Vite** | 8.0.4 | Сборщик и dev-сервер |
| **TailwindCSS** | 4.2.2 | Utility-first CSS фреймворк |
| **shadcn/ui** | 4.3.0 | Компонентная библиотека |
| **@base-ui/react** | 1.4.0 | Базовые UI компоненты |
| **lucide-react** | 1.8.0 | Иконки |
| **class-variance-authority** | 0.7.1 | Управление вариантами стилей |
| **ESLint** | 9.39.4 | Линтер |

### Инструменты разработки

- **Make** — автоматизация команд
- **Bash** — скрипты тестирования
- **Git** — контроль версий
- **Docker** — контейнеризация

---

## 🗂️ Структура проекта

```
OnlineShop/
├── backend/                    # Backend приложение (Go)
│   ├── services/              # Микросервисы
│   │   ├── api/              # HTTP API сервис (порт 8888)
│   │   │   └── main.go       # Точка входа, регистрация роутов
│   │   ├── bot_manager/      # Сервис управления ботами
│   │   │   └── main.go       # Cron: создание/пополнение ботов (10s)
│   │   └── room_manager/     # Сервис управления комнатами
│   │       └── main.go       # Cron: старт комнат + финиш (1s)
│   │
│   ├── handlers/             # HTTP обработчики (legacy rooms)
│   │   ├── hello_handler.go  # Тестовый endpoint
│   │   ├── user_handler.go   # CRUD пользователей
│   │   ├── room_handler.go   # CRUD комнат, вход/выход, бусты
│   │   ├── round_handler.go  # История раундов
│   │   ├── template_handler.go # Шаблоны комнат
│   │   └── ws_handler.go     # WebSocket для real-time
│   │
│   ├── internal/             # Внутренняя бизнес-логика
│   │   ├── config.go         # Загрузка конфигурации (godotenv + envconfig)
│   │   ├── database.go       # Подключение к PostgreSQL и Redis
│   │   ├── crons/            # Cron-задачи
│   │   │   ├── bot_manager.go    # Логика управления ботами
│   │   │   ├── room_starter.go   # Автостарт комнат
│   │   │   └── room_finisher.go  # Определение победителей
│   │   ├── domain/           # Доменные модели
│   │   │   └── fair_room.go  # FairRoom, FairPlayer, RiskLevel, RoomState
│   │   ├── handler/          # HTTP обработчики (fair rooms)
│   │   │   └── room_handler.go # Huma handlers для provably fair
│   │   ├── repository/       # Репозитории (fair rooms)
│   │   │   ├── room_repo.go  # CRUD fair_rooms, агрегация player_count
│   │   │   └── player_repo.go # CRUD fair_players, refund логика
│   │   ├── service/          # Бизнес-логика (fair rooms)
│   │   │   └── room_service.go # Seed, auto-scale, refund, start game
│   │   └── redisclient/      # Redis pub/sub обёртка
│   │       └── pubsub.go     # Публикация событий комнат
│   │
│   ├── repository/           # Сгенерированный sqlc код (legacy)
│   │   ├── db.go             # DBTX интерфейс
│   │   ├── models.go         # Go структуры таблиц
│   │   ├── hello.sql.go      # Тестовые запросы
│   │   ├── users.sql.go      # Запросы пользователей
│   │   ├── rooms.sql.go      # Запросы комнат
│   │   ├── rounds.sql.go     # Запросы раундов
│   │   └── templates.sql.go  # Запросы шаблонов
│   │
│   ├── db/                   # База данных
│   │   ├── migrations/       # SQL миграции (Goose)
│   │   │   ├── 000001_create_users_table.sql
│   │   │   ├── 000002_create_rooms_tables.sql
│   │   │   ├── 000003_add_bot_to_users.sql
│   │   │   ├── 000004_add_entry_cost_to_rooms.sql
│   │   │   ├── 000005_add_finished_status_to_rooms.sql
│   │   │   ├── 000006_convert_decimals_to_integers.sql
│   │   │   ├── 000007_use_timestamptz.sql
│   │   │   ├── 000008_add_winner_pct_to_rooms.sql
│   │   │   ├── 000009_unique_boost_per_user_room.sql
│   │   │   ├── 000010_create_room_templates.sql
│   │   │   └── 000011_create_fair_rooms.sql
│   │   ├── queries/          # SQL запросы для sqlc
│   │   │   ├── hello.sql     # Тестовые запросы
│   │   │   ├── users.sql     # Запросы пользователей
│   │   │   ├── rooms.sql     # Запросы комнат (legacy)
│   │   │   ├── rounds.sql    # Запросы раундов
│   │   │   └── templates.sql # Запросы шаблонов
│   │   ├── docker-compose.yaml # PostgreSQL + Redis контейнеры
│   │   └── Dockerfile        # Кастомный PostgreSQL образ
│   │
│   ├── tests/                # Тесты
│   │   ├── api/              # Интеграционные тесты API (bash + curl)
│   │   │   └── run.sh        # 14 тестов HTTP endpoints
│   │   ├── room_management/  # Тесты управления комнатами (bash + psql)
│   │   │   └── run_tests.sh  # 13 тестов через БД
│   │   ├── boost_calc/       # Тесты формул буста (bash + curl)
│   │   │   └── run.sh        # 5 тестов расчётов вероятности
│   │   ├── websocket/        # Тесты WebSocket (Go)
│   │   │   ├── main.go       # WebSocket клиент
│   │   │   └── run.sh        # Запуск теста
│   │   └── fair_rooms/       # Unit-тесты provably fair (Go)
│   │       └── *_test.go     # 11 unit-тестов без БД
│   │
│   ├── mock/                 # Утилиты для тестирования
│   │   └── main.go           # Генерация тестовых данных
│   │
│   ├── .env                  # Переменные окружения
│   ├── go.mod                # Go зависимости
│   ├── go.sum                # Checksums зависимостей
│   ├── sqlc.yaml             # Конфигурация sqlc
│   ├── Makefile              # Команды для разработки
│   ├── README.md             # Документация backend
│   ├── algorithm.md          # Детальное описание алгоритмов
│   └── missing.md            # Список недостающих функций
│
├── frontend/                 # Frontend приложение (React)
│   ├── src/
│   │   ├── app/              # Корневой компонент приложения
│   │   │   └── App.tsx       # Роутинг auth/home
│   │   ├── pages/            # Страницы
│   │   │   ├── auth/         # Страница авторизации
│   │   │   └── home/         # Главная страница
│   │   ├── widgets/          # Виджеты (header и т.д.)
│   │   │   └── header/
│   │   ├── features/         # Фичи
│   │   │   ├── mock-auth/    # Mock авторизация
│   │   │   └── theme-toggle/ # Переключатель темы
│   │   ├── entities/         # Сущности
│   │   │   └── ticket/       # Тикет (комната)
│   │   ├── shared/           # Общие ресурсы
│   │   │   ├── api/          # API клиент
│   │   │   ├── assets/       # Статические файлы
│   │   │   ├── components/   # Переиспользуемые компоненты
│   │   │   ├── config/       # Конфигурация
│   │   │   ├── hooks/        # React хуки
│   │   │   ├── lib/          # Утилиты
│   │   │   ├── types/        # TypeScript типы
│   │   │   └── ui/           # UI компоненты (shadcn)
│   │   ├── main.tsx          # Точка входа React
│   │   └── index.css         # Глобальные стили
│   │
│   ├── public/               # Публичные файлы
│   ├── package.json          # npm зависимости
│   ├── package-lock.json     # Lockfile
│   ├── vite.config.ts        # Конфигурация Vite
│   ├── tsconfig.json         # TypeScript конфигурация
│   ├── tsconfig.app.json     # TypeScript для приложения
│   ├── tsconfig.node.json    # TypeScript для Node.js
│   ├── eslint.config.js      # ESLint конфигурация
│   ├── components.json       # shadcn/ui конфигурация
│   └── README.md             # Документация frontend
│
├── docker/                   # Docker конфигурация
│   ├── docker-compose.yml    # Frontend контейнер
│   └── frontend.Dockerfile   # Dockerfile для frontend
│
├── Makefile                  # Команды для всего проекта
└── PROJECT.txt               # Требования конкурса
```

### Архитектурные паттерны

- **Feature-Sliced Design** (frontend) — организация по фичам, а не по типам файлов
- **Clean Architecture** (backend) — разделение на handler → service → repository
- **Repository Pattern** — изоляция логики работы с БД
- **CQRS-подобный подход** — разделение команд (Create, Update) и запросов (Get, List)

---

## ⚙️ Конфигурация

Все параметры загружаются из файла `.env` через `godotenv` + `envconfig`.

| Переменная | Описание |
|---|---|
| `GOOSE_DBSTRING` | URL подключения к PostgreSQL |
| `REDIS_URL` | Адрес Redis (`host:port`) |
| `ACCESS_TOKEN_SECRET` | Секрет для access JWT |
| `REFRESH_TOKEN_SECRET` | Секрет для refresh JWT |
| `ACCESS_TOKEN_EXPIRY` | Время жизни access-токена |
| `REFRESH_TOKEN_EXPIRY` | Время жизни refresh-токена |
| `PORT` | Порт HTTP API |
| `API_TEST` | Тестовый режим (`true`/`false`) |
| `USER_CART_EXPIRY` | TTL корзины пользователя (по умолчанию `720h`) |
| `DESIRED_BOT_COUNT` | Желаемое количество ботов (по умолчанию `10`) |

---

## 🚀 Запуск

### 1. Поднять базы данных

```bash
make databases
```

Запускает PostgreSQL и Redis через Docker Compose (`db/docker-compose.yaml`).

### 2. Применить миграции и сгенерировать код

```bash
make migrate
```

Выполняет `goose up` + `sqlc generate`.

### 3. Запустить все сервисы

```bash
make serve
```

Запускает три процесса параллельно:
- `services/api` — HTTP API на порту из `PORT`
- `services/bot_manager` — менеджер ботов
- `services/room_manager` — менеджер комнат

### Запуск только API

```bash
make api-test
```

### Остановить базы данных

```bash
make databases-down
```

---

## 🗄️ Схема базы данных

### `users`
| Поле | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | Идентификатор |
| `name` | VARCHAR(255) | Имя пользователя |
| `balance` | INTEGER | Баланс (игровая валюта) |
| `bot` | BOOLEAN | Является ли ботом |
| `created_at` | TIMESTAMPTZ | Дата создания |

### `rooms`
| Поле | Тип | Описание |
|---|---|---|
| `room_id` | SERIAL PK | Идентификатор комнаты |
| `jackpot` | INTEGER | Текущий джекпот |
| `entry_cost` | INTEGER | Стоимость входа |
| `players_needed` | INTEGER | Необходимое число игроков |
| `status` | VARCHAR(20) | `new` / `starting_soon` / `playing` / `finished` |
| `start_time` | TIMESTAMPTZ | Время старта |
| `created_at` | TIMESTAMPTZ | Дата создания |
| `updated_at` | TIMESTAMPTZ | Дата обновления |

### `room_players`
| Поле | Тип | Описание |
|---|---|---|
| `room_id` | INTEGER FK | Комната |
| `user_id` | INTEGER FK | Игрок |
| `places` | INTEGER | Количество мест (множитель ставки) |
| `joined_at` | TIMESTAMPTZ | Время входа |

### `room_boosts`
| Поле | Тип | Описание |
|---|---|---|
| `room_id` | INTEGER FK | Комната |
| `user_id` | INTEGER FK | Игрок |
| `amount` | INTEGER | Сумма буста |
| `boosted_at` | TIMESTAMPTZ | Время буста |

### `room_winners`
| Поле | Тип | Описание |
|---|---|---|
| `room_id` | INTEGER FK | Комната |
| `user_id` | INTEGER FK | Победитель |
| `prize` | INTEGER | Приз |
| `won_at` | TIMESTAMPTZ | Время победы |

### `room_templates` (миграция 000010)
| Поле | Тип | Описание |
|---|---|---|
| `template_id` | SERIAL PK | Идентификатор шаблона |
| `name` | VARCHAR(255) UNIQUE | Название шаблона |
| `players_needed` | INTEGER | Необходимое число игроков |
| `entry_cost` | INTEGER | Стоимость входа |
| `winner_pct` | INTEGER | Процент джекпота победителю (по умолчанию 80) |
| `created_at` | TIMESTAMPTZ | Дата создания |
| `updated_at` | TIMESTAMPTZ | Дата обновления |

### `fair_rooms` (миграция 000011)
| Поле | Тип | Описание |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `risk_level` | ENUM | `low` / `medium` / `high` |
| `state` | ENUM | `created` → `waiting` → `refunding` → `finished` |
| `max_capacity` | INT | Максимум игроков (по умолчанию 10) |
| `seed_phrase` | TEXT | Секретная соль — **никогда не отдаётся в API напрямую** |
| `seed_hash` | TEXT | SHA-256 от `seed_phrase` — публичный |
| `final_fee` | NUMERIC(18,8) | `MIN(initial_deposit)` по комнате |
| `created_at` | TIMESTAMPTZ | Дата создания |
| `updated_at` | TIMESTAMPTZ | Дата обновления |

### `fair_players` (миграция 000011)
| Поле | Тип | Описание |
|---|---|---|
| `id` | UUID PK | Идентификатор |
| `room_id` | UUID FK | Комната (CASCADE DELETE) |
| `user_id` | UUID | Внешний идентификатор пользователя |
| `initial_deposit` | NUMERIC(18,8) | Депозит при входе |
| `refund_amount` | NUMERIC(18,8) | `initial_deposit − final_fee` (≥ 0) |
| `refunded` | BOOLEAN | Флаг: возврат обработан |

---

## 🌐 API

Базовый путь: `/api/v1`

Документация OpenAPI доступна по адресу `/api/v1/openapi.json` (генерируется Huma автоматически).

### 👤 Пользователи

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/users` | Создать пользователя |
| `GET` | `/users/{id}` | Получить пользователя |
| `DELETE` | `/users/{id}` | Удалить пользователя |

### 🏠 Комнаты

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/rooms` | Создать комнату |
| `GET` | `/rooms` | Список всех комнат |
| `GET` | `/rooms/{room_id}` | Получить комнату |

### 🧑‍🤝‍🧑 Игроки комнаты

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/rooms/{room_id}/players` | Войти в комнату |
| `DELETE` | `/rooms/{room_id}/players` | Покинуть комнату |
| `GET` | `/rooms/{room_id}/players` | Список игроков |

### 🏆 Победители

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/rooms/{room_id}/winners` | Список победителей |
| `GET` | `/rooms/{room_id}/winners/{user_id}` | Получить победителя |

### ⚡ Бусты

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/rooms/{room_id}/boosts` | Забустить комнату |
| `GET` | `/rooms/{room_id}/boosts` | Список бустов |
| `GET` | `/rooms/{room_id}/boosts/calc/probability` | Рассчитать вероятность |
| `GET` | `/rooms/{room_id}/boosts/calc/boost` | Рассчитать нужный буст |

### 📋 Шаблоны комнат

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/room-templates` | Создать шаблон |
| `GET` | `/room-templates` | Список шаблонов |
| `GET` | `/room-templates/{template_id}` | Получить шаблон |
| `PUT` | `/room-templates/{template_id}` | Обновить шаблон |
| `DELETE` | `/room-templates/{template_id}` | Удалить шаблон |

### 🎲 Provably Fair комнаты

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/fair-rooms` | Создать fair-комнату |
| `GET` | `/fair-rooms?risk_level=low` | Список доступных комнат (up-sell по уровню риска) |
| `GET` | `/fair-rooms/{id}` | Получить комнату; `seed_reveal` только при `finished` |
| `POST` | `/fair-rooms/{id}/join` | Войти в комнату; триггер auto-scale |
| `POST` | `/fair-rooms/{id}/start` | Запустить игру: refund + переход в `finished` |

### 🔌 WebSocket

| Путь | Описание |
|---|---|
| `GET /rooms/{room_id}/ws` | Подписка на real-time события комнаты (Gin, не Huma) |

---

## 🎲 Provably Fair комнаты

### Жизненный цикл

```
created ──(первый игрок)──► waiting ──(POST /start)──► refunding ──► finished
```

### Алгоритм честности (Provably Fair)

При создании комнаты генерируется криптографически случайный `seed_phrase` (32 байта, hex) и его SHA-256 хэш `seed_hash`. До старта игры API возвращает только `seed_hash` — игрок «замораживает» обязательство сервера. После перехода в `finished` API раскрывает `seed_phrase` через поле `seed_reveal`, и любой может проверить: `SHA-256(seed_phrase) == seed_hash`.

Поле `seed_phrase` помечено `json:"-"` и **никогда** не попадает в JSON напрямую.

### Алгоритм возврата (Refund)

```
final_fee = MIN(initial_deposit) по всем игрокам комнаты
refund_i  = MAX(0, initial_deposit_i − final_fee)
```

Всё выполняется атомарно в одной транзакции. При ошибке внешнего сервиса кредитования — полный откат.

### Динамическое масштабирование (Auto-Scale)

После каждого `JoinRoom` проверяется правило 70%: если ≥ 70% активных комнат того же `risk_level` заполнены на ≥ 70%, автоматически создаётся новая комната. Ответ `JoinRoom` содержит `scaled: true` и `new_room_id`.

### Up-sell по уровню риска

`GET /fair-rooms?risk_level=X` возвращает комнаты для уровней **X и выше**:

| Уровень игрока | Видит комнаты |
|---|---|
| `low` | low, medium, high |
| `medium` | medium, high |
| `high` | high |

---

## 🔁 Жизненный цикл комнаты (legacy)

```
new → starting_soon → playing → finished
```

### `new`
Комната только что создана, игроков нет.

### `starting_soon`
Первый игрок вошёл в комнату. Автоматически устанавливается `start_time = NOW() + 1 минута`.

### `playing`
`RoomStarter` (каждую секунду) проверяет комнаты со статусом `starting_soon`, у которых `start_time` уже наступил. Если игроков меньше `players_needed`, добирает ботов. Всё происходит в одной транзакции: добавление ботов + смена статуса на `playing`.

### `finished`
`RoomFinisher` (каждую секунду) проверяет комнаты со статусом `playing`, у которых `start_time + 30 секунд <= NOW()`. Выбирает победителя взвешенной случайностью, атомарно меняет статус на `finished`, начисляет приз и записывает победителя.

---

## 💰 Логика входа в комнату

Запрос `POST /rooms/{room_id}/players` выполняется одним атомарным SQL-запросом (`JoinRoomAndUpdateStatus`), который:

1. Проверяет, что у пользователя достаточно баланса (`balance >= entry_cost`).
2. Проверяет, что пользователь ещё не в комнате.
3. Проверяет, что статус комнаты `new` или `starting_soon`.
4. Проверяет, что в комнате есть свободные места (`count < players_needed`).
5. Вставляет запись в `room_players`.
6. Списывает `entry_cost` с баланса пользователя.
7. Добавляет `entry_cost` к джекпоту комнаты.
8. Если статус был `new` — меняет на `starting_soon` и устанавливает `start_time = NOW() + 1 минута`.

Если хотя бы одно условие не выполнено — ни одно изменение не применяется.

---

## 🚪 Логика выхода из комнаты

Запрос `DELETE /rooms/{room_id}/players` (`LeaveRoomAndUpdateStatus`):

1. Проверяет, что статус комнаты `new` или `starting_soon` (из `playing` выйти нельзя).
2. Удаляет игрока из `room_players`.
3. Возвращает `entry_cost` на баланс пользователя.
4. Уменьшает джекпот на `entry_cost` (минимум 0).
5. Если после выхода игроков не осталось — возвращает статус в `new`.

---

## ⚡ Логика буста

Запрос `POST /rooms/{room_id}/boosts` (`InsertRoomBoost`):

1. Проверяет, что статус комнаты `playing` (буст только в активной игре).
2. Проверяет, что у пользователя достаточно баланса.
3. Вставляет запись в `room_boosts`.
4. Списывает `amount` с баланса пользователя.
5. Добавляет `amount` к джекпоту комнаты.

---

## 📐 Формулы расчёта буста

### Термины

- `poolBase = players_needed × entry_cost` — базовый пул комнаты
- `acc` — сумма всех бустов в комнате
- `totalPlayerAmount` — ставка игрока: `places × entry_cost + boost_amount`

### Вероятность победы

```
probability = 100 × (totalPlayerAmount + boostAmount) / (poolBase + acc + boostAmount)
```

Эндпоинт: `GET /rooms/{room_id}/boosts/calc/probability?user_id=X&boost_amount=Y`

### Необходимый буст для желаемой вероятности

```
boostAmount = ceil( (p × (poolBase + acc) - 100 × totalPlayerAmount) / (100 - p) )
```

Эндпоинт: `GET /rooms/{room_id}/boosts/calc/boost?user_id=X&desired_probability=P`

Параметр `desired_probability` должен быть строго в диапазоне `(0, 100)`, иначе возвращается `400 Bad Request`.

Функции `CalcBoost` и `CalcProbability` являются обратными друг другу: буст, рассчитанный для вероятности `p`, при подстановке в формулу вероятности даёт результат `>= p`.

---

## 🤖 Менеджер ботов (`bot_manager`)

Запускается как отдельный сервис, выполняет cron-задачу каждые **10 секунд**:

1. Считает текущее количество ботов в БД.
2. Если ботов меньше `DESIRED_BOT_COUNT` — создаёт недостающих. Каждый бот получает случайное русское имя с числовым суффиксом (`Александр_4271`) и начальный баланс **500**.
3. Всем ботам с балансом < 500 начисляет +200 (пополнение баланса).

---

## 🎮 Менеджер комнат (`room_manager`)

Запускается как отдельный сервис, выполняет две cron-задачи каждую **1 секунду**:

### RoomStarter

- Получает все комнаты со статусом `starting_soon`.
- Для каждой, у которой `start_time <= NOW()`:
  - Считает текущих игроков.
  - Вычисляет `botsNeeded = players_needed - currentPlayers`.
  - Запрашивает доступных ботов (`GetAvailableBotsForRoom`): боты с `balance >= entry_cost`, не состоящие в этой комнате, в случайном порядке.
  - Если ботов недостаточно — комната не стартует.
  - В транзакции: добавляет всех ботов через `BotJoinRoom` + меняет статус на `playing`.
  - При любой ошибке — откат транзакции.

### RoomFinisher

- Получает все комнаты со статусом `playing`, у которых `start_time + 30 секунд <= NOW()`.
- Для каждой:
  - Получает всех игроков с их ставками (`GetPlayersWithStakes`).
  - Выбирает победителя взвешенной случайностью: вес каждого игрока = `total_stake / sum(total_stakes)`.
  - Атомарно (`FinishRoomAndAwardWinner`): меняет статус на `finished`, начисляет победителю **80% джекпота**, записывает в `room_winners`.

---

## 🧪 Тесты

### Unit-тесты Provably Fair комнат

```bash
cd backend && go test ./tests/fair_rooms/... -v
```

11 unit-тестов без зависимости от БД:
- Форма и корректность `seed_hash` (TC-01, TC-03, TC-19)
- Алгоритм возврата: стандартный случай, равные депозиты, один минимум (TC-04 – TC-06)
- Логика auto-scale: порог не достигнут, достигнут, одна комната (TC-07 – TC-09)
- Фильтрация up-sell через `RiskLevelOrder` (TC-10, TC-11)

### Интеграционные тесты API

```bash
make test-api
```

Запускает `tests/api/run.sh`, который поднимает API и прогоняет 14 тестов через HTTP:
создание/получение/удаление пользователей, создание/список/получение комнат, вход/выход игроков, бусты, победители.

### Тесты управления комнатами

```bash
cd tests/room_management && bash run_tests.sh
```

13 тестов напрямую через БД: проверка баланса при входе/выходе, защита от дублей, полная комната, автостарт с ботами, буст только в `playing`, автофиниш с выбором победителя.

### Тесты формул буста

```bash
make test-boost-calc
```

Запускает `tests/boost_calc/run.sh`. 5 тестов через HTTP:
- Вероятность при нулевом бусте
- Вероятность при ненулевом бусте
- Расчёт нужного буста
- Проверка обратности `CalcBoost` ↔ `CalcProbability`
- Валидация граничных значений `desired_probability`

### Тесты WebSocket

```bash
make test-websocket
```

Проверяет подключение и получение real-time событий через `GET /rooms/{room_id}/ws`.

---

## 🔧 Полезные команды

```bash
# Подключиться к PostgreSQL
make postgres

# Подключиться к Redis
make redis

# Пересоздать БД с сохранением данных
make recreate

# Сгенерировать sqlc-код
sqlc generate

# Применить миграции
goose up

# Откатить миграции
goose down

# Запустить все тесты
make test-all

# Unit-тесты fair rooms (без БД)
go test ./tests/fair_rooms/... -v

```

---

## 🚧 Недостающие функции

На основе требований проекта (`PROJECT.txt`) и документа `missing.md`, следующие функции требуют реализации:

### 1. WebSocket / Real-Time Updates (Сценарий 3)

**Статус**: Частично реализовано

- ✅ WebSocket handler существует (`handlers/ws_handler.go`)
- ✅ Redis pub/sub клиент реализован (`internal/redisclient/pubsub.go`)
- ❌ Нет автоматической публикации событий при изменении состояния комнаты
- ❌ Нет таймера обратного отсчёта (1 минута до старта)

**Требуется**:
- Публикация событий в Redis при: вход игрока, буст, старт комнаты, финиш
- Таймер countdown в frontend с синхронизацией через WebSocket

### 2. Фильтрация и сортировка комнат (Сценарий 1)

**Статус**: Не реализовано

`GET /rooms` возвращает все комнаты без фильтров.

**Требуется**:
- Query параметры: `entry_cost`, `players_needed`, `status`, `sort_by`, `sort_order`
- SQL запрос `ListRoomsFiltered` с динамическими WHERE/ORDER BY
- Обновление `room_handler.go` для обработки параметров

### 3. Конфигуратор комнат с валидацией (Сценарии 5 & 7)

**Статус**: Частично реализовано

- ✅ Endpoint `POST /rooms/validate` существует
- ❌ Нет логики валидации экономической модели

**Требуется**:
- Проверка привлекательности для игрока (ROI, вероятность победы)
- Проверка выгодности для организатора (комиссия, маржа)
- Предупреждения о неудачных конфигурациях

### 4. Ограничение бустов (один на игрока)

**Статус**: Реализовано на уровне БД

- ✅ UNIQUE constraint (`room_id`, `user_id`) в миграции 000009
- ❌ Нет явной обработки ошибки в handler

**Требуется**:
- Обработка конфликта с понятным сообщением об ошибке

### 5. Обработка недостаточного баланса (Сценарий 6)

**Статус**: Частично реализовано

- ✅ SQL запросы проверяют баланс
- ❌ Нет явных HTTP 402/409 ответов с описанием причины

**Требуется**:
- Явные коды ошибок: HTTP 402 Payment Required
- Сообщения: "Insufficient balance for entry" / "Insufficient balance for boost"

### 6. История раундов / Audit Log (Сценарий 8)

**Статус**: Частично реализовано

- ✅ Endpoint `GET /rounds` существует
- ❌ Возвращает только базовую информацию

**Требуется**:
- Полная информация: участники, бусты, победитель, изменения балансов
- JOIN через все связанные таблицы

### 7. Управление балансом пользователей

**Статус**: Реализовано

- ✅ Endpoint `PATCH /users/{id}/balance` добавлен
- ✅ Тестовые пользователи могут пополнять баланс

### 8. Список пользователей

**Статус**: Реализовано

- ✅ Endpoint `GET /users` зарегистрирован

### 9. Внешний RNG (Random Number Generator)

**Статус**: Не реализовано

**Требуется**:
- Конфигурация `RNG_URL` в `.env`
- HTTP клиент для вызова внешнего RNG API
- Fallback на локальный `math/rand` если не настроен

### 10. Настраиваемый процент призового фонда

**Статус**: Реализовано

- ✅ Поле `winner_pct` добавлено в таблицу `rooms` (миграция 000008)
- ✅ Используется в `FinishRoomAndAwardWinner`

### 11. Визуальная оболочка раунда (Сценарий 4)

**Статус**: Требуется frontend разработка

**Требуется**:
- Анимация розыгрыша (гонка, арена, карты и т.д.)
- Синхронизация с результатом от backend
- Быстрый переход к следующей игре после финиша

---

## 💻 Разработка

### Добавление нового endpoint

1. Создать SQL запрос в `db/queries/*.sql`
2. Запустить `sqlc generate`
3. Создать handler в `handlers/` или `internal/handler/`
4. Зарегистрировать route в `services/api/main.go`
5. Добавить тесты в `tests/api/`

### Добавление новой миграции

```bash
cd backend/db/migrations
goose create my_migration sql
# Редактировать созданный файл
goose up
sqlc generate
```

### Работа с транзакциями

```go
tx, err := pool.Begin(ctx)
if err != nil {
    return err
}
defer tx.Rollback(ctx)

// Выполнить операции через tx
qtx := repo.WithTx(tx)
result, err := qtx.SomeQuery(ctx, params)
if err != nil {
    return err
}

return tx.Commit(ctx)
```

### Добавление cron-задачи

1. Создать функцию в `internal/crons/`
2. Зарегистрировать в соответствующем сервисе (`bot_manager` или `room_manager`)
3. Использовать `eon.Schedule()` для периодического выполнения

### Отладка

```bash
# Логи PostgreSQL
docker logs kubok-postgres

# Логи Redis
docker logs kubok-redis

# Проверка подключения к БД
make postgres
\dt  # Список таблиц
\d users  # Схема таблицы

# Проверка Redis
make redis
KEYS *  # Все ключи
PUBSUB CHANNELS  # Активные каналы
```

### Best Practices

1. **Всегда используйте транзакции** для операций, изменяющих несколько таблиц
2. **Валидируйте UUID** перед использованием в запросах
3. **Используйте context.Context** для таймаутов и отмены
4. **Логируйте ошибки** с достаточным контекстом
5. **Пишите тесты** для критической бизнес-логики
6. **Документируйте API** через Huma теги и комментарии
7. **Используйте ENUM типы** для ограниченных наборов значений
8. **Индексируйте** часто запрашиваемые поля
9. **Избегайте N+1 запросов** — используйте JOIN или batch queries
10. **Проверяйте производительность** с помощью `EXPLAIN ANALYZE`

---

## 📚 Дополнительные ресурсы

### Документация

- [Huma v2 Documentation](https://huma.rocks/)
- [sqlc Documentation](https://docs.sqlc.dev/)
- [Goose Migrations](https://github.com/pressly/goose)
- [pgx Documentation](https://pkg.go.dev/github.com/jackc/pgx/v5)
- [Gin Web Framework](https://gin-gonic.com/docs/)

### Файлы проекта

- `algorithm.md` — детальное описание алгоритмов provably fair
- `missing.md` — список недостающих функций
- `PROJECT.txt` — требования конкурса
- `backend/.env` — конфигурация окружения

### Контакты и поддержка

Для вопросов по проекту обращайтесь к документации в репозитории или к команде разработки.

---

## 📄 Лицензия

Проект разработан в рамках конкурса. Все права защищены.

---

**Последнее обновление**: 2026-04-19

**Версия документации**: 2.0 (SUPER README)
