FRONTEND_DIR := ./frontend
DOCKER_DIR := ./docker
COMPOSE_FILE := $(DOCKER_DIR)/docker-compose.yml

.PHONY: frontend-install frontend-dev frontend-build frontend-preview frontend-lint
.PHONY: docker-build docker-up docker-down docker-logs docker-rebuild

frontend-install:
	cd $(FRONTEND_DIR) && npm install

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev -- --host 0.0.0.0 --port 5173

frontend-build:
	cd $(FRONTEND_DIR) && npm run build

frontend-preview:
	cd $(FRONTEND_DIR) && npm run preview -- --host 0.0.0.0 --port 4173

frontend-lint:
	cd $(FRONTEND_DIR) && npm run lint

docker-build:
	docker compose -f $(COMPOSE_FILE) build frontend

docker-up:
	docker compose -f $(COMPOSE_FILE) up -d frontend

docker-down:
	docker compose -f $(COMPOSE_FILE) down

docker-logs:
	docker compose -f $(COMPOSE_FILE) logs -f frontend

docker-rebuild:
	docker compose -f $(COMPOSE_FILE) up -d --build frontend
