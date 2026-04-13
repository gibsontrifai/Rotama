-- Dashboard queries

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
