-- ==============================================================================
-- V13: Add User Registration and Profile Fields
-- Adds: username, avatar_url, batch, committee, approval_status, rejection_reason
-- ==============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS batch VARCHAR(50),
    ADD COLUMN IF NOT EXISTS committee VARCHAR(100),
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Generate default username from email prefix for existing users
UPDATE users
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

-- Enforce unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));

-- Index on approval status for admin filtering
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
