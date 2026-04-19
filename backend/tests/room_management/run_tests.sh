#!/usr/bin/env bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/../.."
cd "$BACKEND_DIR"

make databases > /dev/null 2>&1 || true
sleep 2
export $(cat .env | grep -v '^#' | xargs)
goose -dir db/migrations postgres "$GOOSE_DBSTRING" up > /dev/null 2>&1 || true
sqlc generate > /dev/null 2>&1

make serve > /tmp/services.log 2>&1 &
SERVICES_PID=$!

cleanup() {
    kill $SERVICES_PID 2>/dev/null || true
    pkill -P $SERVICES_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for i in $(seq 1 60); do
    if curl -sf http://localhost:8888/api/v1/hello > /dev/null 2>&1; then
        break
    fi
    if [ $i -eq 60 ]; then
        echo "Server did not become ready in time"
        echo "SUITE_RESULT::{\"suite\":\"Room Management\",\"passed\":0,\"failed\":1}"
        exit 1
    fi
    sleep 1
done

OUTPUT=$(go run tests/room_management/main.go 2>&1)
TEST_EXIT=$?

echo "$OUTPUT"

PASSED=$(echo "$OUTPUT" | grep -oP '(?<=Passed: )\d+' | tail -1 || echo 0)
FAILED=$(echo "$OUTPUT" | grep -oP '(?<=Failed: )\d+' | tail -1 || echo 0)
echo "SUITE_RESULT::{\"suite\":\"Room Management\",\"passed\":${PASSED:-0},\"failed\":${FAILED:-0}}"

exit $TEST_EXIT
