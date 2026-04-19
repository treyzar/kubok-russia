#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../.."
source .env

echo "=== WebSocket Integration Tests ==="
echo ""

echo "📦 Ensuring database is running..."
make databases > /dev/null 2>&1 || true
sleep 2

echo "🔄 Running migrations..."
goose -dir db/migrations postgres "$GOOSE_DBSTRING" up > /dev/null 2>&1 || true

echo "🚀 Starting API server..."
fuser -k "${PORT}/tcp" 2>/dev/null || true
go run services/api/main.go > /tmp/ws_test_api.log 2>&1 &
API_PID=$!

cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    kill $API_PID 2>/dev/null || true
    wait $API_PID 2>/dev/null || true
    echo "Cleanup complete"
}
trap cleanup EXIT INT TERM

echo "⏳ Waiting for API server to be ready..."
for i in $(seq 1 60); do
    if curl -sf "http://localhost:${PORT}/api/v1/hello" > /dev/null 2>&1; then
        echo "Server ready (PID=$API_PID)"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Server did not become ready in time"
        tail -20 /tmp/ws_test_api.log
        exit 1
    fi
    sleep 1
done

echo ""
echo "🧪 Running WebSocket tests..."
echo ""

if go run tests/websocket/main.go; then
    echo ""
    echo "✅ All WebSocket tests passed!"
    exit 0
else
    echo ""
    echo "❌ Some WebSocket tests failed!"
    echo ""
    echo "API server logs (last 30 lines):"
    tail -30 /tmp/ws_test_api.log
    exit 1
fi
