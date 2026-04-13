BEGIN;

SET search_path TO safetyhub, public;

-- Align seeded accounts to default credential: SafetyHub@2026
UPDATE app_users
SET password_hash = '$2b$10$mqlImjg4erMm4.A9o6vlk.FYpdWT3YiMlcNowV6VCWE2zRy5myEpS',
    updated_at = NOW()
WHERE username IN ('admin', 'supervisor', 'teknisi', 'inspector');

COMMIT;
