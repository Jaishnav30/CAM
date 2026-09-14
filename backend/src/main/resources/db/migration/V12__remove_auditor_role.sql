-- ==============================================================================
-- V12: Complete Removal of AUDITOR Role
-- Purges AUDITOR role, mappings, and any associated user records
-- ==============================================================================

-- 1. Remove user_roles mappings for AUDITOR role and auditor user
DELETE FROM user_roles
WHERE role_id IN (SELECT id FROM roles WHERE name = 'AUDITOR')
   OR user_id IN (SELECT id FROM users WHERE email = 'auditor@cams.local');

-- 2. Remove role_permissions for AUDITOR
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE name = 'AUDITOR');

-- 3. Delete any test/demo auditor user
DELETE FROM users
WHERE email = 'auditor@cams.local';

-- 4. Delete the AUDITOR role from roles table
DELETE FROM roles
WHERE name = 'AUDITOR';

-- 5. Update role check constraint to only allow ADMIN, ACCOUNTANT, MEMBER
ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_name;
ALTER TABLE roles ADD CONSTRAINT chk_roles_name CHECK (name IN ('ADMIN', 'ACCOUNTANT', 'MEMBER'));


