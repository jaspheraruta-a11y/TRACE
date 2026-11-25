-- ============================================================================
-- TRACE — Phase 11
-- Audit hardening
--
-- The append-only audit writer and administrator-only read policy were created
-- in Phase 1. This migration adds an entity lookup index for record-level
-- accountability and re-asserts the no-write posture.
-- ============================================================================

begin;

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

-- Re-assert the read-only posture. These statements are intentionally
-- idempotent so the migration can be re-run safely.
revoke insert, update, delete, truncate
  on table public.audit_logs
  from anon;
revoke insert, update, delete, truncate
  on table public.audit_logs
  from authenticated;

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (private.is_admin());

-- ---------------------------------------------------------------------------
-- Schema version marker
-- ---------------------------------------------------------------------------
insert into public.system_settings (key, value, description, updated_at)
values (
  'schema_version',
  '{"version":"0.1.0","phase":11}'::jsonb,
  'TRACE schema version and latest applied phase',
  now()
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
