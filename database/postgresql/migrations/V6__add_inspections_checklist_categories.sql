BEGIN;

SET search_path TO safetyhub, public;

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS checklist_categories TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN inspections.checklist_categories IS 'Array of checked categories: Motor Diesel, Apar, Hidrant, Alarm, Panel Listrik, Forklip, Cargo Lift, Compresor';

COMMIT;
