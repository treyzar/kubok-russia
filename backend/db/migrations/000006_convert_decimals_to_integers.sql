-- +goose Up
-- +goose StatementBegin

-- Convert users.balance from DECIMAL to INTEGER (no multiplication - it's game currency!)
ALTER TABLE users ALTER COLUMN balance TYPE INTEGER USING balance::INTEGER;
ALTER TABLE users ALTER COLUMN balance SET DEFAULT 0;

-- Convert rooms.jackpot and entry_cost from DECIMAL to INTEGER
ALTER TABLE rooms ALTER COLUMN jackpot TYPE INTEGER USING jackpot::INTEGER;
ALTER TABLE rooms ALTER COLUMN jackpot SET DEFAULT 0;
ALTER TABLE rooms ALTER COLUMN entry_cost TYPE INTEGER USING entry_cost::INTEGER;

-- Convert room_winners.prize from DECIMAL to INTEGER
ALTER TABLE room_winners ALTER COLUMN prize TYPE INTEGER USING prize::INTEGER;

-- Convert room_boosts.amount from DECIMAL to INTEGER
ALTER TABLE room_boosts ALTER COLUMN amount TYPE INTEGER USING amount::INTEGER;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Revert back to DECIMAL
ALTER TABLE users ALTER COLUMN balance TYPE DECIMAL(10, 2) USING balance::DECIMAL(10, 2);
ALTER TABLE users ALTER COLUMN balance SET DEFAULT 0;

ALTER TABLE rooms ALTER COLUMN jackpot TYPE DECIMAL(10, 2) USING jackpot::DECIMAL(10, 2);
ALTER TABLE rooms ALTER COLUMN jackpot SET DEFAULT 0;
ALTER TABLE rooms ALTER COLUMN entry_cost TYPE DECIMAL(10, 2) USING entry_cost::DECIMAL(10, 2);

ALTER TABLE room_winners ALTER COLUMN prize TYPE DECIMAL(10, 2) USING prize::DECIMAL(10, 2);

ALTER TABLE room_boosts ALTER COLUMN amount TYPE DECIMAL(10, 2) USING amount::DECIMAL(10, 2);

-- +goose StatementEnd
