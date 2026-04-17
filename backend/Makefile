-include .env
export

.PHONY: serve api-test databases databases-down migrate mock wait

serve:
	go run services/api/main.go

api-test:
	API_TEST=true go run services/api/main.go

databases:
	docker-compose -f db/docker-compose.yaml up -d

databases-down:
	docker-compose -f db/docker-compose.yaml down

migrate:
	goose up
	sqlc generate

mock:
	go run mock/main.go

wait:
	echo "Sleeping for 3 seconds..."
	sleep 3
