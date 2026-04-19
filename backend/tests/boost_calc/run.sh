#!/usr/bin/env bash

cd "$(dirname "$0")/../.."
source .env

fuser -k "$PORT/tcp" 2>/dev/null || true
sleep 2

go run services/api/main.go > /tmp/boost_test_server.log 2>&1 &
API_PID=$!

for i in $(seq 1 30); do
    if curl -s "http://localhost:$PORT/api/v1/hello" > /dev/null 2>&1; then
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Server did not become ready in time"
        cat /tmp/boost_test_server.log
        echo "SUITE_RESULT::{\"suite\":\"Boost Calc\",\"passed\":0,\"failed\":1}"
        exit 1
    fi
    sleep 1
done

OUTPUT=$(go run tests/boost_calc/main.go 2>&1)
TEST_EXIT=$?

kill $API_PID 2>/dev/null
wait $API_PID 2>/dev/null

echo "$OUTPUT"

PASSED=$(echo "$OUTPUT" | grep -oP '\d+(?= passed)' | tail -1 || echo 0)
FAILED=$(echo "$OUTPUT" | grep -oP '\d+(?= failed)' | tail -1 || echo 0)
echo "SUITE_RESULT::{\"suite\":\"Boost Calc\",\"passed\":${PASSED:-0},\"failed\":${FAILED:-0}}"

exit $TEST_EXIT
