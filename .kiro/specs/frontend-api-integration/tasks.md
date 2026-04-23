# Implementation Plan: Frontend API Integration

## Overview

Подключение фронтенда к реальному REST API и WebSocket бэкенду. Работа разбита на 7 задач, каждая из которых строится на предыдущей. Все API-функции и TypeScript-типы уже готовы в `shared/api/` и `shared/types/`.

## Tasks

- [x] 1. Вынос resolveApiUserId в processes/auth-session
  - [x] 1.1 Добавить экспортируемую функцию `resolveApiUserId` в `frontend/src/processes/auth-session/model/use-auth-session.ts`
    - Логика: если `userId` — положительное целое число → вернуть его; иначе проверить `localStorage` по ключу `kubok26.api-user-id:{userId}`; иначе вызвать `createUser` и сохранить результат в `localStorage`
    - Сигнатура: `export async function resolveApiUserId(userId: string, userName: string, userBalance: number): Promise<number>`
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 1.2 Обновить `frontend/src/processes/auth-session/index.ts` — добавить `export { resolveApiUserId }` рядом с `useAuthSession`
    - _Requirements: 1.1_

  - [x] 1.3 Обновить `frontend/src/pages/lobby/lib/use-lobby.ts` — удалить локальные `resolveApiUserId` и `getApiUserStorageKey`, добавить импорт из `@processes/auth-session`
    - _Requirements: 1.3_

  - [x] 1.4 Обновить `frontend/src/pages/join-game/lib/use-join-game.ts` — удалить локальные `resolveApiUserId` и `getApiUserStorageKey`, добавить импорт из `@processes/auth-session`
    - _Requirements: 1.4_

  - [ ]* 1.5 Написать property-based тест P1 (идемпотентность) в `frontend/src/processes/auth-session/model/use-auth-session.test.ts`
    - **Property 1: resolveApiUserId идемпотентность**
    - Генераторы: `fc.string()` для userId, `fc.integer({ min: 1 })` для apiId
    - Мокировать `createUser` — должен вызываться ровно 1 раз при повторных вызовах с тем же userId
    - **Validates: Requirements 1.2**

  - [ ]* 1.6 Написать property-based тест P3 (localStorage-ключ) в `frontend/src/processes/auth-session/model/use-auth-session.test.ts`
    - **Property 3: localStorage-ключ соответствует шаблону**
    - Генераторы: `fc.string()` для mockUserId, `fc.integer({ min: 1 })` для apiId
    - Проверить: `localStorage.getItem('kubok26.api-user-id:' + mockUserId) === String(apiId)`
    - **Validates: Requirements 2.2**

- [x] 2. Авторизация через реальный API
  - [x] 2.1 Обновить `frontend/src/pages/auth/lib/use-login-form.ts`
    - Добавить `isApiLoading` state (`useState(false)`)
    - Изменить `onSubmit`: после `loginWithMock` вызывать `resolveApiUserId`, затем `getUser` для актуального баланса
    - При ошибке: `form.setError('root', { message: 'Ошибка подключения к серверу. Попробуйте снова.' })`
    - Вернуть `isApiLoading` из хука
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 Обновить `frontend/src/pages/auth/ui/auth-login-form.tsx` — использовать `isApiLoading` для `disabled` состояния кнопки отправки
    - _Requirements: 2.6_

  - [ ]* 2.3 Написать unit-тест для `use-login-form` в `frontend/src/pages/auth/lib/use-login-form.test.ts`
    - Сценарии: успешный логин → вызов `resolveApiUserId` + `getUser`; ошибка API → error state; loading state во время запроса
    - _Requirements: 2.1, 2.4, 2.5, 2.6_

  - [ ]* 2.4 Написать property-based тест P2 (баланс из API) в `frontend/src/pages/auth/lib/use-login-form.test.ts`
    - **Property 2: Баланс из API корректно отражается в состоянии**
    - Генераторы: `fc.integer({ min: 0 })` для balance
    - Проверить: `AuthUser.balance === apiBalance` после завершения логина
    - **Validates: Requirements 2.4**

- [ ]* 3. Checkpoint — убедиться, что тесты проходят
  - Убедиться, что все тесты проходят, задать вопросы пользователю при необходимости.

- [x] 4. Последние игры из реального API
  - [x] 4.1 Создать `frontend/src/pages/home/lib/use-last-games.ts`
    - `useQuery({ queryKey: ['rounds'], queryFn: listRounds })`
    - `useMemo`: сортировка по убыванию `start_time`, `slice(0, 5)`
    - Возвращать `{ rounds, isLoading, isError }`
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Обновить `frontend/src/pages/home/ui/last-games-section.tsx` — заменить статичный `lastGames` на `useLastGames()`, добавить loading/empty/error states
    - Loading: отображать индикатор загрузки
    - Empty: "Игр пока нет"
    - Error: "Не удалось загрузить последние игры"
    - Для каждого раунда отображать: `room_id`, `jackpot`, `entry_cost`, дату из `start_time`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.3 Обновить `frontend/src/pages/home/lib/index.ts` — добавить `export { useLastGames } from './use-last-games'`
    - _Requirements: 3.1_

  - [ ]* 4.4 Написать property-based тест P4 (топ-5 по start_time) в `frontend/src/pages/home/lib/use-last-games.test.ts`
    - **Property 4: Последние игры — топ-5 по убыванию start_time**
    - Генераторы: `fc.array(fc.record({ start_time: fc.date().map(d => d.toISOString()), ... }), { minLength: 0, maxLength: 20 })`
    - Проверить: `result.length <= 5` и каждый следующий элемент имеет `start_time <= предыдущего`
    - **Validates: Requirements 3.2**

  - [ ]* 4.5 Написать property-based тест P5 (поля карточки) в `frontend/src/pages/home/lib/use-last-games.test.ts`
    - **Property 5: Карточка раунда содержит все обязательные поля**
    - Генераторы: `fc.record` с полями `Round` (`room_id`, `jackpot`, `entry_cost`, `start_time`)
    - Проверить: все 4 поля присутствуют в данных, возвращаемых хуком
    - **Validates: Requirements 3.3**

- [x] 5. Кнопка "Быстрая игра"
  - [x] 5.1 Создать `frontend/src/pages/home/lib/use-quick-game.ts`
    - Тип `UseQuickGameOptions`: `{ userId, userName, userBalance, onJoinLobby }`
    - `handleQuickGame`: `listRooms({ status: 'new' })` → перебор комнат → `joinRoom` → при `409 room is full` — следующая комната
    - Возвращать `{ handleQuickGame, isLoading, error }`
    - Маппинг ошибок: 402 → "Недостаточно баллов. Нужно: X, доступно: Y, не хватает: Z."; пустой список → "Нет доступных комнат"
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 5.2 Обновить `frontend/src/pages/home/model/types.ts` — добавить `onJoinLobby: (roomId: number) => void` в `HomePageProps`
    - _Requirements: 4.3_

  - [x] 5.3 Обновить `frontend/src/pages/home/ui/home-page.tsx` — подключить `useQuickGame` к кнопке "Быстрая игра", показывать loading/error
    - _Requirements: 4.3, 4.4, 4.7_

  - [x] 5.4 Обновить `frontend/src/app/providers/router/ui/app-router.tsx` — передать `onJoinLobby={handleGoToLobby}` в `HomePage`
    - _Requirements: 4.3_

  - [x] 5.5 Обновить `frontend/src/pages/home/lib/index.ts` — добавить `export { useQuickGame } from './use-quick-game'`
    - _Requirements: 4.1_

  - [ ]* 5.6 Написать property-based тест P6 (fallback при 409) в `frontend/src/pages/home/lib/use-quick-game.test.ts`
    - **Property 6: Fallback на следующую комнату при 409 "room is full"**
    - Генераторы: `fc.array(fc.integer({ min: 1 }), { minLength: 1 })` для списка room_id; `fc.nat()` для индекса первой "не полной" комнаты
    - Мокировать `joinRoom`: первые N комнат бросают `ApiClientError(409, 'room is full')`, N+1-я — успех
    - Проверить: `onJoinLobby` вызван с `room_id` первой не-полной комнаты
    - **Validates: Requirements 4.6**

- [ ] 6. Checkpoint — убедиться, что тесты проходят
  - Убедиться, что все тесты проходят, задать вопросы пользователю при необходимости.

- [x] 7. Детали раунда в журнале
  - [x] 7.1 Обновить `frontend/src/pages/lobby/ui/journal-modal.tsx`
    - Добавить `expandedRoundId` state (`useState<number | null>(null)`)
    - Добавить `useQuery({ queryKey: ['round-details', expandedRoundId], queryFn: () => getRoundDetails(expandedRoundId!), enabled: expandedRoundId !== null })`
    - При клике на раунд: `setExpandedRoundId(id)` / повторный клик — `setExpandedRoundId(null)`
    - Loading state внутри карточки раунда
    - 404 → "Детали раунда недоступны"
    - Отображать для каждого игрока: `user_id`, `places`, `joined_at`; для каждого буста: `user_id`, `amount`, `boosted_at`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 7.2 Написать property-based тест P7 (поля деталей) в `frontend/src/pages/lobby/ui/journal-modal.test.tsx`
    - **Property 7: Детали раунда содержат все поля игроков и бустов**
    - Генераторы: `fc.record` с полями `RoundDetails` (players: `RoundPlayerDetailed[]`, boosts: `RoundBoostDetailed[]`)
    - Проверить: для каждого игрока присутствуют `user_id`, `places`, `joined_at`; для каждого буста — `user_id`, `amount`, `boosted_at`
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 7.3 Написать property-based тест P8 (кэширование) в `frontend/src/pages/lobby/ui/journal-modal.test.tsx`
    - **Property 8: Кэширование деталей раунда**
    - Генераторы: `fc.integer({ min: 1 })` для roomId, `fc.integer({ min: 2, max: 10 })` для количества кликов
    - Проверить: `getRoundDetails` вызван ровно 1 раз при N кликах на один и тот же раунд
    - **Validates: Requirements 5.6**

- [x] 8. Сохранение шаблонов в конфигураторе
  - [x] 8.1 Добавить `createRoomTemplate` в `frontend/src/shared/api/templates.ts`
    - `POST /room-templates`, принимает `CreateTemplateBody`, возвращает `RoomTemplate`
    - _Requirements: 6.2_

  - [x] 8.2 Обновить `frontend/src/shared/api/index.ts` — добавить `createRoomTemplate` в экспорт из `'./templates'`
    - _Requirements: 6.2_

  - [x] 8.3 Обновить `frontend/src/pages/create-game/lib/use-create-game.ts`
    - Добавить `templateName` state и `setTemplateName`
    - Добавить `saveTemplateMutation` (`useMutation` → `createRoomTemplate`)
    - `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['room-templates'] })`, установить success state
    - Обработка ошибок: 409 → "Шаблон с таким именем уже существует"; 400 → текст из `error.message`
    - Добавить `applyTemplate(template: RoomTemplate)`: обновить `configDraft` полями шаблона
    - Вернуть `templateName`, `setTemplateName`, `saveTemplateMutation`, `applyTemplate`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.8_

  - [x] 8.4 Обновить `frontend/src/pages/create-game/ui/configurator-modal.tsx`
    - Добавить поле ввода имени шаблона (`templateName`)
    - Добавить кнопку "Сохранить как шаблон" (disabled при `!analysis.canSave || !templateName || saveTemplateMutation.isPending`)
    - Добавить список шаблонов из `templatesQuery.data` с кнопкой применения каждого
    - Отображать error/success состояния для сохранения шаблона
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 8.5 Написать property-based тест P9 (применение шаблона) в `frontend/src/pages/create-game/lib/use-create-game.test.ts`
    - **Property 9: Применение шаблона заполняет поля конфигуратора**
    - Генераторы: `fc.record` с полями `RoomTemplate` (`players_needed`, `entry_cost`, `winner_pct`)
    - Проверить: после `applyTemplate(template)` — `configDraft.seatsTotal === template.players_needed`, `configDraft.entryCost === template.entry_cost`, `configDraft.prizeFundPercent === template.winner_pct`
    - **Validates: Requirements 6.8**

- [ ] 9. Checkpoint — убедиться, что тесты проходят
  - Убедиться, что все тесты проходят, задать вопросы пользователю при необходимости.

- [x] 10. Fridge Game с подключением к API
  - [x] 10.1 Обновить `frontend/src/pages/fridge-game/lib/use-fridge-game.ts`
    - Добавить тип `UseFridgeGameOptions`: `{ roomId, userId, userName, userBalance, onUserBalanceChange }`
    - Добавить `useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId) })` для начального состояния
    - Добавить `liveRoom` state и `useEffect` с `connectRoomWS(roomId, snapshot => setLiveRoom(snapshot))` + cleanup
    - `bank = (liveRoom ?? roomQuery.data)?.jackpot ?? INITIAL_BANK`
    - `winChance = room ? Math.round(100 / Math.max(1, room.players_needed)) : INITIAL_WIN_CHANCE`
    - Добавить `useEffect` для `joinRoom` при монтировании (с обработкой 402 → `joinError`)
    - Заменить `handleAddBonus` на `buyBoostMutation` (`buyRoomBoost`): при успехе — `getUser` → `onUserBalanceChange`; при 409 — `setHasBoosted(true)`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [x] 10.2 Обновить `frontend/src/pages/fridge-game/ui/fridge-game-page.tsx` — принимать пропсы `UseFridgeGameOptions` и передавать в `useFridgeGame`
    - Отображать `joinError` если присутствует
    - Скрывать кнопку буста если `hasBoosted === true`
    - _Requirements: 7.7, 7.8_

  - [x] 10.3 Обновить `frontend/src/app/providers/router/ui/app-router.tsx` — передать `roomId` (из `location.state` или дефолтный), `userId`, `userName`, `userBalance`, `onUserBalanceChange` в `FridgeGamePage`
    - _Requirements: 7.1, 7.4_

  - [ ]* 10.4 Написать property-based тест P10 (WS snapshot → bank) в `frontend/src/pages/fridge-game/lib/use-fridge-game.test.ts`
    - **Property 10: WebSocket snapshot обновляет bank**
    - Генераторы: `fc.integer({ min: 0 })` для `jackpot`
    - Симулировать получение WS snapshot с произвольным `jackpot`
    - Проверить: `bank === snapshot.jackpot`
    - **Validates: Requirements 7.3**

- [ ] 11. Final checkpoint — убедиться, что все тесты проходят
  - Убедиться, что все тесты проходят, задать вопросы пользователю при необходимости.

## Notes

- Задачи с `*` — опциональные (тесты), можно пропустить для быстрого MVP
- Все API-функции уже готовы в `shared/api/`, типы — в `shared/types/`
- Property-тесты используют `fast-check` + `vitest`; каждый тест помечен тегом `// Feature: frontend-api-integration, Property N`
- Checkpoints на задачах 3, 6, 9, 11 — точки валидации перед следующим блоком
