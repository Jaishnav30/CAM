-- ==============================================================================
-- Flyway Migration V15: Add UPI ID to Users
-- ==============================================================================

ALTER TABLE users 
    ADD COLUMN upi_id VARCHAR(100);

CREATE INDEX idx_users_upi_id ON users (LOWER(upi_id));
