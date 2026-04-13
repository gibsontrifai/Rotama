-- SafetyHub API-ready SQL Queries
-- Jalankan di database: safetyhub
-- Gunakan schema prefix safetyhub agar aman dari error search_path.
-- Catatan DBeaver: untuk filter opsional, isi NULL/blank jika tidak dipakai.

-- =========================================================
-- AUTH
-- =========================================================

-- Login profile by username (backend nanti tetap validasi password_hash di aplikasi)
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

-- =========================================================
-- DASHBOARD
-- =========================================================

-- KPI dashboard dari action items
SELECT
  COUNT(*) FILTER (WHERE a.status <> 'Done') AS open_findings,
  COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.priority = 'Critical') AS critical_risk,
  COUNT(*) FILTER (WHERE a.source = 'Inspection') AS inspections_this_week,
  COUNT(*) FILTER (WHERE a.source = 'Incident') AS near_miss_reports
FROM safetyhub.action_items a;

-- CAPA aging summary
SELECT
  COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.due_at::date < CURRENT_DATE) AS overdue_count,
  COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.due_at::date = CURRENT_DATE) AS due_today_count,
  COUNT(*) FILTER (WHERE a.status <> 'Done' AND a.due_at::date BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 2) AS due_soon_count,
  COUNT(*) FILTER (WHERE a.status = 'Blocked') AS blocked_count
FROM safetyhub.action_items a;

-- CAPA spotlight list (priority -> due_at)
SELECT
  a.id,
  a.title,
  a.area,
  a.priority,
  a.status,
  a.owner_name,
  a.due_at,
  a.progress,
  a.source,
  a.source_ref
FROM safetyhub.action_items a
WHERE a.status <> 'Done'
ORDER BY
  CASE a.priority
    WHEN 'Critical' THEN 1
    WHEN 'High' THEN 2
    ELSE 3
  END,
  a.due_at ASC
LIMIT $1;

-- Shift safety performance table
SELECT
  d.shift,
  d.area,
  d.checklist_completion,
  d.incident_count
FROM safetyhub.dashboard_shift_performance d
WHERE d.snapshot_label = $1
ORDER BY d.shift;

-- Upcoming inspections (next 24 hours)
SELECT
  s.schedule_code,
  s.area,
  s.pic_name,
  s.scheduled_at,
  s.status
FROM safetyhub.inspection_schedules s
WHERE s.scheduled_at BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
ORDER BY s.scheduled_at;

-- =========================================================
-- INCIDENTS
-- =========================================================

-- Incident list (optional filters)
SELECT
  i.id,
  i.title,
  i.severity,
  i.area,
  i.status,
  i.pic_name,
  i.reported_at
FROM safetyhub.incidents i
WHERE (NULLIF($1::text, '') IS NULL OR i.status::text = $1::text)
  AND ($2::text IS NULL OR i.area ILIKE '%' || $2 || '%')
  AND ($3::text IS NULL OR i.title ILIKE '%' || $3 || '%')
ORDER BY i.reported_at DESC;

-- =========================================================
-- INSPECTIONS
-- =========================================================

-- Inspection list
SELECT
  ins.id,
  ins.area,
  ins.inspector_name,
  ins.score,
  ins.status,
  ins.inspected_at
FROM safetyhub.inspections ins
WHERE (NULLIF($1::text, '') IS NULL OR ins.status::text = $1::text)
  AND ($2::text IS NULL OR ins.area ILIKE '%' || $2 || '%')
ORDER BY ins.inspected_at DESC;

-- Create inspection
INSERT INTO safetyhub.inspections (id, area, inspector_name, score, status, inspected_at)
VALUES ($1, $2, $3, $4, $5, NOW())
RETURNING id, area, inspector_name, score, status, inspected_at;

-- =========================================================
-- ACTIONS
-- =========================================================

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

-- =========================================================
-- REPORTS
-- =========================================================

-- Area safety summary rows
SELECT
  r.area,
  r.inspections,
  r.incidents,
  r.compliance,
  r.trir,
  r.near_miss,
  r.capa
FROM safetyhub.report_area_safety_snapshot r
WHERE r.snapshot_label = $1
ORDER BY r.area;

-- Trend rows by area + period
SELECT
  t.area,
  t.period,
  t.bucket_order,
  t.metric_value
FROM safetyhub.report_trends t
WHERE ($1::text IS NULL OR t.area = $1)
  AND (NULLIF($2::text, '') IS NULL OR t.period::text = $2::text)
ORDER BY t.area, t.period, t.bucket_order;

-- Focus metrics list
SELECT metric
FROM safetyhub.report_focus_metrics
ORDER BY metric;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

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
