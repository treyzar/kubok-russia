-- +goose Up
-- +goose StatementBegin
ALTER TABLE rooms ADD COLUMN template_id INTEGER REFERENCES room_templates(template_id) ON DELETE SET NULL;
CREATE INDEX idx_rooms_template_id ON rooms(template_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_rooms_template_id;
ALTER TABLE rooms DROP COLUMN IF EXISTS template_id;
-- +goose StatementEnd
