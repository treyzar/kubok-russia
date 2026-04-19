# 🎮 OnlineShop Backend

> Бэкенд для платформы лотерейных комнат с автоматическим управлением, ботами и системой бустов.

---

## 📦 Технологии

| Инструмент | Назначение |
|---|---|
| **Go 1.25** | Основной язык |
| **Gin** | HTTP-роутер |
| **Huma v2** | OpenAPI-обёртка над Gin, валидация запросов/ответов |
| **PostgreSQL** | Основная база данных |
| **Redis** | Клиент подключён, зарезервирован для будущих фич |
| **pgx/v5** | Драйвер PostgreSQL + пул соединений |
| **sqlc** | Генерация типобезопасного Go-кода из SQL-запросов |
| **Goose** | Миграции базы данных |
| **go-redis/v9** | Redis-клиент |
| **eon** | Планировщик cron-задач |
| **godotenv + envconfig** | Загрузка конфигурации из `.env` |
| **golang-jwt/v5** | JWT (подключён, зарезервирован) |
| **Docker Compose** | Запуск PostgreSQL и Redis |

---

## 🗂️ Структура проекта

```
backend/
├── services/
│   ├── api/          # HTTP API сервис
│   ├── bot_manager/  # Сервис управления ботами
│   └── room_manager/ # Сервис управления комнатами
├── handlers/         # Обработчики HTTP-запросов (legacy rooms)
├── internal/
│   ├── config.go     # Загрузка конфигурации
│   ├── database.go   # Подключение к БД
│   ├── crons/        # Cron-задачи
│   ├── domain/       # Доменные типы fair rooms (FairRoom, FairPlayer, RiskLevel…)
│   ├── handler/      # HTTP-обработчики fair rooms (Huma)
│   ├── repository/   # Репозитории fair rooms (room_repo, player_repo)
│   └── service/      # Бизнес-логика fair rooms (RoomService)
├── repository/       # Сгенерированный sqlc-код (legacy)
├── db/
│   ├── migrations/   # SQL-миграции (Goose)
│   └── queries/      # SQL-запросы для sqlc
└── tests/
    ├── api/          # Интеграционные тесты API
    ├── room_management/ # Тесты управления комнатами
    ├── boost_calc/   # Тесты формул буста
    ├── websocket/    # Тесты WebSocket
    └── fair_rooms/   # Unit-тесты provably fair rooms (go test)
```

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
