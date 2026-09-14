-- Migration V17: Release email and username for already deleted users
UPDATE users
SET email = 'deleted_' || id || '_' || email,
    username = 'deleted_' || SUBSTRING(id::text, 1, 8) || '_' || username
WHERE is_deleted = TRUE
  AND email NOT LIKE 'deleted_%';
