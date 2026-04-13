-- Incidents queries

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
