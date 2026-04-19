# Migration from DECIMAL to INTEGER for Game Currency

## Summary

All balance/currency fields have been converted from `DECIMAL(10,2)` to `INTEGER` to avoid the complexity and bugs associated with `pgtype.Numeric`. These are game currency/bonus points, NOT real money.

## Changes Made

### Database Schema (Migration 000006)
- `users.balance`: DECIMAL(10,2) → INTEGER (game currency)
- `rooms.jackpot`: DECIMAL(10,2) → INTEGER (game currency)
- `rooms.entry_cost`: DECIMAL(10,2) → INTEGER (game currency)
- `room_winners.prize`: DECIMAL(10,2) → INTEGER (game currency)
- `room_boosts.amount`: DECIMAL(10,2) → INTEGER (game currency)

**IMPORTANT**: Values are NOT multiplied - they stay as-is. 100 means 100 game currency units, not $1.00.

### Code Changes
- **bot_manager.go**: Now uses `int32` instead of `pgtype.Numeric`
  - Bot initial balance: 500 (game currency)
  - Balance increase: 200 (game currency)
  - Balance threshold: 500 (game currency)

- **test files**: All test values use plain integers
  - User balances: 1000, 50, 2000
  - Room entry costs: 100
  - Boost amounts: 50
  - Prizes: 500

## Benefits

1. **Simplicity**: No more dealing with `pgtype.Numeric`, `big.Int`, and `Exp` values
2. **Performance**: Integer operations are faster than decimal operations
3. **Reliability**: No more confusion about decimal places and representation
4. **Clarity**: Values are exactly what they appear to be - no hidden multipliers

## Usage

Values are used directly as integers:
```go
balance := int32(1000) // 1000 game currency units
fmt.Printf("Balance: %d", balance)
```

## Migration Steps

1. Run `goose up` to apply migration 000006
2. Run `sqlc generate` to regenerate repository code
3. All existing data will be automatically converted (no multiplication, just type change)
