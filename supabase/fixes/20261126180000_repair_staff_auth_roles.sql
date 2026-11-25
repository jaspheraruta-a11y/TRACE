-- ============================================================================
-- TRACE — repair Supabase authentication for existing projects
--
-- Use this after accounts created by TRACE cannot complete password sign-in,
-- or after auth.users.role/aud were changed to a TRACE role manually.
--
-- Password sign-in requires all of the following Supabase Auth structure:
--   auth.users.instance_id = '00000000-0000-0000-0000-000000000000'
--   auth.users.aud         = 'authenticated'
--   auth.users.role        = 'authenticated'
--   auth.users.is_sso_user = false
--   token columns such as confirmation_token are '' rather than NULL
--   auth.identities has a row with provider = 'email'
--
-- TRACE roles belong only in public.profiles.role. This script never changes
-- a TRACE profile role or active status.
--
-- Run this file once in Supabase SQL Editor after Phases 1-12. It is safe to
-- re-run. It also installs public.repair_staff_auth_role(uuid), used by the
-- Fix login button in Staff Accounts.
-- ============================================================================

begin;

-- Precondition check ---------------------------------------------------------
do $$
begin
  if to_regclass('auth.users') is null
     or to_regclass('auth.identities') is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.audit_logs') is null
     or to_regprocedure('private.assert_admin()') is null
     or to_regprocedure('public.record_audit_event(text,text,text,text,jsonb)') is null then
    raise exception
      'Apply the TRACE Phase 1 and Phase 2 migrations before this repair'
      using errcode = '55000';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Internal Supabase Auth normalization helpers
--
-- Column discovery keeps these helpers compatible with the schema changes
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

-- Administrator-only single-account repair -----------------------------------
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

-- One-time normalization of all existing TRACE accounts ----------------------
do $$
declare
  v_record record;
begin
  for v_record in
    select u.id, lower(coalesce(u.email, p.email)) as email
    from auth.users u
    join public.profiles p on p.id = u.id
    where coalesce(u.email, p.email) is not null
  loop
    perform private.normalize_staff_auth_user(v_record.id, v_record.email);
    perform private.ensure_staff_email_identity(v_record.id, v_record.email);
  end loop;
end
$$;

commit;

-- Verify after running -------------------------------------------------------
-- Expected for every staff account: instance_ok = true, aud = authenticated,
-- auth_role = authenticated, email_confirmed = true, null_tokens = false,
-- email_identities >= 1, and is_active = true for accounts that may sign in.
--
-- select
--   u.email,
--   u.instance_id = '00000000-0000-0000-0000-000000000000'::uuid as instance_ok,
--   u.aud,
--   u.role as auth_role,
--   u.email_confirmed_at is not null as email_confirmed,
--   (
--     u.confirmation_token is null
--     or u.email_change is null
--     or u.email_change_token_new is null
--     or u.recovery_token is null
--   ) as null_tokens,
--   count(i.id) filter (where i.provider = 'email') as email_identities,
--   p.role as trace_role,
--   p.is_active
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- left join auth.identities i on i.user_id = u.id
-- group by u.id, p.id
-- order by u.email;
