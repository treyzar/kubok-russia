# Project

This Replit hosts the **frontend** (React + Vite + TypeScript + Tailwind v4) of a larger app. The Go backend in `backend/` is not started in this Repl (it requires PostgreSQL/Redis and is intended to run separately via `docker/`).

## Run
- Workflow `Start application` runs `cd frontend && npm run dev` on port 5000.
- Vite is configured (`frontend/vite.config.ts`) with `host: 0.0.0.0`, `port: 5000`, and `allowedHosts: true` so the Replit iframe proxy can reach the dev server.

## Deployment
- Autoscale: build `npm --prefix frontend run build`, run `npm --prefix frontend run preview`.

## Java/Spring Boot port (`backend-java/`)
- Java 21 + Spring Boot 3.3 port of the Go backend. Single process replaces the
  three Go services (api / room_manager / bot_manager) using `@Scheduled` jobs.
- Layout: `controller/` (REST + WS), `service/` (business logic),
  `scheduler/` (cron jobs), `events/` (Redis pub/sub bridge), `repository/`
  (Spring Data JPA), `domain/` (entities + enums), Flyway migration consolidating
  the 18 goose migrations into `src/main/resources/db/migration/V1__init_schema.sql`.
- Run: `mvn -f backend-java/pom.xml spring-boot:run` (requires Postgres + Redis).
- See `backend-java/MIGRATION.md` for the full Go → Java mapping.

## ТЗ refactor (admin role + min/max + admin panel)
Migration `V2__roles_and_template_lifecycle.sql` adds:
- `users.role` (`USER` | `ADMIN`) — hard-coded admin email is `expert@stoloto-demo.ru`
  (single source of truth: `frontend/src/entities/user/model/auth.ts` `ADMIN_EMAILS`).
- `room_templates.max_players` (`players_needed` is now a mirrored legacy column kept
  in sync inside `TemplateDto.applyDto`).
- `room_templates.deleted_at` for soft delete — list endpoints exclude deleted by default,
  admin list includes them with a status flag, room creation refuses soft-deleted templates.

Frontend:
- `/` → login form (the public landing was removed). `/auth` → redirect to `/`.
- `HomePage` no longer has «Создать игру»; right-side sidebar lists available games
  (currently only «Ночной жор»).
- `AppHeader` exposes a profile dropdown with «Админ-панель» (admin-only) and «Выход».
- `/admin` (admin-gated) — two tabs:
  - **Шаблоны**: CRUD with live jackpot, server-validated warnings (`/admin/templates/validate`)
    and duplicate-block.
  - **Статистика**: list with period filter + sortable columns; per-template detail at
    `/admin/stats/:templateId` shows boosts/places/wins metrics.
- `/games/create` is gated to `role === 'ADMIN'`.
