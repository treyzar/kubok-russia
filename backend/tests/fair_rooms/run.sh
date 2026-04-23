#!/usr/bin/env bash
# Runs the provably fair rooms unit tests and emits a SUITE_RESULT line
# compatible with tests/run_all.sh.

cd "$(dirname "$0")/../.."

passed=0
failed=0

output=$(go test ./tests/fair_rooms/... -v 2>&1)
echo "$output"

while IFS= read -r line; do
    if [[ "$line" =~ ^--- ]]; then
        if [[ "$line" =~ PASS ]]; then
            (( passed++ ))
        elif [[ "$line" =~ FAIL ]]; then
            (( failed++ ))
        fi
    fi
done <<< "$output"

echo "SUITE_RESULT::{ \"passed\": $passed, \"failed\": $failed }"

[ "$failed" -eq 0 ]
