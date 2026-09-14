-- Migration V16: Add soft-delete flag and timestamp to users
ALTER TABLE users ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_users_is_deleted ON users (is_deleted);
