# Project

This Replit hosts the **frontend** (React + Vite + TypeScript + Tailwind v4) of a larger app. The Go backend in `backend/` is not started in this Repl (it requires PostgreSQL/Redis and is intended to run separately via `docker/`).

## Run
- Workflow `Start application` runs `cd frontend && npm run dev` on port 5000.
- Vite is configured (`frontend/vite.config.ts`) with `host: 0.0.0.0`, `port: 5000`, and `allowedHosts: true` so the Replit iframe proxy can reach the dev server.

## Deployment
- Autoscale: build `npm --prefix frontend run build`, run `npm --prefix frontend run preview`.
