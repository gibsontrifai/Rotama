-- Auth queries

-- Login profile by username
SELECT
  u.id,
  u.username,
  u.password_hash,
  u.full_name,
  u.role,
  u.position,
  b.name AS branch_name,
  u.avatar_url,
  u.is_active
FROM safetyhub.app_users u
LEFT JOIN safetyhub.branches b ON b.id = u.branch_id
WHERE u.username = $1
LIMIT 1;

-- Expertise list by user id
SELECT ue.expertise_name
FROM safetyhub.user_expertise ue
WHERE ue.user_id = $1
ORDER BY ue.expertise_name;
