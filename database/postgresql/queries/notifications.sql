-- Notifications queries

-- Notifications by role
SELECT
  n.id,
  n.source,
  n.sender,
  n.message,
  n.display_time_label,
  n.unread,
  n.target_roles,
  n.created_at
FROM safetyhub.notifications n
WHERE EXISTS (
  SELECT 1
  FROM unnest(n.target_roles) AS role_item
  WHERE role_item::text = $1::text
)
ORDER BY n.created_at DESC;

-- Mark one notification read
UPDATE safetyhub.notifications
SET unread = FALSE
WHERE id = $1
RETURNING id, unread;

-- Mark all notifications read by role
UPDATE safetyhub.notifications
SET unread = FALSE
WHERE EXISTS (
  SELECT 1
  FROM unnest(target_roles) AS role_item
  WHERE role_item::text = $1::text
)
  AND unread = TRUE
RETURNING id;
