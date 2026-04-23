# API Integration Map

Схема: какие эндпоинты использовать на каждой странице фронтенда.

---

## Страницы и их эндпоинты

---

### `/` — Auth (Авторизация)
**Файл:** `frontend/src/pages/auth/`

| Действие | Метод | Эндпоинт | Описание |
|---|---|---|---|
| Вход / создание сессии | `POST` | `/users` | Создать пользователя или получить существующего |
| Загрузка профиля | `GET` | `/users/{id}` | Получить данные и баланс пользователя |

**Примечание:** сейчас нет JWT-авторизации. `user_id` хранится в localStorage/состоянии приложения и передаётся в каждый запрос вручную.

---

### `/games` или `/games/join` — Home / Join Game (Список комнат)
**Файлы:** `frontend/src/pages/home/`, `frontend/src/pages/join-game/`

| Действие | Метод | Эндпоинт | Описание |
|---|---|---|---|
| Загрузка списка комнат | `GET` | `/rooms?status=new` | Список доступных комнат для входа |
| Фильтр по цене | `GET` | `/rooms?entry_cost=500` | Фильтрация по стоимости входа |
| Фильтр по местам | `GET` | `/rooms?players_needed=10` | Фильтрация по количеству мест |
| Сортировка | `GET` | `/rooms?sort_by=entry_cost&sort_order=asc` | Сортировка списка |
| Комбинированный фильтр | `GET` | `/rooms?status=new&entry_cost=500&sort_by=jackpot&sort_order=desc` | Все фильтры вместе |
| Баланс пользователя | `GET` | `/users/{id}` | Для проверки доступности комнат по балансу |

**Логика "Подходящая комната":**
```
GET /rooms?status=new&entry_cost<={user.balance}
```
Фильтровать на клиенте: показывать только комнаты, где `entry_cost <= user.balance`.

---

### `/games/create` — Create Game (Конфигуратор)
**Файл:** `frontend/src/pages/create-game/`

| Действие | Метод | Эндпоинт | Описание |
|---|---|---|---|
| Загрузка шаблонов | `GET` | `/room-templates` | Список готовых шаблонов для выбора |
| Валидация параметров | `POST` | `/rooms/validate` | Real-time расчёт метрик при изменении полей |
| Создать комнату из шаблона | `POST` | `/rooms` | Тело: `{ template_id, jackpot, status: "new" }` |
| Создать комнату вручную | `POST` | `/rooms` | Тело: все параметры вручную |
| Создать шаблон | `POST` | `/room-templates` | Сохранить конфигурацию как шаблон |

**Паттерн для конфигуратора:**
```
onChange(field) → POST /rooms/validate → обновить метрики на экране
onSave() → POST /rooms → перейти в лобби созданной комнаты
```

---

### `/games/lobby` — Lobby (Лобби комнаты)
**Файл:** `frontend/src/pages/lobby/`

| Действие | Метод | Эндпоинт | Описание |
|---|---|---|---|
| Загрузка данных комнаты | `GET` | `/rooms/{room_id}` | Начальное состояние комнаты |
| Список игроков | `GET` | `/rooms/{room_id}/players` | Кто уже в комнате |
| Список бустов | `GET` | `/rooms/{room_id}/boosts` | Текущие бусты |
| Real-time обновления | `WS` | `/rooms/{room_id}/ws` | Подписка на изменения комнаты |
| Войти в комнату | `POST` | `/rooms/{room_id}/players` | Тело: `{ user_id, places }` |
| Выйти из комнаты | `DELETE` | `/rooms/{room_id}/players` | Тело: `{ user_id }` |
| Купить буст | `POST` | `/rooms/{room_id}/boosts` | Тело: `{ user_id, amount }` |
| Расчёт вероятности | `GET` | `/rooms/{room_id}/boosts/calc/probability?user_id=X&boost_amount=Y` | При движении слайдера буста |
| Расчёт нужного буста | `GET` | `/rooms/{room_id}/boosts/calc/boost?user_id=X&desired_probability=Y` | Подсказка "сколько нужно" |
| Победители (после финиша) | `GET` | `/rooms/{room_id}/winners` | Показать результат после завершения |
| Баланс пользователя | `GET` | `/users/{id}` | Обновить баланс после join/boost |

**Паттерн WebSocket:**
```
1. GET /rooms/{id} + GET /rooms/{id}/players + GET /rooms/{id}/boosts  — начальная загрузка
2. WS connect → слушать снапшоты комнаты
3. При получении снапшота — обновить состояние комнаты в UI
4. При join/boost — вызвать REST, затем WS обновит остальных
```

**Паттерн слайдера буста:**
```
onSliderChange(amount) → GET /calc/probability?boost_amount={amount} → показать вероятность
onTargetProbabilityChange(pct) → GET /calc/boost?desired_probability={pct} → показать нужную сумму
```

---

### `/games/fridge` — Fridge Game
**Файл:** `frontend/src/pages/fridge-game/`

Аналогично лобби, но с `game_type: "fridge"`. Те же эндпоинты, что и для лобби.

---

### Журнал раундов (модальное окно или отдельная страница)

| Действие | Метод | Эндпоинт | Описание |
|---|---|---|---|
| Список всех раундов | `GET` | `/rounds` | История завершённых игр |
| Детали раунда | `GET` | `/rounds/{room_id}/details` | Полная информация: игроки, бусты, победитель |
| Победитель раунда | `GET` | `/rooms/{room_id}/winners` | Кто выиграл и сколько |

---

### Header / Глобальный компонент
**Файл:** `frontend/src/widgets/header/`

| Действие | Метод | Эндпоинт | Описание |
|---|---|---|---|
| Баланс пользователя | `GET` | `/users/{id}` | Отображение текущего баланса в шапке |

Рекомендуется обновлять баланс после каждой операции join/leave/boost.

---

## Схема потоков данных

```
Auth Page
  └─ POST /users ──────────────────────────────► сохранить user_id в store
  └─ GET /users/{id} ──────────────────────────► загрузить баланс

Home / Join Page
  └─ GET /rooms?status=new&... ────────────────► список комнат
  └─ GET /users/{id} ──────────────────────────► баланс для фильтра "доступные мне"

Create Game Page
  └─ GET /room-templates ──────────────────────► список шаблонов
  └─ POST /rooms/validate (debounced) ─────────► real-time метрики конфигуратора
  └─ POST /rooms ──────────────────────────────► создать комнату → redirect в лобби

Lobby Page
  ├─ GET /rooms/{id} ──────────────────────────► начальные данные
  ├─ GET /rooms/{id}/players ──────────────────► список игроков
  ├─ GET /rooms/{id}/boosts ───────────────────► список бустов
  ├─ WS  /rooms/{id}/ws ───────────────────────► real-time обновления
  │
  ├─ POST /rooms/{id}/players ─────────────────► войти в комнату
  ├─ DELETE /rooms/{id}/players ───────────────► выйти из комнаты
  │
  ├─ GET /rooms/{id}/boosts/calc/probability ──► слайдер буста (debounced)
  ├─ GET /rooms/{id}/boosts/calc/boost ────────► подсказка целевой вероятности
  ├─ POST /rooms/{id}/boosts ──────────────────► купить буст
  │
  └─ GET /rooms/{id}/winners ──────────────────► результат после финиша

Round Journal
  └─ GET /rounds ──────────────────────────────► список раундов
  └─ GET /rounds/{id}/details ─────────────────► детали раунда
```

---

## Обработка ошибок на фронтенде

| Код | Где показывать | Что делать |
|---|---|---|
| `402` | Лобби (join/boost) | Показать модалку с `required`, `current_balance`, `shortfall`. Кнопка "Найти дешевле" → фильтр на join-странице |
| `409` комната заполнена | Join-страница | Toast "Комната заполнена", обновить список |
| `409` уже в комнате | Лобби | Игнорировать или показать "Вы уже участвуете" |
| `409` уже бустил | Лобби | Скрыть кнопку буста после первого успешного буста |
| `404` | Любая страница | Redirect на `/not-found` или показать пустое состояние |
| `400` | Конфигуратор | Показать inline-ошибку под полем |
| Network error | Везде | Toast с кнопкой "Повторить" |

---

## Рекомендации по реализации

### Базовый API-клиент (`shared/api/`)
```typescript
const BASE_URL = 'http://localhost:8888/api/v1'

// Все запросы через единый клиент с обработкой ошибок
async function apiRequest<T>(path: string, options?: RequestInit): Promise<T>
```

### Структура файлов
```
shared/api/
  client.ts          — базовый fetch-клиент
  users.ts           — GET/POST /users, balance operations
  rooms.ts           — GET/POST /rooms, validate
  room-players.ts    — join, leave, list players
  room-boosts.ts     — boost, calc probability/amount
  room-winners.ts    — list winners
  rounds.ts          — list rounds, get details
  templates.ts       — CRUD шаблонов
  websocket.ts       — WS-клиент с автореконнектом
```

### WebSocket-клиент
```typescript
// Автоматический реконнект при разрыве
// Обновление store при получении снапшота
function connectRoomWS(roomId: number, onSnapshot: (room: Room) => void): () => void
```

### Debounce для калькуляторов
```typescript
// Конфигуратор: валидация при изменении полей
const debouncedValidate = debounce((params) => POST('/rooms/validate', params), 300)

// Слайдер буста: расчёт вероятности
const debouncedCalcProb = debounce((amount) => GET('/boosts/calc/probability?...'), 200)
```
