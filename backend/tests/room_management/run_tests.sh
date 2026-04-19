#!env bash

set -e

echo "=== Room Management Integration Tests ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/../.."

cd "$BACKEND_DIR"

echo "📦 Ensuring database is running..."
make databases > /dev/null 2>&1 || true
sleep 2

echo "🔄 Running migrations..."
cd "$BACKEND_DIR"
# Run goose up to ensure all migrations are applied
export $(cat .env | grep -v '^#' | xargs)
goose -dir db/migrations postgres "$GOOSE_DBSTRING" up > /dev/null 2>&1 || true
sqlc generate > /dev/null 2>&1

echo "🚀 Starting services in background..."
# Start services in background
make serve > /tmp/services.log 2>&1 &
SERVICES_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    if [ ! -z "$SERVICES_PID" ]; then
        echo "Stopping services (PID: $SERVICES_PID)..."
        kill $SERVICES_PID 2>/dev/null || true
        # Kill all child processes
        pkill -P $SERVICES_PID 2>/dev/null || true
    fi
    echo "Cleanup complete"
}

# Register cleanup function
trap cleanup EXIT INT TERM

echo "⏳ Waiting for services to start (5 seconds)..."
sleep 5

echo ""
echo "🧪 Running integration tests..."
echo ""

# Run the tests from the backend directory so .env is found
cd "$BACKEND_DIR"
if go run tests/room_management/main.go; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Service logs (last 30 lines):"
    tail -30 /tmp/services.log
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo "Service logs (last 80 lines):"
    tail -80 /tmp/services.log
    exit 1
fi
