# Room Management Integration Tests

This test suite validates the complete room management lifecycle including user joins, leaves, boosts, and automatic room starting.

## What is Tested

1. **User Creation** - Creates test users with different balance levels
2. **User Join Room** - Verifies users can join rooms with sufficient balance
3. **Insufficient Balance** - Ensures users with low balance cannot join
4. **Duplicate Join Prevention** - Prevents users from joining the same room twice
5. **Full Room Prevention** - Blocks joins when room is at capacity
6. **Leave Room** - Tests leaving before game starts with refund
7. **Cannot Leave After Start** - Verifies users cannot leave playing rooms
8. **Room Auto-Start** - Tests automatic room starting by room_manager service
9. **Boost Playing Room** - Validates boosting mechanics during gameplay
10. **Cannot Boost Non-Playing** - Ensures boosts only work on playing rooms
11. **Winner Declaration** - Tests winner assignment in finished rooms
12. **Cleanup** - Removes all test data

## Running the Tests

### Prerequisites

- Docker (for database)
- Go 1.21+
- PostgreSQL client tools (goose, sqlc)

### Run Tests

```bash
cd backend/tests/room_management
./run_tests.sh
```

The script will:
1. Start the database
2. Run migrations
3. Start all services (API, bot_manager, room_manager)
4. Wait for services to initialize
5. Run the integration tests
6. Clean up and stop services

### Manual Testing

If you want to run tests manually:

```bash
# Terminal 1: Start services
cd backend
make serve

# Terminal 2: Run tests (after services are up)
cd backend/tests/room_management
go run main.go
```

## Test Output

Successful run:
```
✅ PASSED: Test 1: Create test users
✅ PASSED: Test 2: User can join room with sufficient balance
...
=== Test Results ===
Passed: 12
Failed: 0
```

Failed run:
```
❌ FAILED: Test 2: User can join room with sufficient balance - balance not deducted
...
=== Test Results ===
Passed: 1
Failed: 1
```

## Notes

- Tests create temporary users and rooms
- All test data is cleaned up at the end
- Tests wait for background services (bot_manager, room_manager) to process
- Some tests may take a few seconds due to cron job intervals
