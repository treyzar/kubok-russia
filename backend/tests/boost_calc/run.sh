#!env bash
set -e

cd "$(dirname "$0")/../.."
source .env

echo "Killing any existing API server on port $PORT..."
fuser -k "$PORT/tcp" 2>/dev/null || true
sleep 1

echo "Starting API server..."
go run services/api/main.go &
API_PID=$!

echo "Waiting for server to be ready..."
until curl -s "http://localhost:$PORT/api/v1/hello" > /dev/null 2>&1; do
    sleep 0.5
done
echo "Server ready (PID=$API_PID)"

go run tests/boost_calc/main.go
TEST_EXIT=$?

kill $API_PID 2>/dev/null
wait $API_PID 2>/dev/null

exit $TEST_EXIT
