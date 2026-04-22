# Kubok Russia 2026 — Frontend MVP

Frontend MVP for fast bonus game rooms built for the Stotloto Kubok Russia challenge.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- FSD-like architecture (`app/pages/widgets/features/entities/shared/processes`)

## Run

```bash
npm install
npm run dev
```

Available scripts:

- `npm run dev` — local development server
- `npx tsc -b` — type check
- `npm run lint` — lint check
- `npm run build` — production build

## Known Environment Limitation

On some Windows environments `npm run build` may fail with `@tailwindcss/oxide-win32-x64-msvc` (`spawn EPERM` / UNLOADABLE_DEPENDENCY).  
This is an environment/native dependency issue, not a TypeScript issue.  
Fallback verification for frontend quality in this case:

1. `npx tsc -b`
2. `npm run lint`
3. `npm run dev` and smoke scenarios S1-S8

## Demo User

Use any demo user from auth login screen.  
Balance and profile are shown in the header after login.

## Scenario Checklist (S1-S8)

1. S1: Room list and matching (`/games/join`)  
   Use search + price/seats filters + sorting + "best match" hint.
2. S2: Enter room, reserve balance, boost (`/games/lobby` -> "Симуляция раунда")
3. S3: Timer + room fill + bots + live status updates (inside simulation)
4. S4: Winner + visual round + quick next-step CTA (inside simulation after finish)
5. S5: Room configurator (`/games/create` -> "Конфигуратор")
6. S6: Insufficient balance flow (`/games/join`, choose expensive room -> "Подобрать дешевле")
7. S7: Invalid room config handling (configurator blocks save on invalid values)
8. S8: Round journal and transparency (`/games/lobby` -> "Журнал раундов")

## Project Structure (short)

```text
src/
  app/            # app bootstrap and routing
  pages/          # route-level screens
  widgets/        # reusable page widgets (header)
  features/       # domain features (room-menu)
  entities/       # business entities (user)
  processes/      # app-level processes (auth-session)
  shared/         # ui kit and helpers
```

## Additional Docs

- `../docs/FRONTEND_DEMO_FLOW.md`
- `../docs/GAME_PARAMETERS_FRONT.md`
- `../docs/ROUND_TRANSPARENCY.md`
