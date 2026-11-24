-- ============================================================================
-- TRACE — Transcript and Record Archival and Cataloguing Engine
-- Phase 1 foundation migration
--
-- Creates the minimum secure database shell:
--   * application roles (enum)
--   * staff profiles linked to Supabase Authentication
--   * append-only audit log foundation
--   * system settings
--   * helper functions and row-level security policies
--
-- Deliberately NOT included in Phase 1:
--   * student records, academic history, documents, inventory, requests
--     (delivered in later phases together with their own RLS policies)
--   * any client-writable policy on profiles or settings
--   * any public storage bucket
--
-- Apply with the Supabase CLI (`supabase db push`) or paste this file into the
-- Supabase SQL editor. Then run supabase/seed.sql.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Extensions (prepared for Phase 6 smart search)
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.app_role as enum (
    'administrator',
    'registrar',
    'digitization_staff'
  );
exception
  when duplicate_object then null;
end
$$;

comment on type public.app_role is
  'TRACE staff roles. Authorization is evaluated from the profiles table, never from client claims.';

-- ---------------------------------------------------------------------------
-- Internal helper schema
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff profiles
--
-- A profile is created by an administrator (or the bootstrap SQL snippet in
-- the README) after the auth user exists. New accounts are inactive by
-- default; there is no self-registration and no client insert policy.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.app_role not null default 'digitization_staff',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_not_blank
    check (length(btrim(email)) between 3 and 320),
  constraint profiles_email_lowercase
    check (email = lower(email)),
  constraint profiles_full_name_not_blank
    check (length(btrim(full_name)) between 2 and 160)
);

comment on table public.profiles is
  'TRACE staff identity and role. Read-only to authenticated clients in Phase 1; provisioning is administrative.';

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email));
create index if not exists profiles_role_idx
  on public.profiles (role);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- System settings
-- ---------------------------------------------------------------------------
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint system_settings_key_format
    check (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$')
);

comment on table public.system_settings is
  'Non-secret application configuration. No client write policy exists in Phase 1.';

drop trigger if exists system_settings_set_updated_at on public.system_settings;
create trigger system_settings_set_updated_at
before update on public.system_settings
for each row
execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit log
--
-- Staff cannot insert, update, or delete audit rows directly. Inserts happen
-- through security-definer functions that derive the actor from auth.uid().
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_format
    check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint audit_logs_entity_type_format
    check (entity_type ~ '^[a-z][a-z0-9_]*$'),
  constraint audit_logs_entity_id_length
    check (entity_id is null or length(entity_id) <= 200),
  constraint audit_logs_summary_length
    check (summary is null or length(summary) <= 500),
  constraint audit_logs_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.audit_logs is
  'Append-only accountability log. Readable by active administrators only. No staff update or delete policy.';

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_action_idx
  on public.audit_logs (action, created_at desc);

-- ---------------------------------------------------------------------------
-- Role helper functions
--
-- SECURITY DEFINER avoids recursive RLS checks when profiles policies call
-- these helpers. The actor is always auth.uid(); callers cannot pass a role.
-- ---------------------------------------------------------------------------
create or replace function private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role = 'administrator'
  );
$$;

create or replace function private.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
  limit 1;
$$;

revoke all on function private.is_active_staff() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.current_profile_role() from public;
grant execute on function private.is_active_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.current_profile_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Controlled audit writer
--
-- Available for later module RPCs. Execute is intentionally NOT granted to
-- authenticated clients in Phase 1, so staff cannot fabricate audit events.
-- A later migration will grant narrowly scoped workflow functions instead.
-- ---------------------------------------------------------------------------
create or replace function public.record_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_summary text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = (select auth.uid())
    and is_active
  limit 1;

  if not found then
    raise exception 'An active staff profile is required'
      using errcode = '42501';
  end if;

  if p_action is null
     or p_action !~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$' then
    raise exception 'Invalid audit action format'
      using errcode = '22023';
  end if;

  if p_entity_type is null
     or p_entity_type !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'Invalid audit entity type format'
      using errcode = '22023';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Audit metadata must be a JSON object'
      using errcode = '22023';
  end if;

  if octet_length(p_metadata::text) > 4096 then
    raise exception 'Audit metadata is too large'
      using errcode = '22023';
  end if;

  insert into public.audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    summary,
    metadata
  )
  values (
    v_profile.id,
    v_profile.email,
    p_action,
    p_entity_type,
    left(p_entity_id, 200),
    left(p_summary, 500),
    p_metadata
  );
end;
$$;

comment on function public.record_audit_event(text, text, text, text, jsonb) is
  'Security-definer audit writer. Actor is derived from auth.uid(). Execute is reserved for trusted workflow functions.';

revoke all on function public.record_audit_event(text, text, text, text, jsonb)
  from public;
revoke all on function public.record_audit_event(text, text, text, text, jsonb)
  from anon;
revoke all on function public.record_audit_event(text, text, text, text, jsonb)
  from authenticated;

-- ---------------------------------------------------------------------------
-- Sign-in event
--
-- Called by the login page after a successful password authentication. The
-- action and entity type are fixed; the actor comes from the verified JWT.
-- Duplicate events within five minutes are ignored to limit log spam.
-- ---------------------------------------------------------------------------
create or replace function public.record_sign_in()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = (select auth.uid())
    and is_active
  limit 1;

  -- An authenticated user without an active profile is handled by the
  -- application. Do not reveal provisioning state through this endpoint.
  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.audit_logs a
    where a.actor_id = v_profile.id
      and a.action = 'auth.sign_in'
      and a.created_at > now() - interval '5 minutes'
  ) then
    return;
  end if;

  insert into public.audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    summary,
    metadata
  )
  values (
    v_profile.id,
    v_profile.email,
    'auth.sign_in',
    'session',
    v_profile.id::text,
    'Signed in to TRACE',
    jsonb_build_object('method', 'password')
  );
end;
$$;

revoke all on function public.record_sign_in() from public;
revoke all on function public.record_sign_in() from anon;
grant execute on function public.record_sign_in() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: a staff member may read their own row; administrators may read
-- all rows. There is no client insert/update/delete policy in Phase 1.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.is_admin()
);

-- Settings: readable by active staff. Writes are administrative/SQL only.
drop policy if exists "system_settings_select_active_staff"
  on public.system_settings;
create policy "system_settings_select_active_staff"
on public.system_settings
for select
to authenticated
using (private.is_active_staff());

-- Audit log: administrators only. No insert/update/delete policies.
drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (private.is_admin());

-- ---------------------------------------------------------------------------
-- Privileges
--
-- Explicitly remove the broad default grants Supabase gives to anon and
-- authenticated, then grant only what Phase 1 needs.
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

revoke all on table public.system_settings from anon;
revoke all on table public.system_settings from authenticated;
grant select on table public.system_settings to authenticated;

revoke all on table public.audit_logs from anon;
revoke all on table public.audit_logs from authenticated;
grant select on table public.audit_logs to authenticated;

revoke all on sequence public.audit_logs_id_seq from anon;
revoke all on sequence public.audit_logs_id_seq from authenticated;

-- Service role bypasses RLS by design and is used only in trusted server-side
-- operations. It is never shipped to the browser.

commit;
