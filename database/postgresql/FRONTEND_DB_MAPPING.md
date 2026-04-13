# SafetyHub Frontend to Database Mapping

Dokumen ini memetakan fitur frontend yang sudah ada ke struktur database PostgreSQL di `safetyhub_schema_seed.sql`.

## Auth + Profile + User Management

- Login/refresh session:
  - `app_users`
  - `user_sessions`
- Data profil user:
  - `app_users` (`full_name`, `position`, `branch_id`, `avatar_url`, `role`)
  - `user_expertise`
  - `branches`
- User management list:
  - `app_users` join `branches`

## Notifications

- Bell notification dropdown:
  - `notifications`
- Role-based visibility:
  - `notifications.target_roles` (array enum `user_role`)

## Incidents

- Incident list page:
  - `incidents`

## Inspections

- Inspection list + create inspection:
  - `inspections`

## Actions (CAPA)

- Action tracker list:
  - `action_items`
- Timeline updates di action detail:
  - `action_updates`
- Attachment uploads:
  - `action_attachments`

## Reports

- Area safety table:
  - `report_area_safety_snapshot`
- Trend chart by area/period:
  - `report_trends`
- Focus metric options:
  - `report_focus_metrics`

## Dashboard

- KPI cards dan CAPA monitor:
  - aggregasi dari `action_items`
- Shift safety performance table:
  - `dashboard_shift_performance`
- Upcoming inspections list:
  - `inspection_schedules`

## Notes for Backend API Layer

- ID format string di frontend (contoh `INC-2411`, `ACT-3201`) saat ini dipertahankan agar transisi dari mock API lebih mulus.
- Untuk produksi, `password_hash` wajib menggunakan hash aman (bcrypt/argon2), bukan mock value.
- Tanggal di frontend saat ini masih format display string; API backend sebaiknya kirim ISO timestamp lalu formatting dilakukan di frontend.

## Migration Files

- Schema migration: `database/postgresql/migrations/V1__safetyhub_schema.sql`
- Seed migration: `database/postgresql/migrations/V2__safetyhub_seed.sql`

Urutan eksekusi:

1. Jalankan V1 untuk membuat schema, enum, tabel, index, dan comment.
2. Jalankan V2 untuk mengisi data awal sesuai mock frontend.
