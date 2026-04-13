-- Actions queries

-- Action list
SELECT
  a.id,
  a.title,
  a.area,
  a.source,
  a.source_ref,
  a.priority,
  a.status,
  a.owner_name,
  a.due_at,
  a.progress
FROM safetyhub.action_items a
WHERE (NULLIF($1::text, '') IS NULL OR a.status::text = $1::text)
  AND (NULLIF($2::text, '') IS NULL OR a.priority::text = $2::text)
  AND (NULLIF($3::text, '') IS NULL OR a.source::text = $3::text)
  AND ($4::text IS NULL OR a.area ILIKE '%' || $4 || '%')
ORDER BY a.due_at ASC, a.updated_at DESC;

-- Action detail base
SELECT
  a.id,
  a.title,
  a.area,
  a.source,
  a.source_ref,
  a.priority,
  a.status,
  a.owner_name,
  a.due_at,
  a.progress,
  a.created_at,
  a.updated_at
FROM safetyhub.action_items a
WHERE a.id = $1
LIMIT 1;

-- Action detail timeline
SELECT
  u.id,
  u.title,
  u.detail,
  u.happened_at,
  u.created_at
FROM safetyhub.action_updates u
WHERE u.action_id = $1
ORDER BY u.happened_at DESC, u.id DESC;

-- Action detail attachments
SELECT
  att.id,
  att.name,
  att.kind,
  att.uploaded_at,
  att.mime_type,
  att.size_label,
  att.preview_url
FROM safetyhub.action_attachments att
WHERE att.action_id = $1
ORDER BY att.uploaded_at DESC, att.id DESC;

-- Update action progress
UPDATE safetyhub.action_items
SET
  progress = $2,
  status = $3,
  updated_at = NOW()
WHERE id = $1
RETURNING id, progress, status, updated_at;

-- Insert action update note
INSERT INTO safetyhub.action_updates (action_id, title, detail, happened_at)
VALUES ($1, $2, $3, NOW())
RETURNING id, action_id, title, detail, happened_at;

-- Add attachment
INSERT INTO safetyhub.action_attachments (
  id,
  action_id,
  name,
  kind,
  uploaded_at,
  mime_type,
  size_label,
  preview_url
)
VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
RETURNING id, action_id, name, kind, uploaded_at;

-- Delete attachment
DELETE FROM safetyhub.action_attachments
WHERE action_id = $1 AND id = $2;
