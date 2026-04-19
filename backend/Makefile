-include .env
export

all: databases wait migrate serve

serve:
	@trap 'kill 0' SIGINT; \
	go run services/api/main.go & \
	go run services/bot_manager/main.go & \
	go run services/room_manager/main.go & \
	wait

api-test:
	@go run services/api/main.go

test-api:
	@bash tests/api/run.sh

test-boost-calc:
	@bash tests/boost_calc/run.sh

build-dbs:
	docker-compose -f db/docker-compose.yaml build

databases:
	docker-compose -f db/docker-compose.yaml up -d

databases-down:
	docker-compose -f db/docker-compose.yaml down

migrate:
	goose up
	sqlc generate

mock:
	go run mock/main.go

recreate:
	pg_dump $(GOOSE_DBSTRING) --data-only -t reviews -t users -t products -t votes > data.dump
	goose reset
	goose up
	psql $(GOOSE_DBSTRING) < data.dump

postgres:
	psql $(GOOSE_DBSTRING)

redis:
	redis-cli

wait:
	echo "Sleeping for 1 second..."
	sleep 3
