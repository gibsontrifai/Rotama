# Feature SQL Query Files

Kumpulan query SQL per fitur untuk backend SafetyHub.

## Files

- auth.sql
- dashboard.sql
- incidents.sql
- inspections.sql
- actions.sql
- reports.sql
- notifications.sql

## Usage

- Query ini ditulis untuk schema `safetyhub`.
- Placeholder parameter (`$1`, `$2`, dst) ditujukan untuk prepared statement di backend.
- Untuk uji manual di DBeaver, isi parameter dengan nilai yang sesuai atau `NULL` jika filter opsional tidak dipakai.
