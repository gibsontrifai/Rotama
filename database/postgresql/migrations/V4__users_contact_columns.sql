BEGIN;

SET search_path TO safetyhub, public;

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_email
  ON app_users(email)
  WHERE email IS NOT NULL;

UPDATE app_users
SET
  email = CONCAT(username, '@safetyhub.local'),
  phone_number = CASE username
    WHEN 'admin' THEN '081111111111'
    WHEN 'supervisor' THEN '082222222222'
    WHEN 'teknisi' THEN '083333333333'
    WHEN 'inspector' THEN '084444444444'
    ELSE COALESCE(phone_number, '080000000000')
  END,
  updated_at = NOW()
WHERE email IS NULL OR phone_number IS NULL;

COMMIT;
