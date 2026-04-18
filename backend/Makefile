-include .env
export

all: databases wait migrate serve

serve:
	go run services/api/main.go

api-test:
	API_TEST=true go run services/api/main.go

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

