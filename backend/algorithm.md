# Room Management System — Детальное описание алгоритма

---

## 1. Архитектура и слои

Система построена по принципу чистой архитектуры:

```
HTTP Request
    │
    ▼
Handler (internal/handler/room_handler.go)
    │  Huma-типизированные Input/Output структуры
    │  Валидация UUID, маппинг ошибок в HTTP-коды
    ▼
Service (internal/service/room_service.go)
    │  Бизнес-логика: seed, auto-scale, refund
    │  Управление транзакциями
    ▼
Repository (internal/repository/)
    │  room_repo.go  — CRUD комнат, агрегация player_count
    │  player_repo.go — добавление игроков, MIN(deposit), refund
    ▼
PostgreSQL (pgx/v5 pool)
```

---

## 2. Модели данных

### Room

| Поле          | Тип           | Описание                                              |
|---------------|---------------|-------------------------------------------------------|
| `id`          | UUID v4       | Первичный ключ, `gen_random_uuid()`                   |
| `risk_level`  | ENUM          | `low` / `medium` / `high`                             |
| `state`       | ENUM          | `created` → `waiting` → `refunding` → `finished`      |
| `max_capacity`| INT           | Максимум игроков (по умолчанию 10)                    |
| `seed_phrase` | TEXT          | Секретная соль — **никогда не отдаётся в API напрямую** |
| `seed_hash`   | TEXT          | SHA-256 от `seed_phrase` — публичный                  |
| `final_fee`   | NUMERIC(18,8) | Итоговая ставка = MIN(initial_deposit) по комнате     |
| `player_count`| INT (virtual) | Считается через LEFT JOIN, не хранится в таблице      |

### Player

| Поле              | Тип           | Описание                                          |
|-------------------|---------------|---------------------------------------------------|
| `id`              | UUID v4       | Первичный ключ                                    |
| `room_id`         | UUID          | FK → rooms.id (CASCADE DELETE)                    |
| `user_id`         | UUID          | Внешний идентификатор пользователя                |
| `initial_deposit` | NUMERIC(18,8) | Депозит при входе в комнату                       |
| `refund_amount`   | NUMERIC(18,8) | `initial_deposit − final_fee` (0 если отрицательно)|
| `refunded`        | BOOLEAN       | Флаг: возврат уже обработан                       |

---

## 3. Безопасность и Fair Play

### 3.1 UUID v4 для всех сущностей

Все `id` генерируются через `uuid.New()` (Go) или `gen_random_uuid()` (PostgreSQL).  
Это исключает:
- перебор ID по порядку
- предсказание следующего ID
- утечку информации о количестве объектов в системе

### 3.2 Алгоритм честности (Provably Fair)

```
Момент создания комнаты:
  seed_phrase = hex(rand.Read(32 bytes))   // криптографически случайный
  seed_hash   = hex(SHA-256(seed_phrase))  // детерминированный отпечаток

До старта игры:
  API возвращает только seed_hash → игрок "замораживает" обязательство сервера

После перехода в Finished:
  API возвращает seed_phrase → игрок проверяет: SHA-256(seed_phrase) == seed_hash
```

Поле `seed_phrase` помечено `json:"-"` в структуре `Room` — оно **никогда** не попадает в JSON-сериализацию напрямую.  
Раскрытие происходит только через `RoomView.SeedReveal (*string)`, которое заполняется исключительно при `state == finished`.

```go
// service/room_service.go
view := &RoomView{Room: room}
if room.State == domain.StateFinished {
    seed := room.SeedPhrase
    view.SeedReveal = &seed  // только здесь
}
```

---

## 4. Жизненный цикл комнаты

```
[created] ──(первый игрок входит)──► [waiting]
                                          │
                              (POST /rooms/{id}/start)
                                          │
                                     [refunding]  ← фиксация final_fee + возвраты
                                          │
                              (после обработки всех refund)
                                          │
                                      [finished]  ← seed_phrase раскрыт
```

### Переходы состояний в коде

| Переход                  | Где происходит                        | Транзакция |
|--------------------------|---------------------------------------|------------|
| `created → waiting`      | `JoinRoom()` при первом игроке        | да         |
| `waiting → refunding`    | `StartGame()` перед расчётом refund   | да         |
| `refunding → finished`   | `StartGame()` после всех refund       | да (та же) |

---

## 5. Динамическое масштабирование (Auto-Scale)

### Правило 70%

После каждого `JoinRoom` вызывается `checkAndScale()`:

```
1. Получить все активные комнаты (created/waiting) для данного risk_level
2. Для каждой: fill = player_count / max_capacity
3. atThreshold = количество комнат, где fill >= 0.70
4. ratio = atThreshold / len(rooms)
5. Если ratio >= 0.70 → создать новую комнату того же risk_level
```

Проверка выполняется **вне основной транзакции** входа, чтобы не держать долгую блокировку.

### Пример

```
Комнаты Low: [8/10, 7/10, 3/10]
fill:         0.80  0.70  0.30
atThreshold = 2 (≥ 0.70)
ratio = 2/3 = 0.667 → НЕ масштабируем

Комнаты Low: [8/10, 7/10, 7/10]
atThreshold = 3
ratio = 3/3 = 1.0 → МАСШТАБИРУЕМ → создаём новую комнату Low
```

### Ответ при масштабировании

```json
{
  "player": { ... },
  "room":   { ... },
  "scaled":     true,
  "new_room_id": "uuid-новой-комнаты"
}
```

---

## 6. Подбор комнат (Waiting Room / Up-sell)

`GET /rooms?risk_level=low` возвращает комнаты для уровней риска **текущего и выше**:

| Уровень игрока | Видит комнаты          |
|----------------|------------------------|
| `low`          | low, medium, high      |
| `medium`       | medium, high           |
| `high`         | high                   |

Логика определена в `domain.RiskLevelOrder`. Запрос фильтрует только комнаты с `player_count < max_capacity` и состоянием `created/waiting`.

---

## 7. Алгоритм возврата (Refund)

Выполняется атомарно внутри одной транзакции в `StartGame()`:

```
1. BEGIN TRANSACTION
2. Проверить state == waiting
3. final_fee = SELECT MIN(initial_deposit) FROM players WHERE room_id = $1  (FOR UPDATE)
4. UPDATE rooms SET final_fee = $final_fee, state = 'refunding'
5. Для каждого игрока:
     refund = MAX(0, initial_deposit − final_fee)
     UPDATE players SET refund_amount = refund, refunded = TRUE
     creditUserBalance(user_id, refund)   // вызов внешнего сервиса
6. UPDATE rooms SET state = 'finished'
7. COMMIT
```

Если на любом шаге происходит ошибка — `ROLLBACK`, ни один игрок не получает частичный возврат.

### Пример расчёта

```
Игроки: Alice=100, Bob=80, Carol=95, Dave=80
final_fee = MIN(100, 80, 95, 80) = 80

Alice:  refund = 100 − 80 = 20
Bob:    refund = 80  − 80 = 0
Carol:  refund = 95  − 80 = 15
Dave:   refund = 80  − 80 = 0
```

---

## 8. API Endpoints

| Метод  | Путь                   | Описание                                              |
|--------|------------------------|-------------------------------------------------------|
| POST   | `/rooms`               | Создать комнату (ручное создание)                     |
| POST   | `/rooms/{id}/join`     | Войти в комнату; триггер auto-scale                   |
| GET    | `/rooms/{id}`          | Получить статус; seed раскрывается только в finished  |
| GET    | `/rooms`               | Список доступных комнат с up-sell по risk_level       |
| POST   | `/rooms/{id}/start`    | Запустить игру: refund + переход в finished           |

---

## 9. Тестовые случаи

### TC-01: Создание комнаты — базовый сценарий

```
Входные данные:  POST /rooms  { "risk_level": "medium" }
Ожидаемый результат:
  - HTTP 200
  - id: валидный UUID v4
  - state: "created"
  - seed_hash: строка длиной 64 символа (hex SHA-256)
  - seed_phrase: отсутствует в ответе
  - final_fee: 0
```

---

### TC-02: seed_phrase не раскрывается до Finished

```
Шаги:
  1. POST /rooms → room_id
  2. GET /rooms/{room_id}  (state = created)
  3. POST /rooms/{room_id}/join × N игроков
  4. GET /rooms/{room_id}  (state = waiting)
Ожидаемый результат на шагах 2 и 4:
  - seed_phrase: null / отсутствует
  - seed_hash: присутствует
```

---

### TC-03: seed_phrase раскрывается в Finished + верификация

```
Шаги:
  1. POST /rooms → room_id, запомнить seed_hash из ответа
  2. Добавить игроков, POST /rooms/{room_id}/start
  3. GET /rooms/{room_id}  (state = finished)
Ожидаемый результат:
  - seed_phrase: непустая строка
  - SHA-256(seed_phrase) == seed_hash  ← проверить вручную или в тесте
```

---

### TC-04: Расчёт final_fee и refund — стандартный случай

```
Комната: max_capacity=4
Игроки:
  Alice  deposit=100
  Bob    deposit=80
  Carol  deposit=95
  Dave   deposit=80

POST /rooms/{id}/start

Ожидаемый результат:
  - final_fee = 80
  - Alice.refund_amount  = 20,  refunded = true
  - Bob.refund_amount    = 0,   refunded = true
  - Carol.refund_amount  = 15,  refunded = true
  - Dave.refund_amount   = 0,   refunded = true
  - state = "finished"
```

---

### TC-05: Refund — все депозиты одинаковы

```
Игроки: все внесли по 50
final_fee = 50
Ожидаемый результат:
  - refund_amount = 0 для всех
  - refunded = true для всех
```

---

### TC-06: Refund — один игрок с минимальным депозитом

```
Игроки: [200, 200, 200, 10]
final_fee = 10
Ожидаемый результат:
  - Три игрока получают refund = 190
  - Один игрок (deposit=10) получает refund = 0
```

---

### TC-07: Auto-scale — порог 70% не достигнут

```
Состояние: 3 комнаты Low
  Room A: 6/10  (60%)
  Room B: 7/10  (70%)
  Room C: 3/10  (30%)

atThreshold = 1 (только B)
ratio = 1/3 = 0.33

POST /rooms/{B}/join (7-й игрок)

Ожидаемый результат:
  - JoinResult.scaled = false
  - Новая комната НЕ создаётся
```

---

### TC-08: Auto-scale — порог 70% достигнут

```
Состояние: 3 комнаты Low
  Room A: 8/10  (80%)
  Room B: 7/10  (70%)
  Room C: 7/10  (70%)

atThreshold = 3
ratio = 3/3 = 1.0 >= 0.70

POST /rooms/{C}/join (7-й игрок в C)

Ожидаемый результат:
  - JoinResult.scaled = true
  - JoinResult.new_room_id: валидный UUID новой комнаты Low
  - Новая комната: state = "created", player_count = 0
```

---

### TC-09: Auto-scale — одна комната, заполнена на 70%

```
Состояние: 1 комната Low, 7/10 игроков

atThreshold = 1
ratio = 1/1 = 1.0 >= 0.70

Ожидаемый результат:
  - scaled = true
  - Создана новая комната Low
```

---

### TC-10: Up-sell — игрок Low видит все уровни

```
GET /rooms?risk_level=low

Ожидаемый результат:
  - Возвращаются комнаты с risk_level IN (low, medium, high)
  - Только state IN (created, waiting)
  - Только player_count < max_capacity
```

---

### TC-11: Up-sell — игрок High видит только High

```
GET /rooms?risk_level=high

Ожидаемый результат:
  - Только комнаты risk_level = high
  - Комнаты low и medium отсутствуют
```

---

### TC-12: Вход в полную комнату

```
Комната: player_count = max_capacity = 10

POST /rooms/{id}/join { "user_id": "...", "deposit": 50 }

Ожидаемый результат:
  - HTTP 400
  - Сообщение: "room is full"
```

---

### TC-13: Вход в комнату в статусе Refunding/Finished

```
Комната: state = "refunding" или "finished"

POST /rooms/{id}/join

Ожидаемый результат:
  - HTTP 400
  - Сообщение: "room is not accepting players"
```

---

### TC-14: StartGame на комнате не в статусе Waiting

```
Комната: state = "created" (нет игроков)

POST /rooms/{id}/start

Ожидаемый результат:
  - HTTP 400
  - Сообщение: "room must be in waiting state to start"
```

---

### TC-15: Двойной вход одного пользователя

```
POST /rooms/{id}/join { "user_id": "same-uuid", "deposit": 100 }
POST /rooms/{id}/join { "user_id": "same-uuid", "deposit": 100 }  ← повтор

Ожидаемый результат:
  - Второй запрос: HTTP 400 / 409
  - Причина: UNIQUE(room_id, user_id) нарушен на уровне БД
```

---

### TC-16: Невалидный UUID в пути

```
GET /rooms/not-a-uuid

Ожидаемый результат:
  - HTTP 400
  - Сообщение: "invalid room id"
```

---

### TC-17: Атомарность refund при ошибке внешнего сервиса

```
Сценарий: creditUserBalance() возвращает ошибку на 3-м игроке из 4

Ожидаемый результат:
  - ROLLBACK всей транзакции
  - state остаётся "waiting"
  - Ни один игрок не помечен refunded = true
  - final_fee не обновлён
```

---

### TC-18: Переход created → waiting при первом игроке

```
Комната: state = "created", player_count = 0

POST /rooms/{id}/join

Ожидаемый результат:
  - state = "waiting"
  - player_count = 1
```

---

### TC-19: Верификация seed_hash длины и формата

```
При создании любой комнаты:
  seed_hash должен:
    - быть строкой длиной ровно 64 символа
    - содержать только символы [0-9a-f]
    - быть детерминированным: SHA-256(seed_phrase) == seed_hash
```

---

### TC-20: Конкурентный вход — race condition

```
Сценарий: 2 запроса одновременно пытаются занять последнее место в комнате
  (player_count = max_capacity - 1)

Ожидаемый результат:
  - Ровно один запрос успешен (HTTP 200)
  - Второй получает HTTP 400 "room is full"
  - player_count не превышает max_capacity
  - Транзакционная блокировка предотвращает переполнение
```
