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

COMMIT;
