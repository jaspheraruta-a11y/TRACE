-- ============================================================================
-- TRACE — Phase 1 seed data
--
-- Non-secret system settings only. NO student records are seeded here.
-- Development fixtures belong in a separate, clearly labelled dev seed and
-- must never be promoted to production.
--
-- Run after 20261124090000_phase1_foundation.sql.
-- ============================================================================

begin;

-- The schema version is safe to update on re-run.
insert into public.system_settings (key, value, description)
values (
  'schema_version',
  '{"version": "0.1.0", "phase": 1}'::jsonb,
  'TRACE database foundation version reported to the dashboard.'
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

-- Descriptive defaults are inserted once and never overwritten by the seed,
-- so an administrator can safely edit them later.
insert into public.system_settings (key, value, description)
values
  (
    'school_name',
    '{"value": "Junior High School"}'::jsonb,
    'School name used on labels and printed reports.'
  ),
  (
    'registrar_office_name',
    '{"value": "Registrar''s Office"}'::jsonb,
    'Office name shown in the application shell and reports.'
  ),
  (
    'archive_locator_prefix',
    '{"value": "JHS"}'::jsonb,
    'Default prefix for physical locator codes, for example JHS-1992-BOX3-FOLDER12.'
  ),
  (
    'default_signed_url_seconds',
    '{"value": 120}'::jsonb,
    'Short expiry for private document signed URLs. Enforced when document storage is implemented.'
  )
on conflict (key) do nothing;

commit;
