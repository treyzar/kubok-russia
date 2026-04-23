# Requirements Document

## Introduction

Фича охватывает подключение фронтенда игровой платформы "Ночной жор" к реальному REST API и WebSocket бэкенду вместо текущих моков и статичных данных. Работа разбита на 5 фаз: реальная авторизация, домашняя страница с живыми данными, детали раундов в журнале, сохранение шаблонов комнат и подключение Fridge Game к API.

Стек: React/TypeScript, FSD-архитектура, TanStack Query, Go REST API + WebSocket.

## Glossary

- **Auth_Session**: процесс/хук `useAuthSession` в `processes/auth-session`, управляющий состоянием авторизованного пользователя
- **API_User**: пользователь, созданный через `POST /users` и идентифицируемый числовым `apiUserId`
- **Mock_User**: пользователь из статичного массива `MOCK_USERS` в `entities/user/model/auth.ts`
- **Login_Form**: хук `useLoginForm` на странице авторизации
- **Last_Games_Section**: компонент `LastGamesSection` на домашней странице, отображающий последние завершённые раунды
- **Quick_Game_Button**: кнопка "Быстрая игра" на домашней странице
- **Journal_Modal**: модальное окно `JournalModal` в лобби, отображающее историю раундов
- **Round_Details**: расширенные данные раунда, возвращаемые `GET /rounds/{room_id}/details`
- **Configurator**: модальное окно конфигуратора комнаты на странице `create-game`
- **Template**: шаблон комнаты, создаваемый через `POST /room-templates`
- **Fridge_Game**: игровой режим на странице `/games/fridge` с `game_type: "fridge"`
- **Room_Snapshot**: JSON-объект комнаты, получаемый через WebSocket при каждом изменении состояния
- **TanStack_Query**: библиотека для data fetching и кэширования на фронтенде
- **resolveApiUserId**: вспомогательная функция, которая по строковому `userId` возвращает числовой `apiUserId`, создавая пользователя через API при необходимости

---

## Requirements

### Requirement 1: Вынос общей логики resolveApiUserId

**User Story:** Как разработчик, я хочу иметь единое место для логики получения `apiUserId`, чтобы не дублировать код в `use-lobby.ts` и `use-join-game.ts`.

#### Acceptance Criteria

1. THE `Auth_Session` SHALL экспортировать функцию `resolveApiUserId(userId: string, userName: string, userBalance: number): Promise<number>`, реализующую следующую логику: если `userId` является положительным целым числом — вернуть его; иначе проверить `localStorage` по ключу `kubok26.api-user-id:{userId}`; иначе вызвать `POST /users` и сохранить результат в `localStorage`.
2. WHEN `resolveApiUserId` вызывается с одинаковым `userId` повторно, THE `Auth_Session` SHALL возвращать тот же `apiUserId` без повторного вызова `POST /users`.
3. THE `use-lobby.ts` SHALL использовать `resolveApiUserId` из `processes/auth-session` вместо локальной реализации.
4. THE `use-join-game.ts` SHALL использовать `resolveApiUserId` из `processes/auth-session` вместо локальной реализации.
5. IF `POST /users` возвращает ошибку, THEN THE `resolveApiUserId` SHALL пробросить исключение вызывающему коду.

---

### Requirement 2: Авторизация через реальный API

**User Story:** Как игрок, я хочу входить в систему через реальный API, чтобы мой баланс и данные синхронизировались с бэкендом.

#### Acceptance Criteria

1. WHEN игрок успешно проходит валидацию формы входа, THE `Login_Form` SHALL вызывать `POST /users` с `name` и `balance` из выбранного `Mock_User`.
2. WHEN `POST /users` возвращает успешный ответ, THE `Login_Form` SHALL сохранять числовой `id` из ответа как `apiUserId` в `localStorage` по ключу `kubok26.api-user-id:{mockUserId}`.
3. WHEN `POST /users` возвращает успешный ответ, THE `Login_Form` SHALL вызывать `GET /users/{apiUserId}` для получения актуального баланса.
4. WHEN `GET /users/{apiUserId}` возвращает данные, THE `Auth_Session` SHALL обновлять `balance` пользователя в состоянии приложения значением из API-ответа.
5. IF `POST /users` или `GET /users/{id}` возвращает ошибку сети, THEN THE `Login_Form` SHALL отображать сообщение об ошибке и не выполнять переход на следующую страницу.
6. WHILE авторизация через API выполняется, THE `Login_Form` SHALL отображать индикатор загрузки и блокировать повторную отправку формы.

---

### Requirement 3: Последние игры из реального API

**User Story:** Как игрок на домашней странице, я хочу видеть реальные последние завершённые раунды, чтобы понимать активность платформы.

#### Acceptance Criteria

1. WHEN домашняя страница монтируется, THE `Last_Games_Section` SHALL вызывать `GET /rounds` через TanStack_Query.
2. WHEN `GET /rounds` возвращает данные, THE `Last_Games_Section` SHALL отображать последние 5 раундов, отсортированных по убыванию `start_time`.
3. THE `Last_Games_Section` SHALL для каждого раунда отображать: `room_id`, `jackpot`, `entry_cost` и дату из `start_time`.
4. WHILE `GET /rounds` выполняется, THE `Last_Games_Section` SHALL отображать состояние загрузки вместо данных.
5. IF `GET /rounds` возвращает пустой массив, THEN THE `Last_Games_Section` SHALL отображать сообщение "Игр пока нет".
6. IF `GET /rounds` возвращает ошибку, THEN THE `Last_Games_Section` SHALL отображать сообщение об ошибке загрузки.

---

### Requirement 4: Кнопка "Быстрая игра"

**User Story:** Как игрок, я хочу нажать одну кнопку и сразу попасть в доступную комнату, чтобы не тратить время на поиск.

#### Acceptance Criteria

1. WHEN игрок нажимает кнопку "Быстрая игра", THE `Quick_Game_Button` SHALL вызывать `GET /rooms?status=new`.
2. WHEN `GET /rooms?status=new` возвращает непустой список, THE `Quick_Game_Button` SHALL вызывать `POST /rooms/{id}/players` для первой комнаты в списке с `apiUserId` текущего пользователя.
3. WHEN `POST /rooms/{id}/players` возвращает успешный ответ, THE `Quick_Game_Button` SHALL выполнять переход на страницу лобби этой комнаты.
4. IF `GET /rooms?status=new` возвращает пустой список, THEN THE `Quick_Game_Button` SHALL отображать сообщение "Нет доступных комнат".
5. IF `POST /rooms/{id}/players` возвращает `402`, THEN THE `Quick_Game_Button` SHALL отображать сообщение о недостаточном балансе с указанием нехватки.
6. IF `POST /rooms/{id}/players` возвращает `409` с `detail: "room is full"`, THEN THE `Quick_Game_Button` SHALL повторить попытку со следующей комнатой из списка.
7. WHILE операция "Быстрая игра" выполняется, THE `Quick_Game_Button` SHALL отображать индикатор загрузки и блокировать повторные нажатия.

---

### Requirement 5: Детали раунда в журнале

**User Story:** Как игрок, я хочу видеть детальную информацию о раунде при клике на него в журнале, чтобы понять распределение мест и бустов.

#### Acceptance Criteria

1. WHEN игрок кликает на раунд в `Journal_Modal`, THE `Journal_Modal` SHALL вызывать `GET /rounds/{room_id}/details`.
2. WHEN `GET /rounds/{room_id}/details` возвращает данные, THE `Journal_Modal` SHALL отображать для каждого игрока: `user_id`, `places` и `joined_at`.
3. WHEN `GET /rounds/{room_id}/details` возвращает данные, THE `Journal_Modal` SHALL отображать для каждого буста: `user_id`, `amount` и `boosted_at`.
4. WHILE `GET /rounds/{room_id}/details` выполняется, THE `Journal_Modal` SHALL отображать индикатор загрузки внутри карточки раунда.
5. IF `GET /rounds/{room_id}/details` возвращает `404`, THEN THE `Journal_Modal` SHALL отображать сообщение "Детали раунда недоступны".
6. THE `Journal_Modal` SHALL кэшировать результат `GET /rounds/{room_id}/details` через TanStack_Query, чтобы повторный клик на тот же раунд не вызывал новый сетевой запрос.

---

### Requirement 6: Сохранение шаблона комнаты

**User Story:** Как организатор, я хочу сохранять конфигурацию комнаты как шаблон, чтобы быстро создавать похожие комнаты в будущем.

#### Acceptance Criteria

1. THE `Configurator` SHALL отображать кнопку "Сохранить как шаблон" рядом с кнопкой "Сохранить".
2. WHEN организатор нажимает "Сохранить как шаблон" и конфигурация валидна, THE `Configurator` SHALL вызывать `POST /room-templates` с текущими параметрами: `name`, `players_needed`, `entry_cost`, `winner_pct`, `game_type`.
3. WHEN `POST /room-templates` возвращает успешный ответ, THE `Configurator` SHALL инвалидировать кэш TanStack_Query для ключа `['room-templates']` и отображать уведомление об успешном сохранении.
4. IF `POST /room-templates` возвращает `409`, THEN THE `Configurator` SHALL отображать сообщение "Шаблон с таким именем уже существует" и предлагать изменить имя.
5. IF `POST /room-templates` возвращает `400`, THEN THE `Configurator` SHALL отображать текст ошибки из ответа API.
6. WHILE `POST /room-templates` выполняется, THE `Configurator` SHALL блокировать кнопку "Сохранить как шаблон" и отображать индикатор загрузки.
7. THE `Configurator` SHALL отображать список существующих шаблонов, загруженных через `GET /room-templates`, для быстрого выбора конфигурации.
8. WHEN организатор выбирает шаблон из списка, THE `Configurator` SHALL заполнять поля конфигуратора значениями из выбранного шаблона.

---

### Requirement 7: Fridge Game с подключением к API

**User Story:** Как игрок в режиме Fridge Game, я хочу видеть реальные данные комнаты и взаимодействовать с бэкендом, чтобы игра была честной и синхронизированной.

#### Acceptance Criteria

1. WHEN страница Fridge Game монтируется с `roomId`, THE `Fridge_Game` SHALL вызывать `GET /rooms/{roomId}` для получения начального состояния комнаты.
2. WHEN страница Fridge Game монтируется с `roomId`, THE `Fridge_Game` SHALL подключаться к WebSocket `WS /rooms/{roomId}/ws` для получения real-time обновлений.
3. WHEN WebSocket получает `Room_Snapshot`, THE `Fridge_Game` SHALL обновлять отображаемые `bank` (из `jackpot`) и `winChance` (рассчитанный на основе данных комнаты).
4. WHEN игрок входит на страницу Fridge Game, THE `Fridge_Game` SHALL вызывать `POST /rooms/{roomId}/players` с `apiUserId` текущего пользователя.
5. WHEN игрок нажимает кнопку буста в Fridge Game, THE `Fridge_Game` SHALL вызывать `POST /rooms/{roomId}/boosts` с `apiUserId` и введённой суммой.
6. WHEN `POST /rooms/{roomId}/boosts` возвращает успешный ответ, THE `Fridge_Game` SHALL обновлять баланс пользователя через `GET /users/{apiUserId}`.
7. IF `POST /rooms/{roomId}/players` возвращает `402`, THEN THE `Fridge_Game` SHALL отображать сообщение о недостаточном балансе и не переходить в игровой режим.
8. IF `POST /rooms/{roomId}/boosts` возвращает `409`, THEN THE `Fridge_Game` SHALL скрывать кнопку буста, так как пользователь уже бустил эту комнату.
9. WHILE WebSocket соединение разорвано, THE `Fridge_Game` SHALL автоматически переподключаться с интервалом 2 секунды.
10. WHEN страница Fridge Game размонтируется, THE `Fridge_Game` SHALL закрывать WebSocket соединение.
