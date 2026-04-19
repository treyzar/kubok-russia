#!/usr/bin/env bash

cd "$(dirname "$0")/../.."
source .env

make databases > /dev/null 2>&1 || true
sleep 2
goose -dir db/migrations postgres "$GOOSE_DBSTRING" up > /dev/null 2>&1 || true

fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 2
go run services/api/main.go > /tmp/ws_test_api.log 2>&1 &
API_PID=$!

cleanup() {
    kill $API_PID 2>/dev/null || true
    wait $API_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for i in $(seq 1 30); do
    if curl -sf "http://localhost:${PORT}/api/v1/hello" > /dev/null 2>&1; then
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Server did not become ready in time"
        tail -20 /tmp/ws_test_api.log
        echo "SUITE_RESULT::{\"suite\":\"WebSocket\",\"passed\":0,\"failed\":1}"
        exit 1
    fi
    sleep 1
done

OUTPUT=$(go run tests/websocket/main.go 2>&1)
TEST_EXIT=$?

echo "$OUTPUT"

PASSED=$(echo "$OUTPUT" | grep -oP '\d+(?= passed)' | tail -1 || echo 0)
FAILED=$(echo "$OUTPUT" | grep -oP '\d+(?= failed)' | tail -1 || echo 0)
echo "SUITE_RESULT::{\"suite\":\"WebSocket\",\"passed\":${PASSED:-0},\"failed\":${FAILED:-0}}"

exit $TEST_EXIT
