-- +goose Up
-- +goose StatementBegin
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check CHECK (status IN ('new', 'starting_soon', 'playing', 'finished'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check CHECK (status IN ('new', 'starting_soon', 'playing'));
-- +goose StatementEnd
