# Frontend Demo Flow (Expert Pass)

This guide describes the autonomous expert pass for the frontend part of MVP.

## 1. Login and route guards

1. Open `/`.
2. Press login and sign in with a demo profile.
3. Verify redirect to `/games`.
4. Logout and verify private routes redirect to `/`.

## 2. Scenario S1 — room list and matching

1. Open `/games/join`.
2. Use search, price filter, seats filter, sorting.
3. Verify "Подходящая комната" block updates.
4. Verify list changes according to selected filters.

## 3. Scenario S6 — insufficient balance

1. In `/games/join`, click an expensive room with insufficient balance.
2. Verify clear error message with required/available amount.
3. Click "Подобрать дешевле".
4. Verify affordable filter and list update.

## 4. Scenario S5/S7 — configurator and invalid settings

1. Open `/games/create`.
2. Click "Конфигуратор".
3. Change values to invalid (for example seats=1, prizeFund=99).
4. Verify validation errors and disabled save.
5. Fix values.
6. Verify save is enabled and summary appears on page.

## 5. Scenario S2/S3/S4 — room simulation

1. Open `/games/lobby`.
2. Click "Симуляция раунда".
3. Trigger room fill, observe timer, bots, fund, chance updates.
4. Buy boost once and verify recalculation.
5. Wait for finish and verify winner + quick next actions.

## 6. Scenario S8 — round journal

1. In `/games/lobby` run at least one simulated round.
2. Open "Журнал раундов".
3. Verify participants, bots, fund, winner, balance delta, and reason text.

## 7. UX/accessibility smoke

1. Verify focus-visible states on actionable controls.
2. Verify readable error/empty states.
3. Verify no dead buttons in core scenarios.
