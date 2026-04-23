# API Reference

**Base URL:** `http://localhost:8888/api/v1`
**Swagger UI:** `http://localhost:8888/docs`
**OpenAPI JSON:** `http://localhost:8888/openapi.json`

Все запросы и ответы в формате JSON. Числовые значения баланса/стоимости — целые числа (монеты/баллы).

---

## Содержание

- [Users](#users)
- [Rooms](#rooms)
- [Room Players](#room-players)
- [Room Boosts](#room-boosts)
- [Room Winners](#room-winners)
- [Rounds](#rounds)
- [Room Templates](#room-templates)
- [Fair Rooms](#fair-rooms-provably-fair)
- [WebSocket](#websocket)
- [Admin](#admin)
- [Коды ошибок](#коды-ошибок)

---

## Users

### `POST /users`
Создать нового пользователя. Используется при регистрации или создании демо-аккаунта.

**Request body:**
```json
{
  "name": "Иван",     // строка, 1–255 символов, обязательно
  "balance": 5000     // начальный баланс в баллах, целое число
}
```

**Response `200`:**
```json
{
  "id": 1,
  "name": "Иван",
  "balance": 5000,
  "created_at": "2024-01-01T12:00:00Z"
}
```

---

### `GET /users`
Получить список всех пользователей. Используется в административных панелях.

**Response `200`:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Иван",
      "balance": 5000,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

### `GET /users/{id}`
Получить данные конкретного пользователя по его ID. Используется для отображения профиля и текущего баланса.

**Path params:**
| Параметр | Тип | Описание |
|---|---|---|
| `id` | int | ID пользователя |

**Response `200`:** объект пользователя (см. POST /users)

---

### `DELETE /users/{id}`
Удалить пользователя. Административная операция.

**Response `200`:**
```json
{ "message": "User deleted successfully" }
```

---

### `PATCH /users/{id}/balance`
Изменить баланс пользователя на произвольную дельту (положительную или отрицательную). Удобно для корректировок.

**Request body:**
```json
{ "delta": -200 }   // может быть отрицательным
```

**Response `200`:** обновлённый объект пользователя
**Response `422`:** баланс уйдёт ниже нуля — операция отклонена

---

### `POST /users/{id}/balance/increase`
Пополнить баланс пользователя на указанную сумму. Используется при начислении бонусов.

**Request body:**
```json
{ "amount": 1000 }   // >= 0
```

**Response `200`:** обновлённый объект пользователя
**Response `404`:** пользователь не найден

---

### `POST /users/{id}/balance/decrease`
Списать с баланса пользователя. Используется при ручных списаниях.

**Request body:**
```json
{ "amount": 500 }   // >= 0
```

**Response `200`:** обновлённый объект пользователя
**Response `422`:** недостаточно средств

---

### `PUT /users/{id}/balance`
Установить баланс пользователя в конкретное значение (полная замена). Административная операция.

**Request body:**
```json
{ "balance": 10000 }   // >= 0
```

**Response `200`:** обновлённый объект пользователя

---

## Rooms

### `POST /rooms`
Создать новую игровую комнату. Можно создать на основе шаблона или с ручными параметрами.

**Request body:**
```json
{
  "template_id": 1,               // опционально — ID шаблона; если указан, параметры ниже игнорируются
  "jackpot": 0,                   // начальный джекпот (обычно 0, растёт при join)
  "start_time": "2024-01-01T12:00:00Z",  // опционально — фиксированное время старта
  "status": "new",                // "new" | "starting_soon" | "playing" — начальный статус
  "players_needed": 10,           // >= 1 — сколько мест в комнате
  "min_players": 2,               // опционально, >= 1 — минимум реальных игроков для старта (по умолчанию 1)
  "entry_cost": 500,              // >= 0 — стоимость входа в баллах
  "winner_pct": 80,               // опционально, 1–99 — % от фонда победителю (по умолчанию 80)
  "round_duration_seconds": 30,   // опционально, 10–3600 — длительность раунда (по умолчанию 30)
  "start_delay_seconds": 60,      // опционально, 5–600 — задержка старта после min_players (по умолчанию 60)
  "game_type": "train"            // опционально — "train" | "fridge" (по умолчанию "train")
}
```

> **Важно:** если передан `template_id`, поля `winner_pct`, `round_duration_seconds`, `start_delay_seconds`, `game_type`, `min_players` берутся из шаблона и игнорируются в теле запроса.

**Response `200`:** объект комнаты

**Объект комнаты (используется во всех ответах):**
```json
{
  "room_id": 1,
  "jackpot": 5000,
  "start_time": "2024-01-01T12:00:00Z",   // null если не установлено
  "status": "new",                          // "new" | "starting_soon" | "playing" | "finished"
  "players_needed": 10,
  "min_players": 2,
  "entry_cost": 500,
  "winner_pct": 80,
  "round_duration_seconds": 30,
  "start_delay_seconds": 60,
  "game_type": "train",
  "template_id": 1,                         // null если без шаблона
  "created_at": "2024-01-01T11:00:00Z",
  "updated_at": "2024-01-01T11:00:00Z"
}
```

---

### `GET /rooms`
Получить список комнат с фильтрацией и сортировкой. Основной эндпоинт для страницы выбора игры.

**Query params:**
| Параметр | Тип | Описание |
|---|---|---|
| `status` | string | Фильтр по статусу: `new`, `starting_soon`, `playing`, `finished` |
| `entry_cost` | int | Фильтр по точной стоимости входа |
| `players_needed` | int | Фильтр по количеству мест |
| `sort_by` | string | Поле для сортировки (например `entry_cost`, `jackpot`) |
| `sort_order` | string | `asc` или `desc` |

Все параметры опциональны. Без параметров возвращает все комнаты.

**Response `200`:**
```json
{
  "rooms": [ /* массив объектов комнат */ ]
}
```

---

### `GET /rooms/{room_id}`
Получить данные конкретной комнаты по ID. Используется при открытии лобби.

**Response `200`:** объект комнаты

---

### `POST /rooms/validate`
Предварительный расчёт экономики комнаты **без её создания**. Используется в конфигураторе для real-time отображения метрик.

**Request body:**
```json
{
  "players_needed": 10,   // >= 1
  "entry_cost": 500,      // >= 0
  "winner_pct": 80        // 1–99
}
```

**Response `200`:**
```json
{
  "prize_fund": 4000,           // итоговый призовой фонд (entry_cost * players_needed * winner_pct / 100)
  "organiser_cut": 1000,        // доля организатора
  "player_roi": 0.8,            // ожидаемая ценность для игрока (< 1 = в минус)
  "player_win_probability": 10.0, // вероятность победы в % (100 / players_needed)
  "warnings": [
    "High prize fund percentage reduces organiser margin"
  ]
}
```

---

## Room Players

### `POST /rooms/{room_id}/players`
Войти в комнату (join). Списывает `entry_cost * places` с баланса пользователя и добавляет его в комнату.

**Логика статуса:** когда количество **реальных** (не-бот) игроков достигает `min_players`, статус комнаты автоматически меняется с `new` на `starting_soon` и устанавливается `start_time = now + start_delay_seconds`.

**Request body:**
```json
{
  "user_id": 1,
  "places": 2    // опционально — количество мест (по умолчанию 1). Каждое место = отдельный шанс победы
}
```

**Response `200`:** обновлённый объект комнаты (с актуальным `jackpot`, `status`, `start_time`)

**Response `402`:** недостаточно баллов
```json
{
  "message": "Insufficient balance for entry",
  "required": 500,
  "current_balance": 200,
  "shortfall": 300
}
```

**Response `409`:** конфликт — комната заполнена / пользователь уже в комнате / статус не позволяет вход

---

### `DELETE /rooms/{room_id}/players`
Покинуть комнату до старта. Возвращает списанные баллы пользователю.

**Request body:**
```json
{ "user_id": 1 }
```

**Response `200`:** обновлённый объект комнаты

---

### `GET /rooms/{room_id}/players`
Получить список всех игроков в комнате. Используется для отображения участников в лобби.

**Response `200`:**
```json
{
  "players": [
    {
      "room_id": 1,
      "user_id": 1,
      "places": 2,                          // количество занятых мест
      "joined_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

## Room Boosts

### `POST /rooms/{room_id}/boosts`
Купить буст — увеличить свой шанс победы. Списывает `amount` баллов с баланса. Один пользователь может бустить комнату только один раз.

**Request body:**
```json
{
  "user_id": 1,
  "amount": 300    // >= 1 — сумма буста в баллах
}
```

**Response `200`:**
```json
{
  "room_id": 1,
  "user_id": 1,
  "amount": 300,
  "boosted_at": "2024-01-01T12:05:00Z"
}
```

**Response `402`:** недостаточно баллов (аналогично join)
**Response `409`:** пользователь уже бустил эту комнату

---

### `GET /rooms/{room_id}/boosts`
Список всех бустов в комнате. Используется для отображения активности в лобби.

**Response `200`:**
```json
{
  "boosts": [
    {
      "room_id": 1,
      "user_id": 1,
      "amount": 300,
      "boosted_at": "2024-01-01T12:05:00Z"
    }
  ]
}
```

---

### `GET /rooms/{room_id}/boosts/calc/probability?user_id=X&boost_amount=Y`
Рассчитать вероятность победы пользователя **если он добавит** `boost_amount` баллов буста. Используется для интерактивного слайдера буста.

**Query params:**
| Параметр | Тип | Описание |
|---|---|---|
| `user_id` | int | ID пользователя |
| `boost_amount` | float | Планируемая сумма буста (можно 0 для текущей вероятности) |

**Response `200`:**
```json
{ "probability": 28.5 }   // в процентах
```

**Формула:** `100 × (stake + boost_amount) / (pool_base + all_boosts + boost_amount)`
где `stake` = entry_cost × places + текущий буст пользователя, `pool_base` = players_needed × entry_cost

---

### `GET /rooms/{room_id}/boosts/calc/boost?user_id=X&desired_probability=Y`
Рассчитать необходимую сумму буста для достижения желаемой вероятности победы. Используется для подсказки "сколько нужно добавить".

**Query params:**
| Параметр | Тип | Описание |
|---|---|---|
| `user_id` | int | ID пользователя |
| `desired_probability` | float | Желаемая вероятность в % (строго от 0 до 100) |

**Response `200`:**
```json
{ "boost_amount": 450 }   // минимальная сумма буста для достижения цели
```

**Response `400`:** `desired_probability` вне диапазона (0, 100)

---

## Room Winners

### `GET /rooms/{room_id}/winners`
Список победителей комнаты. Обычно один победитель, но архитектура допускает несколько.

**Response `200`:**
```json
{
  "winners": [
    {
      "room_id": 1,
      "user_id": 3,
      "prize": 4000,
      "won_at": "2024-01-01T12:01:30Z"
    }
  ]
}
```

---

### `GET /rooms/{room_id}/winners/{user_id}`
Получить данные о конкретном победителе комнаты.

**Response `200`:**
```json
{
  "room_id": 1,
  "user_id": 3,
  "prize": 4000,
  "won_at": "2024-01-01T12:01:30Z"
}
```

---

## Rounds

Раунды — это завершённые (`finished`) комнаты с полной историей. Используются для журнала раундов.

### `GET /rounds`
Список всех завершённых раундов со всеми деталями.

**Response `200`:**
```json
{
  "rounds": [
    {
      "room_id": 1,
      "jackpot": 5000,
      "entry_cost": 500,
      "players_needed": 10,
      "winner_pct": 80,
      "start_time": "2024-01-01T12:00:00Z",
      "players": [
        { "user_id": 1, "joined_at": "2024-01-01T11:55:00Z" },
        { "user_id": 2, "joined_at": "2024-01-01T11:56:00Z" }
      ],
      "boosts": [
        { "user_id": 1, "amount": 300 }
      ],
      "winner": {
        "user_id": 1,
        "prize": 4000,
        "won_at": "2024-01-01T12:01:30Z"
      }
    }
  ]
}
```

---

### `GET /rounds/{room_id}`
Получить конкретный завершённый раунд по ID комнаты.

**Response `200`:** объект раунда (см. выше)
**Response `404`:** раунд не найден или комната ещё не завершена

---

### `GET /rounds/{room_id}/details`
Расширенная версия раунда — включает `places` для каждого игрока и `boosted_at` для бустов. Используется для детального просмотра в журнале.

**Response `200`:**
```json
{
  "room_id": 1,
  "jackpot": 5000,
  "entry_cost": 500,
  "winner_pct": 80,
  "players_needed": 10,
  "status": "finished",
  "created_at": "2024-01-01T11:00:00Z",
  "start_time": "2024-01-01T12:00:00Z",
  "players": [
    {
      "user_id": 1,
      "places": 2,                          // количество мест (влияет на шанс)
      "joined_at": "2024-01-01T11:55:00Z"
    }
  ],
  "boosts": [
    {
      "user_id": 1,
      "amount": 300,
      "boosted_at": "2024-01-01T11:58:00Z"
    }
  ],
  "winner": {
    "user_id": 1,
    "prize": 4000,
    "won_at": "2024-01-01T12:01:30Z"
  }
}
```

**Response `404`:** раунд не найден

---

## Room Templates

Шаблоны — предустановленные конфигурации комнат. Позволяют быстро создавать комнаты с одинаковыми параметрами.

### `POST /room-templates`
Создать новый шаблон.

**Request body:**
```json
{
  "name": "Стандарт 10x500",      // уникальное имя, 1–255 символов, обязательно
  "players_needed": 10,            // >= 1, обязательно
  "min_players": 2,                // опционально, >= 1 (по умолчанию 1)
  "entry_cost": 500,               // >= 0, обязательно
  "winner_pct": 80,                // опционально, 1–99 (по умолчанию 80)
  "round_duration_seconds": 30,    // опционально, 10–3600 (по умолчанию 30)
  "start_delay_seconds": 60,       // опционально, 5–600 (по умолчанию 60)
  "game_type": "train"             // опционально, "train" | "fridge" (по умолчанию "train")
}
```

**Response `200`:** объект шаблона
**Response `400`:** `min_players > players_needed`
**Response `409`:** шаблон с таким именем уже существует

**Объект шаблона:**
```json
{
  "template_id": 1,
  "name": "Стандарт 10x500",
  "players_needed": 10,
  "min_players": 2,
  "entry_cost": 500,
  "winner_pct": 80,
  "round_duration_seconds": 30,
  "start_delay_seconds": 60,
  "game_type": "train",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z"
}
```

---

### `GET /room-templates`
Список всех шаблонов. Используется в конфигураторе и при создании комнат.

**Response `200`:**
```json
{ "templates": [ /* массив объектов шаблонов */ ] }
```

---

### `GET /room-templates/{template_id}`
Получить конкретный шаблон по ID.

**Response `200`:** объект шаблона

---

### `PUT /room-templates/{template_id}`
Полностью обновить шаблон. Незаполненные опциональные поля берутся из текущего значения шаблона.

**Request body:** те же поля, что и при создании
**Response `200`:** обновлённый объект шаблона
**Response `409`:** имя уже занято другим шаблоном

---

### `DELETE /room-templates/{template_id}`
Удалить шаблон.

**Response `200`:**
```json
{ "message": "template deleted successfully" }
```

---

## Fair Rooms (Provably Fair)

Отдельная система комнат с верифицируемой честностью. Используют UUID вместо числовых ID. Seed-фраза хешируется заранее и раскрывается только после завершения игры.

### `POST /fair-rooms`
Создать fair-комнату с заданным уровнем риска.

**Request body:**
```json
{ "risk_level": "medium" }   // "low" | "medium" | "high"
```

**Response `200`:** объект RoomView (содержит `id`, `risk_level`, `state`, `seed_hash`, `created_at`)

---

### `GET /fair-rooms?risk_level=low`
Список fair-комнат. Фильтр по уровню риска опционален.

**Query params:**
| Параметр | Тип | Описание |
|---|---|---|
| `risk_level` | string | Опционально: `low`, `medium`, `high` |

**Response `200`:**
```json
{ "rooms": [ /* массив RoomView */ ] }
```

---

### `GET /fair-rooms/{id}`
Получить fair-комнату по UUID.

> `seed_reveal` (раскрытая seed-фраза) присутствует в ответе **только** когда `state == "finished"`. `seed_phrase` никогда не возвращается клиенту.

**Response `200`:** объект RoomView
**Response `400`:** невалидный UUID
**Response `404`:** комната не найдена

---

### `POST /fair-rooms/{id}/join`
Войти в fair-комнату.

**Request body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",   // UUID пользователя
  "deposit": 100.0                                       // >= 0 — сумма депозита
}
```

**Response `200`:** объект JoinResult (содержит данные игрока, комнаты и масштабированный депозит)
**Response `400`:** комната заполнена / не принимает игроков / невалидный UUID
**Response `409`:** пользователь уже в этой комнате

---

### `POST /fair-rooms/{id}/start`
Запустить игру в fair-комнате. Комната должна быть в состоянии `waiting`.

**Response `200`:**
```json
{ "message": "game started" }
```

**Response `400`:** комната не в состоянии `waiting`

---

## WebSocket

### `WS /api/v1/rooms/{room_id}/ws`
Real-time подписка на обновления комнаты через WebSocket.

**Подключение:** `ws://localhost:8888/api/v1/rooms/1/ws`

**Поведение:**
- Сервер отправляет JSON-снапшот комнаты при каждом изменении: join, leave, boost
- Формат сообщения — объект комнаты (идентичен REST-ответу)
- Keepalive: сервер отправляет ping каждые 30 секунд, ожидает pong в течение 35 секунд
- При разрыве соединения — переподключиться и заново подписаться

**Пример сообщения от сервера:**
```json
{
  "room_id": 1,
  "jackpot": 5500,
  "status": "starting_soon",
  "start_time": "2024-01-01T12:01:00Z",
  "players_needed": 10,
  ...
}
```

---

## Admin

Административные эндпоинты для управления шаблонами и просмотра статистики.

### `POST /admin/templates/validate`
Валидация параметров шаблона с расчётом рекомендаций. Аналог `/rooms/validate`, но для шаблонов.

**Request body:** параметры шаблона
**Response `200`:** результат валидации с предупреждениями и метриками

---

### `GET /admin/statistics/templates`
Список всех шаблонов с агрегированной статистикой (количество комнат, средний джекпот, заполняемость и т.д.).

---

### `GET /admin/statistics/templates/{template_id}`
Детальная статистика по конкретному шаблону: история комнат, средние показатели, тренды.

---

### `GET /admin/templates/{template_id}/status`
Текущий статус шаблона: сколько активных и ожидающих комнат создано на его основе.

**Response `200`:**
```json
{
  "template_id": 1,
  "active_rooms": 3,
  "waiting_rooms": 5
}
```

---

### `DELETE /admin/templates/{template_id}`
Безопасное удаление шаблона — перед удалением обрабатывает активные комнаты (не ломает их).

---

### `PUT /admin/templates/{template_id}`
Безопасное обновление шаблона — изменения применяются к новым комнатам, активные не затрагиваются.

---

## Коды ошибок

| Код | Когда возникает |
|---|---|
| `400` | Неверные параметры запроса, невалидный UUID, нарушение бизнес-правил |
| `402` | Недостаточно баллов на балансе (join или boost) |
| `404` | Ресурс не найден (пользователь, комната, раунд) |
| `409` | Конфликт: дубликат имени, комната заполнена, пользователь уже в комнате, повторный буст |
| `422` | Бизнес-логика нарушена: баланс уйдёт в минус |
| `500` | Внутренняя ошибка сервера (например, сбой транзакции возврата) |

**Формат ошибки:**
```json
{
  "title": "Conflict",
  "status": 409,
  "detail": "user already in room"
}
```

**Расширенный формат для 402 (недостаточно средств):**
```json
{
  "title": "Payment Required",
  "status": 402,
  "detail": "Insufficient balance for entry",
  "errors": {
    "message": "Insufficient balance for entry",
    "required": 500,
    "current_balance": 200,
    "shortfall": 300
  }
}
```
