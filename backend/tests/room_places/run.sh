#!/usr/bin/env bash

cd "$(dirname "$0")/../.."
source .env

OUTPUT=$(go run tests/room_places/main.go 2>&1)
TEST_EXIT=$?

echo "$OUTPUT"

PASSED=$(echo "$OUTPUT" | grep -oP 'Passed: \K\d+' | tail -1 || echo 0)
FAILED=$(echo "$OUTPUT" | grep -oP 'Failed: \K\d+' | tail -1 || echo 0)
echo "SUITE_RESULT::{\"suite\":\"Room Places\",\"passed\":${PASSED:-0},\"failed\":${FAILED:-0}}"

exit $TEST_EXIT
