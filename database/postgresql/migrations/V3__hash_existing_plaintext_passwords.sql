BEGIN;

SET search_path TO safetyhub, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE app_users
SET
  password_hash = crypt(password_hash, gen_salt('bf')),
  updated_at = NOW()
WHERE
  password_hash IS NOT NULL
  AND password_hash NOT LIKE '$2a$%'
  AND password_hash NOT LIKE '$2b$%'
  AND password_hash NOT LIKE '$2y$%';

COMMIT;
