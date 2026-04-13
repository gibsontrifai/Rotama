BEGIN;

CREATE SCHEMA IF NOT EXISTS safetyhub;
SET search_path TO safetyhub, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('technician', 'supervisor', 'administrator');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_severity') THEN
    CREATE TYPE incident_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
    CREATE TYPE incident_status AS ENUM ('Open', 'Investigating', 'Closed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
    CREATE TYPE inspection_status AS ENUM ('Open Action', 'Closed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_status') THEN
    CREATE TYPE action_status AS ENUM ('Open', 'In Progress', 'Blocked', 'Done');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_priority') THEN
    CREATE TYPE action_priority AS ENUM ('Critical', 'High', 'Medium');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_source') THEN
    CREATE TYPE action_source AS ENUM ('Incident', 'Inspection', 'Audit');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachment_kind') THEN
    CREATE TYPE attachment_kind AS ENUM ('Photo', 'Document');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_source') THEN
    CREATE TYPE notification_source AS ENUM ('Cabang', 'Pusat');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_period') THEN
    CREATE TYPE report_period AS ENUM ('30d', '90d', 'ytd');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'focus_metric') THEN
    CREATE TYPE focus_metric AS ENUM ('TRIR', 'Near Miss', 'CAPA');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_code') THEN
    CREATE TYPE shift_code AS ENUM ('Shift A', 'Shift B', 'Shift C');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_schedule_status') THEN
    CREATE TYPE inspection_schedule_status AS ENUM ('Scheduled', 'In Progress', 'Completed', 'Cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS branches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100),
  is_head_office BOOLEAN NOT NULL DEFAULT FALSE,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(30),
  role user_role NOT NULL,
  position VARCHAR(150) NOT NULL,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_expertise (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expertise_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expertise_name)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  severity incident_severity NOT NULL,
  area VARCHAR(150) NOT NULL,
  status incident_status NOT NULL,
  pic_name VARCHAR(150) NOT NULL,
  reported_at TIMESTAMP NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspections (
  id VARCHAR(20) PRIMARY KEY,
  area VARCHAR(150) NOT NULL,
  inspector_name VARCHAR(150) NOT NULL,
  score NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
  status inspection_status NOT NULL,
  inspected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_items (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  area VARCHAR(150) NOT NULL,
  source action_source NOT NULL,
  source_ref VARCHAR(30) NOT NULL,
  priority action_priority NOT NULL,
  status action_status NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  due_at TIMESTAMP NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_updates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action_id VARCHAR(20) NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  detail TEXT NOT NULL,
  happened_at TIMESTAMP NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_attachments (
  id VARCHAR(20) PRIMARY KEY,
  action_id VARCHAR(20) NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  kind attachment_kind NOT NULL,
  uploaded_at TIMESTAMP NOT NULL,
  mime_type VARCHAR(150),
  size_label VARCHAR(50),
  preview_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(20) PRIMARY KEY,
  source notification_source NOT NULL,
  sender VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  display_time_label VARCHAR(50),
  unread BOOLEAN NOT NULL DEFAULT TRUE,
  target_roles user_role[] NOT NULL DEFAULT ARRAY[]::user_role[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_area_safety_snapshot (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_label VARCHAR(50) NOT NULL DEFAULT 'seed-2026-04',
  area VARCHAR(150) NOT NULL,
  inspections INTEGER NOT NULL DEFAULT 0,
  incidents INTEGER NOT NULL DEFAULT 0,
  compliance NUMERIC(5, 2) NOT NULL DEFAULT 0,
  trir NUMERIC(6, 2) NOT NULL DEFAULT 0,
  near_miss INTEGER NOT NULL DEFAULT 0,
  capa INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_label, area)
);

CREATE TABLE IF NOT EXISTS report_trends (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area VARCHAR(150) NOT NULL,
  period report_period NOT NULL,
  bucket_order SMALLINT NOT NULL CHECK (bucket_order BETWEEN 1 AND 6),
  metric_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (area, period, bucket_order)
);

CREATE TABLE IF NOT EXISTS report_focus_metrics (
  metric focus_metric PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_shift_performance (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_label VARCHAR(50) NOT NULL DEFAULT 'seed-2026-04',
  shift shift_code NOT NULL,
  area VARCHAR(150) NOT NULL,
  checklist_completion NUMERIC(5, 2) NOT NULL CHECK (checklist_completion >= 0 AND checklist_completion <= 100),
  incident_count INTEGER NOT NULL DEFAULT 0 CHECK (incident_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_label, shift, area)
);

CREATE TABLE IF NOT EXISTS inspection_schedules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schedule_code VARCHAR(30) NOT NULL UNIQUE,
  area VARCHAR(150) NOT NULL,
  pic_name VARCHAR(150) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status inspection_schedule_status NOT NULL DEFAULT 'Scheduled',
  source_inspection_id VARCHAR(20) REFERENCES inspections(id) ON DELETE SET NULL,
  created_by BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_branch_id ON app_users(branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_area ON incidents(area);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_actions_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_actions_due_at ON action_items(due_at);
CREATE INDEX IF NOT EXISTS idx_notifications_roles ON notifications USING GIN(target_roles);
CREATE INDEX IF NOT EXISTS idx_dashboard_shift_snapshot ON dashboard_shift_performance(snapshot_label);
CREATE INDEX IF NOT EXISTS idx_inspection_schedules_scheduled_at ON inspection_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_inspection_schedules_status ON inspection_schedules(status);

COMMENT ON TABLE app_users IS 'Mock user data adapted from frontend auth and user-management features.';
COMMENT ON COLUMN app_users.password_hash IS 'Replace mock values with bcrypt/argon2 hashes in production.';
COMMENT ON TABLE user_sessions IS 'Optional session storage for login/refresh-token backend implementation.';
COMMENT ON TABLE report_area_safety_snapshot IS 'Seed snapshot for reports page summary table.';
COMMENT ON TABLE report_trends IS 'Seed chart values for reports trend bars.';
COMMENT ON TABLE dashboard_shift_performance IS 'Seed rows backing dashboard Shift Safety Performance widget.';
COMMENT ON TABLE inspection_schedules IS 'Planned inspection agenda for dashboard Upcoming Inspections widget.';

INSERT INTO branches (code, name, city, is_head_office, latitude, longitude)
VALUES
  ('HO-JKT', 'Head Office - Jakarta', 'Jakarta', TRUE, -6.208800, 106.845600),
  ('BDG-PLANT', 'Bandung Plant', 'Bandung', FALSE, -6.917500, 107.619100),
  ('SBY-PLANT', 'Surabaya Plant', 'Surabaya', FALSE, -7.257500, 112.752100)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  is_head_office = EXCLUDED.is_head_office,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();

INSERT INTO app_users (username, password_hash, full_name, email, phone_number, role, position, branch_id, avatar_url)
VALUES
  (
    'admin',
    '$2b$10$mqlImjg4erMm4.A9o6vlk.FYpdWT3YiMlcNowV6VCWE2zRy5myEpS',
    'Budi Santoso',
    'admin@safetyhub.local',
    '081111111111',
    'administrator',
    'Safety Manager',
    (SELECT id FROM branches WHERE code = 'HO-JKT'),
    NULL
  ),
  (
    'supervisor',
    '$2b$10$mqlImjg4erMm4.A9o6vlk.FYpdWT3YiMlcNowV6VCWE2zRy5myEpS',
    'Siti Nurhaliza',
    'supervisor@safetyhub.local',
    '082222222222',
    'supervisor',
    'Health & Safety Supervisor',
    (SELECT id FROM branches WHERE code = 'BDG-PLANT'),
    NULL
  ),
  (
    'teknisi',
    '$2b$10$mqlImjg4erMm4.A9o6vlk.FYpdWT3YiMlcNowV6VCWE2zRy5myEpS',
    'Ahmad Hidayat',
    'teknisi@safetyhub.local',
    '083333333333',
    'technician',
    'Teknisi K3',
    (SELECT id FROM branches WHERE code = 'SBY-PLANT'),
    NULL
  ),
  (
    'inspector',
    '$2b$10$mqlImjg4erMm4.A9o6vlk.FYpdWT3YiMlcNowV6VCWE2zRy5myEpS',
    'Ahmad Hidayat',
    'inspector@safetyhub.local',
    '084444444444',
    'technician',
    'Safety Inspector',
    (SELECT id FROM branches WHERE code = 'SBY-PLANT'),
    NULL
  )
ON CONFLICT (username) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone_number = EXCLUDED.phone_number,
  role = EXCLUDED.role,
  position = EXCLUDED.position,
  branch_id = EXCLUDED.branch_id,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

INSERT INTO user_expertise (user_id, expertise_name)
SELECT u.id, x.expertise_name
FROM app_users u
JOIN (
  VALUES
    ('admin', 'Risk Assessment'),
    ('admin', 'Safety Policy'),
    ('admin', 'Incident Investigation'),
    ('supervisor', 'Workplace Inspection'),
    ('supervisor', 'Safety Training'),
    ('supervisor', 'Hazard Identification'),
    ('teknisi', 'Work Permit'),
    ('teknisi', 'PPE Audit'),
    ('teknisi', 'Safety Compliance'),
    ('inspector', 'Work Permit'),
    ('inspector', 'PPE Audit'),
    ('inspector', 'Safety Compliance')
) AS x(username, expertise_name)
  ON u.username = x.username
ON CONFLICT (user_id, expertise_name) DO NOTHING;

INSERT INTO incidents (id, title, severity, area, status, pic_name, reported_at)
VALUES
  ('INC-2411', 'Forklift near miss', 'High', 'Warehouse A', 'Investigating', 'HSE Team', TIMESTAMP '2026-04-11 08:42:00'),
  ('INC-2410', 'PPE violation', 'Medium', 'Production Line 2', 'Open', 'Supervisor Shift B', TIMESTAMP '2026-04-10 17:20:00'),
  ('INC-2409', 'Minor slip near loading dock', 'Low', 'Loading Bay', 'Closed', 'Ops Admin', TIMESTAMP '2026-04-10 09:15:00'),
  ('INC-2408', 'Chemical spill small volume', 'Critical', 'Chemical Storage', 'Investigating', 'Emergency Response', TIMESTAMP '2026-04-09 21:05:00')
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  severity = EXCLUDED.severity,
  area = EXCLUDED.area,
  status = EXCLUDED.status,
  pic_name = EXCLUDED.pic_name,
  reported_at = EXCLUDED.reported_at,
  updated_at = NOW();

INSERT INTO inspections (id, area, inspector_name, score, status, inspected_at)
VALUES
  ('INSP-1421', 'Warehouse A', 'Rizky', 86.00, 'Open Action', TIMESTAMP '2026-04-11 09:00:00'),
  ('INSP-1420', 'Boiler Room', 'Dina', 91.00, 'Closed', TIMESTAMP '2026-04-10 13:00:00'),
  ('INSP-1419', 'Packing Station', 'Ardi', 78.00, 'Open Action', TIMESTAMP '2026-04-10 10:30:00')
ON CONFLICT (id) DO UPDATE
SET
  area = EXCLUDED.area,
  inspector_name = EXCLUDED.inspector_name,
  score = EXCLUDED.score,
  status = EXCLUDED.status,
  inspected_at = EXCLUDED.inspected_at,
  updated_at = NOW();

INSERT INTO action_items (id, title, area, source, source_ref, priority, status, owner_name, due_at, progress)
VALUES
  ('ACT-3201', 'Install anti-slip mat near loading ramp', 'Loading Bay', 'Incident', 'INC-2411', 'Critical', 'In Progress', 'Facility Team', TIMESTAMP '2026-04-12 14:00:00', 72),
  ('ACT-3200', 'Re-certify forklift operators shift B', 'Warehouse A', 'Inspection', 'INSP-1421', 'High', 'Open', 'Ops Supervisor', TIMESTAMP '2026-04-13 09:00:00', 18),
  ('ACT-3199', 'Restock chemical spill response kits', 'Chemical Storage', 'Audit', 'AUD-88', 'Critical', 'Blocked', 'Procurement', TIMESTAMP '2026-04-11 17:00:00', 44),
  ('ACT-3198', 'Refresh PPE signage on packing station', 'Packing Station', 'Inspection', 'INSP-1419', 'Medium', 'Done', 'HSE Team', TIMESTAMP '2026-04-10 15:30:00', 100),
  ('ACT-3197', 'Review pedestrian path marking near dock', 'Warehouse B', 'Incident', 'INC-2408', 'High', 'In Progress', 'Engineering', TIMESTAMP '2026-04-14 11:00:00', 56)
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  area = EXCLUDED.area,
  source = EXCLUDED.source,
  source_ref = EXCLUDED.source_ref,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  owner_name = EXCLUDED.owner_name,
  due_at = EXCLUDED.due_at,
  progress = EXCLUDED.progress,
  updated_at = NOW();

INSERT INTO action_updates (action_id, title, detail, happened_at)
SELECT x.action_id, x.title, x.detail, x.happened_at
FROM (
  VALUES
    ('ACT-3201', 'Finding validated', 'Incident INC-2411 diverifikasi dan CAPA dibuka untuk area Loading Bay.', TIMESTAMP '2026-04-11 08:15:00'),
    ('ACT-3201', 'Owner assigned', 'Facility Team ditetapkan sebagai owner untuk kontrol permukaan licin di ramp.', TIMESTAMP '2026-04-11 10:10:00'),
    ('ACT-3200', 'Finding validated', 'Inspection INSP-1421 memicu action re-certification operator forklift shift B.', TIMESTAMP '2026-04-11 07:50:00'),
    ('ACT-3199', 'Supply issue flagged', 'Ketersediaan spill kit belum lengkap sehingga action tertahan di procurement.', TIMESTAMP '2026-04-11 09:25:00'),
    ('ACT-3198', 'Action closed', 'Signage PPE selesai diperbarui dan diverifikasi pada packing station.', TIMESTAMP '2026-04-10 15:30:00'),
    ('ACT-3197', 'Execution update', 'Penandaan ulang jalur pedestrian sedang dikerjakan bersama tim engineering.', TIMESTAMP '2026-04-11 12:10:00')
) AS x(action_id, title, detail, happened_at)
WHERE NOT EXISTS (
  SELECT 1
  FROM action_updates au
  WHERE au.action_id = x.action_id
    AND au.title = x.title
    AND au.happened_at = x.happened_at
);

INSERT INTO action_attachments (id, action_id, name, kind, uploaded_at, mime_type, size_label, preview_url)
VALUES
  ('ATT-9001', 'ACT-3201', 'loading-ramp-condition.jpg', 'Photo', TIMESTAMP '2026-04-11 10:35:00', 'image/jpeg', '1.8 MB', NULL),
  ('ATT-9002', 'ACT-3199', 'spill-kit-gap-list.pdf', 'Document', TIMESTAMP '2026-04-11 09:40:00', 'application/pdf', '420 KB', NULL),
  ('ATT-9003', 'ACT-3198', 'updated-ppe-signage.jpg', 'Photo', TIMESTAMP '2026-04-10 15:20:00', 'image/jpeg', '960 KB', NULL)
ON CONFLICT (id) DO UPDATE
SET
  action_id = EXCLUDED.action_id,
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  uploaded_at = EXCLUDED.uploaded_at,
  mime_type = EXCLUDED.mime_type,
  size_label = EXCLUDED.size_label,
  preview_url = EXCLUDED.preview_url;

INSERT INTO notifications (id, source, sender, message, display_time_label, unread, target_roles, created_at)
VALUES
  ('ntf-01', 'Cabang', 'Bandung Plant', 'Data inspeksi shift pagi sudah dikirim dan menunggu review pusat.', '10 menit lalu', TRUE, ARRAY['supervisor', 'administrator']::user_role[], TIMESTAMPTZ '2026-04-11 09:50:00+07'),
  ('ntf-02', 'Pusat', 'Head Office K3', 'Mohon update progres CAPA untuk incident dengan prioritas tinggi hari ini.', '32 menit lalu', TRUE, ARRAY['technician', 'supervisor', 'administrator']::user_role[], TIMESTAMPTZ '2026-04-11 09:28:00+07'),
  ('ntf-03', 'Cabang', 'Surabaya Plant', 'Laporan closing incident IN-347 sudah dilengkapi dokumen pendukung.', '1 jam lalu', FALSE, ARRAY['supervisor', 'administrator']::user_role[], TIMESTAMPTZ '2026-04-11 09:00:00+07'),
  ('ntf-04', 'Pusat', 'Audit Internal', 'Template checklist audit kuartal 2 telah diperbarui.', 'Kemarin', FALSE, ARRAY['administrator']::user_role[], TIMESTAMPTZ '2026-04-10 11:00:00+07'),
  ('ntf-05', 'Pusat', 'Monitoring Center', 'Reminder pengisian laporan harian cabang sebelum 18:00 WIB.', 'Hari ini', TRUE, ARRAY['technician', 'supervisor', 'administrator']::user_role[], TIMESTAMPTZ '2026-04-11 08:00:00+07')
ON CONFLICT (id) DO UPDATE
SET
  source = EXCLUDED.source,
  sender = EXCLUDED.sender,
  message = EXCLUDED.message,
  display_time_label = EXCLUDED.display_time_label,
  unread = EXCLUDED.unread,
  target_roles = EXCLUDED.target_roles,
  created_at = EXCLUDED.created_at;

INSERT INTO report_area_safety_snapshot (snapshot_label, area, inspections, incidents, compliance, trir, near_miss, capa)
VALUES
  ('seed-2026-04', 'Warehouse', 38, 5, 87.00, 2.10, 7, 11),
  ('seed-2026-04', 'Production', 52, 4, 91.00, 1.70, 6, 14),
  ('seed-2026-04', 'Utilities', 21, 2, 90.00, 1.40, 3, 8),
  ('seed-2026-04', 'Loading Bay', 17, 1, 93.00, 1.10, 2, 6)
ON CONFLICT (snapshot_label, area) DO UPDATE
SET
  inspections = EXCLUDED.inspections,
  incidents = EXCLUDED.incidents,
  compliance = EXCLUDED.compliance,
  trir = EXCLUDED.trir,
  near_miss = EXCLUDED.near_miss,
  capa = EXCLUDED.capa;

INSERT INTO report_trends (area, period, bucket_order, metric_value)
VALUES
  ('All Areas', '30d', 1, 18),
  ('All Areas', '30d', 2, 14),
  ('All Areas', '30d', 3, 16),
  ('All Areas', '30d', 4, 11),
  ('All Areas', '30d', 5, 9),
  ('All Areas', '30d', 6, 7),
  ('All Areas', '90d', 1, 22),
  ('All Areas', '90d', 2, 21),
  ('All Areas', '90d', 3, 19),
  ('All Areas', '90d', 4, 16),
  ('All Areas', '90d', 5, 14),
  ('All Areas', '90d', 6, 11),
  ('All Areas', 'ytd', 1, 27),
  ('All Areas', 'ytd', 2, 25),
  ('All Areas', 'ytd', 3, 23),
  ('All Areas', 'ytd', 4, 20),
  ('All Areas', 'ytd', 5, 18),
  ('All Areas', 'ytd', 6, 15),
  ('Warehouse', '30d', 1, 7),
  ('Warehouse', '30d', 2, 6),
  ('Warehouse', '30d', 3, 6),
  ('Warehouse', '30d', 4, 5),
  ('Warehouse', '30d', 5, 4),
  ('Warehouse', '30d', 6, 3),
  ('Warehouse', '90d', 1, 8),
  ('Warehouse', '90d', 2, 8),
  ('Warehouse', '90d', 3, 7),
  ('Warehouse', '90d', 4, 6),
  ('Warehouse', '90d', 5, 5),
  ('Warehouse', '90d', 6, 4),
  ('Warehouse', 'ytd', 1, 9),
  ('Warehouse', 'ytd', 2, 9),
  ('Warehouse', 'ytd', 3, 8),
  ('Warehouse', 'ytd', 4, 7),
  ('Warehouse', 'ytd', 5, 6),
  ('Warehouse', 'ytd', 6, 5),
  ('Production', '30d', 1, 8),
  ('Production', '30d', 2, 6),
  ('Production', '30d', 3, 7),
  ('Production', '30d', 4, 5),
  ('Production', '30d', 5, 4),
  ('Production', '30d', 6, 3),
  ('Production', '90d', 1, 10),
  ('Production', '90d', 2, 9),
  ('Production', '90d', 3, 8),
  ('Production', '90d', 4, 7),
  ('Production', '90d', 5, 6),
  ('Production', '90d', 6, 5),
  ('Production', 'ytd', 1, 12),
  ('Production', 'ytd', 2, 11),
  ('Production', 'ytd', 3, 10),
  ('Production', 'ytd', 4, 8),
  ('Production', 'ytd', 5, 7),
  ('Production', 'ytd', 6, 6),
  ('Utilities', '30d', 1, 3),
  ('Utilities', '30d', 2, 2),
  ('Utilities', '30d', 3, 2),
  ('Utilities', '30d', 4, 1),
  ('Utilities', '30d', 5, 1),
  ('Utilities', '30d', 6, 1),
  ('Utilities', '90d', 1, 4),
  ('Utilities', '90d', 2, 3),
  ('Utilities', '90d', 3, 3),
  ('Utilities', '90d', 4, 2),
  ('Utilities', '90d', 5, 2),
  ('Utilities', '90d', 6, 1),
  ('Utilities', 'ytd', 1, 5),
  ('Utilities', 'ytd', 2, 4),
  ('Utilities', 'ytd', 3, 4),
  ('Utilities', 'ytd', 4, 3),
  ('Utilities', 'ytd', 5, 2),
  ('Utilities', 'ytd', 6, 2),
  ('Loading Bay', '30d', 1, 2),
  ('Loading Bay', '30d', 2, 2),
  ('Loading Bay', '30d', 3, 1),
  ('Loading Bay', '30d', 4, 1),
  ('Loading Bay', '30d', 5, 1),
  ('Loading Bay', '30d', 6, 0),
  ('Loading Bay', '90d', 1, 3),
  ('Loading Bay', '90d', 2, 2),
  ('Loading Bay', '90d', 3, 2),
  ('Loading Bay', '90d', 4, 1),
  ('Loading Bay', '90d', 5, 1),
  ('Loading Bay', '90d', 6, 1),
  ('Loading Bay', 'ytd', 1, 4),
  ('Loading Bay', 'ytd', 2, 3),
  ('Loading Bay', 'ytd', 3, 2),
  ('Loading Bay', 'ytd', 4, 2),
  ('Loading Bay', 'ytd', 5, 1),
  ('Loading Bay', 'ytd', 6, 1)
ON CONFLICT (area, period, bucket_order) DO UPDATE
SET metric_value = EXCLUDED.metric_value;

INSERT INTO report_focus_metrics (metric)
VALUES
  ('TRIR'),
  ('Near Miss'),
  ('CAPA')
ON CONFLICT (metric) DO NOTHING;

INSERT INTO dashboard_shift_performance (snapshot_label, shift, area, checklist_completion, incident_count)
VALUES
  ('seed-2026-04', 'Shift A', 'Assembly Line', 92.00, 0),
  ('seed-2026-04', 'Shift B', 'Warehouse', 76.00, 1),
  ('seed-2026-04', 'Shift C', 'Loading Bay', 84.00, 0)
ON CONFLICT (snapshot_label, shift, area) DO UPDATE
SET
  checklist_completion = EXCLUDED.checklist_completion,
  incident_count = EXCLUDED.incident_count,
  updated_at = NOW();

INSERT INTO inspection_schedules (schedule_code, area, pic_name, scheduled_at, status, created_by)
VALUES
  (
    'SCH-20260412-01',
    'Boiler Room',
    'Gibson',
    TIMESTAMPTZ '2026-04-12 09:30:00+07',
    'Scheduled',
    (SELECT id FROM app_users WHERE username = 'supervisor')
  ),
  (
    'SCH-20260412-02',
    'Chemical Storage',
    'Baharuddin',
    TIMESTAMPTZ '2026-04-12 11:00:00+07',
    'Scheduled',
    (SELECT id FROM app_users WHERE username = 'teknisi')
  ),
  (
    'SCH-20260412-03',
    'Packing Station',
    'Marusel',
    TIMESTAMPTZ '2026-04-12 15:30:00+07',
    'Scheduled',
    (SELECT id FROM app_users WHERE username = 'inspector')
  )
ON CONFLICT (schedule_code) DO UPDATE
SET
  area = EXCLUDED.area,
  pic_name = EXCLUDED.pic_name,
  scheduled_at = EXCLUDED.scheduled_at,
  status = EXCLUDED.status,
  created_by = EXCLUDED.created_by,
  updated_at = NOW();

COMMIT;