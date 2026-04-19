-include .env
export

# ── Dev ──────────────────────────────────────────────────────────────────────

all: databases wait migrate serve

serve:
	@trap 'kill 0' SIGINT; \
	go run services/api/main.go & \
	go run services/bot_manager/main.go & \
	go run services/room_manager/main.go & \
	wait

# ── Database ─────────────────────────────────────────────────────────────────

databases:
	docker-compose -f db/docker-compose.yaml up -d

databases-down:
	docker-compose -f db/docker-compose.yaml down

migrate:
	goose up
	sqlc generate

wait:
	@sleep 3

# ── Misc ─────────────────────────────────────────────────────────────────────

mock:
	go run mock/main.go

postgres:
	psql $(GOOSE_DBSTRING)

redis:
	redis-cli

# ── Tests ────────────────────────────────────────────────────────────────────

test-api:
	@bash tests/api/run.sh

test-boost-calc:
	@bash tests/boost_calc/run.sh

test-websocket:
	@bash tests/websocket/run.sh

test-room-management:
	@bash tests/room_management/run_tests.sh

test-all:
	@bash tests/run_all.sh
