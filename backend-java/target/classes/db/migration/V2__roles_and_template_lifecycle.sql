-- V2: introduce explicit user roles, max_players on templates, soft-delete for templates.

-- ---------------------------------------------------------------
-- Users: role column. USER by default; ADMIN for hard-coded admin.
-- ---------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'USER';
ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('USER','ADMIN'));

-- ---------------------------------------------------------------
-- Templates: max_players (alongside legacy players_needed) and
-- soft-delete column. We keep players_needed for backwards compat
-- with the room-creation pipeline; max_players is the canonical
-- value the admin UI manipulates and is mirrored to players_needed
-- inside TemplateLifecycleService.applyDto.
-- ---------------------------------------------------------------
ALTER TABLE room_templates
    ADD COLUMN max_players INTEGER NOT NULL DEFAULT 1;
UPDATE room_templates SET max_players = players_needed;
ALTER TABLE room_templates
    ADD CONSTRAINT check_template_max_players
        CHECK (max_players >= min_players AND max_players >= 1);

ALTER TABLE room_templates
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;
CREATE INDEX idx_room_templates_deleted_at ON room_templates(deleted_at);
