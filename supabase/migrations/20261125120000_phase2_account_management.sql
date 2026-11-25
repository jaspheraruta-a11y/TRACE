-- ============================================================================
-- TRACE — Transcript and Record Archival and Cataloguing Engine
-- Phase 2 account management migration
--
-- Adds narrowly scoped, administrator-only RPCs for staff provisioning and
-- role management. All authorization is evaluated on the server from the
-- profiles table; the browser never supplies a trusted role.
--
-- Operations:
--   * public.create_staff_account(...)  -> creates auth user + inactive profile
--   * public.set_staff_active(...)      -> activate / suspend an account
--   * public.set_staff_role(...)        -> change an assigned role
--
-- Every operation writes an audit event through the Phase 1 audit writer.
-- No client INSERT/UPDATE/DELETE grant or policy is added to any table.
--
-- Apply AFTER 20261124090000_phase1_foundation.sql and supabase/seed.sql.
-- Safe to re-run.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Precondition check
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('auth.users') is null
     or to_regclass('auth.identities') is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.audit_logs') is null
     or to_regtype('public.app_role') is null then
    raise exception
      'Apply the Phase 1 foundation migration before this migration'
      using errcode = '55000';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Internal authorization guard
-- ---------------------------------------------------------------------------
create or replace function private.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Administrator access required'
      using errcode = '42501';
  end if;
end;
$$;

comment on function private.assert_admin() is
  'Fails with 42501 unless the session belongs to an active administrator.';

revoke all on function private.assert_admin() from public;
revoke all on function private.assert_admin() from anon;
revoke all on function private.assert_admin() from authenticated;

-- ---------------------------------------------------------------------------
-- Internal Supabase Auth normalization helpers
--
-- GoTrue password sign-in resolves users with:
--   instance_id = '00000000-0000-0000-0000-000000000000'
--   aud = 'authenticated'
--   is_sso_user = false
-- It also scans several token columns into non-null Go strings, so NULL values
-- must be normalized to ''. Finally, a password user needs an email identity
-- in auth.identities. These helpers make both provisioning and repair produce
-- the same structure Supabase creates through its own Auth API.
--
-- Column discovery keeps the helpers compatible with the schema changes
-- Supabase has made to auth.users and auth.identities over time.
-- ---------------------------------------------------------------------------
create or replace function private.normalize_staff_auth_user(
  p_user_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_column text;
  v_columns text[] := array[
    'instance_id',
    'aud',
    'role',
    'email',
    'email_confirmed_at',
    'is_sso_user',
    'confirmation_token',
    'email_change',
    'email_change_token_new',
    'recovery_token',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token',
    'raw_app_meta_data',
    'updated_at'
  ];
  v_assignments text[];
begin
  if p_user_id is null or v_email = '' then
    raise exception 'A user id and email are required to repair sign-in'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
  ) then
    raise exception 'Staff account not found'
      using errcode = '22023';
  end if;

  foreach v_column in array v_columns loop
    if exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'auth'
        and c.table_name = 'users'
        and c.column_name = v_column
    ) then
      v_assignments := array_append(v_assignments, case v_column
        when 'instance_id' then
          format('%I = %L::uuid', v_column, '00000000-0000-0000-0000-000000000000')
        when 'aud' then format('%I = $2', v_column)
        when 'role' then format('%I = $2', v_column)
        when 'email' then format('%I = coalesce(%I, $4)', v_column, v_column)
        when 'email_confirmed_at' then
          format('%I = coalesce(%I, now())', v_column, v_column)
        when 'is_sso_user' then format('%I = false', v_column)
        when 'confirmation_token' then format('%I = coalesce(%I, $3::text)', v_column, v_column)
        when 'email_change' then format('%I = coalesce(%I, $3::text)', v_column, v_column)
        when 'email_change_token_new' then format('%I = coalesce(%I, $3::text)', v_column, v_column)
        when 'recovery_token' then format('%I = coalesce(%I, $3::text)', v_column, v_column)
        when 'email_change_token_current' then format('%I = coalesce(%I, $3::text)', v_column, v_column)
        when 'phone_change' then format('%I = coalesce(%I, $3::text)', v_column, v_column)
        when 'phone_change_token' then format('%I = coalesce(%I, $3::text)', v_column, v_column)
        when 'reauthentication_token' then format('%I = coalesce(%I, $3::text)', v_column, v_column)
        when 'raw_app_meta_data' then
          format('%I = coalesce(%I, $5::jsonb) || $6::jsonb', v_column, v_column)
        when 'updated_at' then format('%I = now()', v_column)
      end);
    end if;
  end loop;

  execute format(
    'update auth.users set %s where id = $1',
    array_to_string(v_assignments, ', ')
  )
  using
    p_user_id,
    'authenticated',
    '',
    v_email,
    '{}'::jsonb,
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email')
    );
end;
$$;

comment on function private.normalize_staff_auth_user(uuid, text) is
  'Internal helper that gives a staff auth user the instance, role, token, and metadata values GoTrue expects.';

revoke all on function private.normalize_staff_auth_user(uuid, text) from public;
revoke all on function private.normalize_staff_auth_user(uuid, text) from anon;
revoke all on function private.normalize_staff_auth_user(uuid, text) from authenticated;

create or replace function private.ensure_staff_email_identity(
  p_user_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_identity_data jsonb;
  v_column text;
  v_columns text[] := array[
    'id',
    'user_id',
    'identity_data',
    'provider',
    'provider_id',
    'email',
    'last_sign_in_at',
    'created_at',
    'updated_at'
  ];
  v_is_generated boolean;
  v_data_type text;
  v_update_assignments text[];
  v_insert_columns text[];
  v_insert_values text[];
begin
  if p_user_id is null or v_email = '' then
    raise exception 'A user id and email are required to create an email identity'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
  ) then
    raise exception 'Staff account not found'
      using errcode = '22023';
  end if;

  v_identity_data := jsonb_build_object(
    'sub', p_user_id::text,
    'email', v_email,
    'email_verified', true,
    'provider_id', p_user_id::text
  );

  foreach v_column in array v_columns loop
    v_is_generated := false;

    select
      c.is_generated = 'ALWAYS' or c.is_identity = 'YES',
      c.data_type
    into v_is_generated, v_data_type
    from information_schema.columns c
    where c.table_schema = 'auth'
      and c.table_name = 'identities'
      and c.column_name = v_column;

    if found
       and not coalesce(v_is_generated, false)
       and v_column in ('identity_data', 'provider_id', 'email', 'updated_at') then
      v_update_assignments := array_append(v_update_assignments, case v_column
        when 'identity_data' then format('%I = %I || $2::jsonb', v_column, v_column)
        when 'provider_id' then format('%I = $4', v_column)
        when 'email' then format('%I = $5', v_column)
        when 'updated_at' then format('%I = now()', v_column)
      end);
    end if;
  end loop;

  if exists (
    select 1
    from auth.identities i
    where i.user_id = p_user_id
      and i.provider = 'email'
  ) then
    execute format(
      'update auth.identities set %s where user_id = $1 and provider = $3',
      array_to_string(v_update_assignments, ', ')
    )
    using p_user_id, v_identity_data, 'email', p_user_id::text, v_email;

    return;
  end if;

  foreach v_column in array v_columns loop
    v_is_generated := false;

    select
      c.is_generated = 'ALWAYS' or c.is_identity = 'YES',
      c.data_type
    into v_is_generated, v_data_type
    from information_schema.columns c
    where c.table_schema = 'auth'
      and c.table_name = 'identities'
      and c.column_name = v_column;

    if not found or coalesce(v_is_generated, false) then
      continue;
    end if;

    v_insert_columns := array_append(v_insert_columns, format('%I', v_column));
    v_insert_values := array_append(v_insert_values, case v_column
      when 'id' then
        case when v_data_type = 'uuid' then 'gen_random_uuid()' else '$4' end
      when 'user_id' then '$1::uuid'
      when 'identity_data' then '$2::jsonb'
      when 'provider' then '$3'
      when 'provider_id' then '$4'
      when 'email' then '$5'
      when 'last_sign_in_at' then 'null'
      when 'created_at' then 'now()'
      when 'updated_at' then 'now()'
    end);
  end loop;

  execute format(
    'insert into auth.identities (%s) values (%s)',
    array_to_string(v_insert_columns, ', '),
    array_to_string(v_insert_values, ', ')
  )
  using p_user_id, v_identity_data, 'email', p_user_id::text, v_email;
end;
$$;

comment on function private.ensure_staff_email_identity(uuid, text) is
  'Internal helper that creates or refreshes the email identity GoTrue uses for password sign-in.';

revoke all on function private.ensure_staff_email_identity(uuid, text) from public;
revoke all on function private.ensure_staff_email_identity(uuid, text) from anon;
revoke all on function private.ensure_staff_email_identity(uuid, text) from authenticated;

-- ---------------------------------------------------------------------------
-- Create a staff account
--
-- The auth user is created with a temporary password and a confirmed email so
-- no public sign-up or confirmation round-trip is required. The profile is
-- deliberately inactive: an administrator must explicitly activate it.
-- ---------------------------------------------------------------------------
drop function if exists
  public.create_staff_account(text, text, public.app_role, text);

create function public.create_staff_account(
  p_email text,
  p_full_name text,
  p_role public.app_role,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_crypto_schema text;
  v_password_hash text;
begin
  perform private.assert_admin();

  v_email := lower(btrim(coalesce(p_email, '')));
  v_full_name := btrim(coalesce(p_full_name, ''));

  if length(v_email) not between 3 and 320
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid staff email address'
      using errcode = '22023';
  end if;

  if length(v_full_name) not between 2 and 160 then
    raise exception 'Full name must be between 2 and 160 characters'
      using errcode = '22023';
  end if;

  if p_role is null then
    raise exception 'Select a role for the staff account'
      using errcode = '22023';
  end if;

  if length(coalesce(p_password, '')) not between 8 and 128 then
    raise exception 'Temporary password must be between 8 and 128 characters'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.profiles p
    where lower(p.email) = v_email
  ) or exists (
    select 1
    from auth.users u
    where lower(coalesce(u.email, '')) = v_email
  ) then
    raise exception 'An account with this email address already exists'
      using errcode = '23505';
  end if;

  -- pgcrypto ships in the "extensions" schema on Supabase, but locate it
  -- dynamically so the migration also works when it lives elsewhere.
  select n.nspname
  into v_crypto_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if v_crypto_schema is null then
    raise exception 'The pgcrypto extension is required to create staff accounts'
      using errcode = '55000';
  end if;

  execute format(
    'select %I.crypt($1, %I.gen_salt($2, $3))',
    v_crypto_schema,
    v_crypto_schema
  )
  into v_password_hash
  using p_password, 'bf', 10;

  v_user_id := gen_random_uuid();

  -- instance_id and the token columns are completed by the normalization
  -- helper immediately below. GoTrue only reads a committed user row.
  insert into auth.users (
    instance_id,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_user_id,
    v_email,
    v_password_hash,
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email')
    ),
    jsonb_build_object('full_name', v_full_name),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  perform private.normalize_staff_auth_user(v_user_id, v_email);
  perform private.ensure_staff_email_identity(v_user_id, v_email);

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    is_active
  )
  values (
    v_user_id,
    v_email,
    v_full_name,
    p_role,
    false
  );

  perform public.record_audit_event(
    'staff.create',
    'staff',
    v_user_id::text,
    'Created a staff account',
    jsonb_build_object('role', p_role::text, 'is_active', false)
  );

  return v_user_id;
end;
$$;

comment on function public.create_staff_account(text, text, public.app_role, text) is
  'Administrator-only staff provisioning. Creates an inactive profile and writes an audit event.';

revoke all on function public.create_staff_account(text, text, public.app_role, text)
  from public;
revoke all on function public.create_staff_account(text, text, public.app_role, text)
  from anon;
grant execute on function public.create_staff_account(text, text, public.app_role, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Activate / suspend a staff account
-- ---------------------------------------------------------------------------
drop function if exists public.set_staff_active(uuid, boolean);

create function public.set_staff_active(
  p_user_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles%rowtype;
  v_action text;
  v_admin_count integer;
begin
  perform private.assert_admin();

  if p_user_id = (select auth.uid()) then
    raise exception 'You cannot change the status of your own account'
      using errcode = '42501';
  end if;

  if p_is_active is null then
    raise exception 'Specify whether the account should be active'
      using errcode = '22023';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Staff account not found'
      using errcode = '22023';
  end if;

  if v_target.is_active = p_is_active then
    raise exception 'The account is already %',
      case when p_is_active then 'active' else 'inactive' end
      using errcode = '22023';
  end if;

  if not p_is_active and v_target.role = 'administrator' then
    select count(*)::integer
    into v_admin_count
    from public.profiles
    where role = 'administrator' and is_active;

    if v_admin_count <= 1 then
      raise exception
        'At least one active administrator must remain'
        using errcode = '22023';
    end if;
  end if;

  update public.profiles
  set is_active = p_is_active
  where id = p_user_id;

  v_action := case when p_is_active then 'staff.activate' else 'staff.deactivate' end;

  perform public.record_audit_event(
    v_action,
    'staff',
    p_user_id::text,
    case when p_is_active
      then 'Activated a staff account'
      else 'Suspended a staff account'
    end,
    jsonb_build_object('is_active', p_is_active)
  );
end;
$$;

comment on function public.set_staff_active(uuid, boolean) is
  'Administrator-only account activation/suspension with self-change and last-admin protections.';

revoke all on function public.set_staff_active(uuid, boolean) from public;
revoke all on function public.set_staff_active(uuid, boolean) from anon;
grant execute on function public.set_staff_active(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Change a staff role
-- ---------------------------------------------------------------------------
drop function if exists public.set_staff_role(uuid, public.app_role);

create function public.set_staff_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles%rowtype;
  v_admin_count integer;
begin
  perform private.assert_admin();

  if p_user_id = (select auth.uid()) then
    raise exception 'You cannot change the role of your own account'
      using errcode = '42501';
  end if;

  if p_role is null then
    raise exception 'Select a role for the staff account'
      using errcode = '22023';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Staff account not found'
      using errcode = '22023';
  end if;

  if v_target.role = p_role then
    raise exception 'The staff account already has this role'
      using errcode = '22023';
  end if;

  -- Do not allow the final active administrator to be downgraded.
  if v_target.role = 'administrator'
     and v_target.is_active
     and p_role <> 'administrator' then
    select count(*)::integer
    into v_admin_count
    from public.profiles
    where role = 'administrator' and is_active;

    if v_admin_count <= 1 then
      raise exception
        'At least one active administrator must remain'
        using errcode = '22023';
    end if;
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id;

  perform public.record_audit_event(
    'staff.role_change',
    'staff',
    p_user_id::text,
    'Changed a staff role',
    jsonb_build_object(
      'from_role', v_target.role::text,
      'to_role', p_role::text
    )
  );
end;
$$;

comment on function public.set_staff_role(uuid, public.app_role) is
  'Administrator-only role assignment with self-change and last-admin protections.';

revoke all on function public.set_staff_role(uuid, public.app_role) from public;
revoke all on function public.set_staff_role(uuid, public.app_role) from anon;
grant execute on function public.set_staff_role(uuid, public.app_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Repair broken Supabase Auth metadata
--
-- TRACE roles belong only in public.profiles.role. Password sign-in also
-- depends on standard Supabase Auth structure: the nil instance ID,
-- authenticated audience/role, non-null token columns, and an email identity.
-- This administrator-only function restores all of them without touching the
-- TRACE role or active status.
-- ---------------------------------------------------------------------------
drop function if exists public.repair_staff_auth_role(uuid);

create function public.repair_staff_auth_role(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  perform private.assert_admin();

  if p_user_id is null then
    raise exception 'Select a staff account to repair'
      using errcode = '22023';
  end if;

  select lower(coalesce(u.email, p.email))
  into v_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if not found then
    raise exception 'Staff account not found'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  ) then
    raise exception 'No TRACE profile is linked to this account'
      using errcode = '22023';
  end if;

  if coalesce(v_email, '') = '' then
    raise exception 'The staff account has no email address to repair'
      using errcode = '22023';
  end if;

  perform private.normalize_staff_auth_user(p_user_id, v_email);
  perform private.ensure_staff_email_identity(p_user_id, v_email);

  perform public.record_audit_event(
    'staff.auth_role_repair',
    'staff',
    p_user_id::text,
    'Restored standard Supabase sign-in metadata',
    jsonb_build_object('email', v_email)
  );
end;
$$;

comment on function public.repair_staff_auth_role(uuid) is
  'Administrator-only repair for Supabase Auth instance, aud/role, token columns, and email identity. The TRACE profile role is untouched.';

revoke all on function public.repair_staff_auth_role(uuid) from public;
revoke all on function public.repair_staff_auth_role(uuid) from anon;
grant execute on function public.repair_staff_auth_role(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles policy hardening
--
-- Re-assert the Phase 1 read policy and explicitly remove any write policy
-- that might have been added outside the migration history.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_delete_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.is_admin()
);

revoke insert on table public.profiles from anon;
revoke insert on table public.profiles from authenticated;
revoke update on table public.profiles from anon;
revoke update on table public.profiles from authenticated;
revoke delete on table public.profiles from anon;
revoke delete on table public.profiles from authenticated;

-- ---------------------------------------------------------------------------
-- Schema version marker
-- ---------------------------------------------------------------------------
insert into public.system_settings (key, value, description, updated_at)
values (
  'schema_version',
  '{"version":"0.1.0","phase":2}'::jsonb,
  'TRACE schema version and latest applied phase',
  now()
)
on conflict (key) do nothing;

-- Re-applying this migration to fix older databases must not downgrade a
-- project that has already completed later phases.
update public.system_settings
set value = '{"version":"0.1.0","phase":2}'::jsonb,
    description = 'TRACE schema version and latest applied phase',
    updated_at = now()
where key = 'schema_version'
  and coalesce((value ->> 'phase')::integer, 0) < 2;

commit;
