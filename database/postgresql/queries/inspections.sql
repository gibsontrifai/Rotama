-- Inspections queries

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
