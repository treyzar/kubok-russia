# Room Template Settings Integration Tests

This test suite validates the room template settings feature, including:
- Template creation with custom round duration, start delay, and game type
- Validation of field constraints
- Room creation from templates with inherited settings
- Room lifecycle with custom timing
- Backward compatibility with default values

## Prerequisites

1. PostgreSQL database running with migrations applied
2. API server running on `http://localhost:8888`
3. Go installed

## Running the Tests

```bash
cd backend/tests/template_settings
bash run.sh
```

Or run directly:
```bash
go run main.go
```

## Test Coverage

### Task 5.1: Template Creation with New Fields
- ✅ Create template with custom round_duration_seconds, start_delay_seconds, game_type
- ✅ Verify template is stored correctly with all fields
- ✅ Test validation errors for out-of-range round_duration_seconds (too low/high)
- ✅ Test validation errors for out-of-range start_delay_seconds (too low/high)
- ✅ Test validation errors for invalid game_type

### Task 5.2: Room Creation from Template
- ✅ Create room from template with custom settings
- ✅ Verify all settings are copied to room record
- ✅ Verify room inherits round_duration_seconds, start_delay_seconds, game_type

### Task 5.3: Room Lifecycle with Custom Timing
- ✅ Join room and verify start_time uses custom start_delay_seconds
- ✅ Verify room transitions to playing after custom delay (requires room_starter cron)
- ✅ Verify room finishes after custom round_duration_seconds (requires room_finisher cron)
- ✅ Verify winner receives correct percentage based on winner_pct

### Task 5.4: Backward Compatibility
- ✅ Create template without providing optional fields
- ✅ Verify default values are applied (30s round, 60s delay, "train" type)

## Notes

- Tests 12-14 verify the logic but require the room_starter and room_finisher cron jobs to be running for full end-to-end validation
- The tests create and clean up their own test data
- All validation tests verify that the API correctly rejects invalid input
