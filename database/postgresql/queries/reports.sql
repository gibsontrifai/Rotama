-- Reports queries

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
