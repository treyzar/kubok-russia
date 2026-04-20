# Room Places Integration Tests

This test suite validates the room_places table functionality including place creation, sequential indexing, CASCADE deletes, and stake calculations.

## What is Tested

1. **User Creation** - Creates test users with sufficient balance
2. **Join Room with 1 Place** - Verifies single place creation with place_index=1
3. **Join Room with Multiple Places** - Tests creating multiple place records for one user
4. **Sequential Place Indices** - Validates that place_index values are sequential (1,2,3,4,5,6...)
5. **Place Counts in API Responses** - Ensures ListRoomPlayers returns correct place counts
6. **Leave Room CASCADE Delete** - Verifies all place records are deleted when user leaves
7. **Stake Calculations** - Tests that stakes are calculated as entry_cost * places
8. **Stake Calculations with Boosts** - Validates stakes include boosts: (entry_cost * places) + boost
9. **Bot Integration** - Ensures bots can join with places and stakes are calculated correctly
10. **Cleanup** - Removes all test data

## Running the Tests

### Prerequisites

- Docker (for database)
- Go 1.21+
- PostgreSQL client tools (goose, sqlc)
- Database migrations applied (including room_places table)

### Run Tests

```bash
cd backend/tests/room_places
./run.sh
```

The script will:
1. Start the database
2. Run migrations
3. Start the API service
4. Wait for service to initialize
5. Run the integration tests
6. Clean up and stop services

### Manual Testing

If you want to run tests manually:

```bash
# Terminal 1: Start services
cd backend
make serve

# Terminal 2: Run tests (after services are up)
cd backend/tests/room_places
go run main.go
```

## Test Output

Successful run:
```
✅ PASSED: Test 1: Create test users
✅ PASSED: Test 2: Join room with 1 place
✅ PASSED: Test 3: Join room with multiple places
✅ PASSED: Test 4: Verify sequential place_index assignment
✅ PASSED: Test 5: Verify place counts in API responses
✅ PASSED: Test 6: Leave room with multiple places (CASCADE delete)
✅ PASSED: Test 7: Verify stake calculations with places
✅ PASSED: Test 8: Verify stake calculations with boosts
✅ PASSED: Test 9: Verify bot integration with places
✅ PASSED: Test 10: Cleanup test data
=== Test Results ===
Passed: 10
Failed: 0
```

## Notes

- Tests create temporary users, bots, and rooms
- All test data is cleaned up at the end
- Tests verify the core room_places functionality:
  - Sequential place_index assignment
  - CASCADE delete on room_players deletion
  - Correct stake calculations including places
  - Bot integration with places
