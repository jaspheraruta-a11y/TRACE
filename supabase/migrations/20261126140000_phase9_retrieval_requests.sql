-- ============================================================================
-- TRACE — Phase 9
-- Retrieval requests
--
-- Tracks a request from intake through verification, retrieval, and release.
-- Status and verification changes are performed through security-definer RPCs
-- so the workflow, role restrictions, and audit/event history cannot be
-- bypassed by a direct table update.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.request_status as enum (
    'pending',
    'searching',
    'record_found',
    'verification_required',
    'ready_for_release',
    'released',
    'completed',
    'unavailable',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.request_verification_status as enum (
    'unverified',
    'verified',
    'rejected'
  );
exception
  when duplicate_object then null;
end
$$;

comment on type public.request_status is
  'Retrieval workflow state. Release and completion require a verified requester.';

comment on type public.request_verification_status is
  'Whether the requester relationship and authority have been checked.';

-- ---------------------------------------------------------------------------
-- Request code sequence
-- ---------------------------------------------------------------------------
create sequence if not exists public.retrieval_request_code_seq;

-- ---------------------------------------------------------------------------
-- Retrieval requests
-- ---------------------------------------------------------------------------
create table if not exists public.retrieval_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null,
  requester_name text not null,
  requester_type text not null,
  relationship text,
  contact_info text,
  purpose text,
  student_id uuid references public.students (id) on delete set null,
  status public.request_status not null default 'pending',
  verification_status public.request_verification_status not null
    default 'unverified',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  assigned_to uuid references public.profiles (id) on delete set null,
  request_date date not null default current_date,
  release_date date,
  release_details text,
  remarks text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retrieval_requests_code_format
    check (request_code ~ '^[A-Za-z0-9][A-Za-z0-9-]{2,39}$'),
  constraint retrieval_requests_requester_name_not_blank
    check (length(btrim(requester_name)) between 2 and 160),
  constraint retrieval_requests_requester_type_not_blank
    check (length(btrim(requester_type)) between 1 and 80),
  constraint retrieval_requests_relationship_length
    check (relationship is null or length(relationship) <= 160),
  constraint retrieval_requests_contact_length
    check (contact_info is null or length(contact_info) <= 500),
  constraint retrieval_requests_purpose_length
    check (purpose is null or length(purpose) <= 2000),
  constraint retrieval_requests_release_details_length
    check (release_details is null or length(release_details) <= 2000),
  constraint retrieval_requests_remarks_length
    check (remarks is null or length(remarks) <= 2000),
  constraint retrieval_requests_release_date_order
    check (release_date is null or release_date >= request_date)
);

comment on table public.retrieval_requests is
  'Retrieval workflow records. Requesters are not public users; every request is handled by authenticated staff.';

create unique index if not exists retrieval_requests_code_unique_idx
  on public.retrieval_requests (upper(request_code));
create index if not exists retrieval_requests_status_idx
  on public.retrieval_requests (status, created_at desc);
create index if not exists retrieval_requests_student_idx
  on public.retrieval_requests (student_id, created_at desc);
create index if not exists retrieval_requests_assigned_idx
  on public.retrieval_requests (assigned_to, status);
create index if not exists retrieval_requests_date_idx
  on public.retrieval_requests (request_date desc);

-- ---------------------------------------------------------------------------
-- Request event history
-- ---------------------------------------------------------------------------
create table if not exists public.request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null
    references public.retrieval_requests (id) on delete cascade,
  event_type text not null,
  from_status public.request_status,
  to_status public.request_status,
  note text,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint request_events_type_not_blank
    check (length(btrim(event_type)) between 1 and 80),
  constraint request_events_note_length
    check (note is null or length(note) <= 2000)
);

comment on table public.request_events is
  'Append-only per-request workflow history. Written by a trigger, never directly by clients.';

create index if not exists request_events_request_idx
  on public.request_events (request_id, created_at asc);

-- ---------------------------------------------------------------------------
-- Row preparation
-- ---------------------------------------------------------------------------
create or replace function private.prepare_request_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if new.request_code is null or btrim(new.request_code) = '' then
      new.request_code :=
        'REQ-' || to_char(now(), 'YYYY') || '-' ||
        lpad(nextval('public.retrieval_request_code_seq')::text, 5, '0');
    end if;
    new.created_by := coalesce(v_uid, new.created_by);
  end if;

  new.updated_by := coalesce(v_uid, new.updated_by);

  if new.status in ('released', 'completed') and new.release_date is null then
    new.release_date := current_date;
  end if;

  if new.verification_status in ('verified', 'rejected') then
    if tg_op = 'INSERT'
       or old.verification_status is distinct from new.verification_status then
      new.verified_by := coalesce(v_uid, new.verified_by);
      new.verified_at := coalesce(new.verified_at, now());
    end if;
  else
    new.verified_by := null;
    new.verified_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists retrieval_requests_prepare_row
  on public.retrieval_requests;
create trigger retrieval_requests_prepare_row
before insert or update on public.retrieval_requests
for each row
execute function private.prepare_request_row();

drop trigger if exists retrieval_requests_updated_at
  on public.retrieval_requests;
create trigger retrieval_requests_updated_at
before update on public.retrieval_requests
for each row
execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Event + audit trigger
-- ---------------------------------------------------------------------------
create or replace function private.audit_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_event text;
  v_note text;
  v_from public.request_status;
  v_to public.request_status;
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    perform public.record_audit_event(
      'request.delete',
      'retrieval_request',
      old.id::text,
      'Deleted a retrieval request',
      jsonb_build_object('status', old.status::text)
    );
    return old;
  end if;

  v_from := case when tg_op = 'INSERT' then null else old.status end;
  v_to := new.status;

  if tg_op = 'INSERT' then
    v_event := 'created';
    v_action := 'request.create';
    v_note := 'Created a retrieval request';
  elsif new.status is distinct from old.status then
    v_event := 'status_change';
    v_action := case
      when new.status in ('released', 'completed') then 'request.release'
      else 'request.status_change'
    end;
    v_note := format(
      'Status changed from %s to %s',
      old.status::text,
      new.status::text
    );
  elsif new.verification_status is distinct from old.verification_status then
    v_event := 'verification';
    v_action := 'request.verification';
    v_note := format(
      'Requester verification changed to %s',
      new.verification_status::text
    );
  elsif new.assigned_to is distinct from old.assigned_to then
    v_event := 'assignment';
    v_action := 'request.assign';
    v_note := 'Changed the assigned staff member';
  else
    v_event := 'updated';
    v_action := 'request.update';
    v_note := 'Updated retrieval request details';
  end if;

  insert into public.request_events (
    request_id,
    event_type,
    from_status,
    to_status,
    note,
    actor_id
  )
  values (
    new.id,
    v_event,
    v_from,
    v_to,
    v_note,
    (select auth.uid())
  );

  perform public.record_audit_event(
    v_action,
    'retrieval_request',
    new.id::text,
    v_note,
    jsonb_build_object(
      'status', new.status::text,
      'verification_status', new.verification_status::text
    )
  );

  return new;
end;
$$;

drop trigger if exists retrieval_requests_audit_change
  on public.retrieval_requests;
create trigger retrieval_requests_audit_change
after insert or update or delete on public.retrieval_requests
for each row
execute function private.audit_request_change();

-- ---------------------------------------------------------------------------
-- Create a request
-- ---------------------------------------------------------------------------
create or replace function public.create_retrieval_request(
  p_requester_name text,
  p_requester_type text,
  p_student_id uuid default null,
  p_relationship text default null,
  p_contact_info text default null,
  p_purpose text default null,
  p_assigned_to uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.assert_active_staff();

  if length(btrim(coalesce(p_requester_name, ''))) not between 2 and 160 then
    raise exception 'Requester name must be between 2 and 160 characters'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_requester_type, ''))) not between 1 and 80 then
    raise exception 'Select a requester type'
      using errcode = '22023';
  end if;

  if p_student_id is not null and not exists (
    select 1 from public.students where id = p_student_id
  ) then
    raise exception 'Student record not found'
      using errcode = '22023';
  end if;

  if p_assigned_to is not null and not exists (
    select 1 from public.profiles where id = p_assigned_to and is_active
  ) then
    raise exception 'Select an active staff member for assignment'
      using errcode = '22023';
  end if;

  insert into public.retrieval_requests (
    requester_name,
    requester_type,
    student_id,
    relationship,
    contact_info,
    purpose,
    assigned_to
  )
  values (
    btrim(p_requester_name),
    btrim(p_requester_type),
    p_student_id,
    nullif(btrim(coalesce(p_relationship, '')), ''),
    nullif(btrim(coalesce(p_contact_info, '')), ''),
    nullif(btrim(coalesce(p_purpose, '')), ''),
    p_assigned_to
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.create_retrieval_request(
  text, text, uuid, text, text, text, uuid
) is
  'Creates a pending retrieval request and writes its audit/event history.';

revoke all on function public.create_retrieval_request(
  text, text, uuid, text, text, text, uuid
) from public;
revoke all on function public.create_retrieval_request(
  text, text, uuid, text, text, text, uuid
) from anon;
grant execute on function public.create_retrieval_request(
  text, text, uuid, text, text, text, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- Edit request details
-- ---------------------------------------------------------------------------
create or replace function public.update_retrieval_request(
  p_request_id uuid,
  p_requester_name text,
  p_requester_type text,
  p_student_id uuid default null,
  p_relationship text default null,
  p_contact_info text default null,
  p_purpose text default null,
  p_assigned_to uuid default null,
  p_remarks text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_active_staff();

  if not exists (
    select 1 from public.retrieval_requests where id = p_request_id
  ) then
    raise exception 'Retrieval request not found'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_requester_name, ''))) not between 2 and 160 then
    raise exception 'Requester name must be between 2 and 160 characters'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_requester_type, ''))) not between 1 and 80 then
    raise exception 'Select a requester type'
      using errcode = '22023';
  end if;

  if p_student_id is not null and not exists (
    select 1 from public.students where id = p_student_id
  ) then
    raise exception 'Student record not found'
      using errcode = '22023';
  end if;

  if p_assigned_to is not null and not exists (
    select 1 from public.profiles where id = p_assigned_to and is_active
  ) then
    raise exception 'Select an active staff member for assignment'
      using errcode = '22023';
  end if;

  update public.retrieval_requests
  set requester_name = btrim(p_requester_name),
      requester_type = btrim(p_requester_type),
      student_id = p_student_id,
      relationship = nullif(btrim(coalesce(p_relationship, '')), ''),
      contact_info = nullif(btrim(coalesce(p_contact_info, '')), ''),
      purpose = nullif(btrim(coalesce(p_purpose, '')), ''),
      assigned_to = p_assigned_to,
      remarks = nullif(btrim(coalesce(p_remarks, '')), '')
  where id = p_request_id;
end;
$$;

revoke all on function public.update_retrieval_request(
  uuid, text, text, uuid, text, text, text, uuid, text
) from public;
revoke all on function public.update_retrieval_request(
  uuid, text, text, uuid, text, text, text, uuid, text
) from anon;
grant execute on function public.update_retrieval_request(
  uuid, text, text, uuid, text, text, text, uuid, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Workflow status
-- ---------------------------------------------------------------------------
create or replace function public.set_request_status(
  p_request_id uuid,
  p_status public.request_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.retrieval_requests%rowtype;
begin
  perform private.assert_active_staff();

  select *
  into v_request
  from public.retrieval_requests
  where id = p_request_id;

  if not found then
    raise exception 'Retrieval request not found'
      using errcode = '22023';
  end if;

  if p_status is null then
    raise exception 'Select the next request status'
      using errcode = '22023';
  end if;

  if p_status = v_request.status then
    raise exception 'The request already has this status'
      using errcode = '22023';
  end if;

  if p_status in ('released', 'completed') then
    if coalesce(private.current_profile_role()::text, '')
       not in ('administrator', 'registrar') then
      raise exception 'Registrar or administrator access is required to release a record'
        using errcode = '42501';
    end if;

    if v_request.verification_status <> 'verified' then
      raise exception 'Verify the requester before releasing a record'
        using errcode = '22023';
    end if;
  end if;

  update public.retrieval_requests
  set status = p_status,
      release_date = case
        when p_status in ('released', 'completed')
          then coalesce(release_date, current_date)
        else release_date
      end,
      release_details = case
        when p_status in ('released', 'completed')
          then coalesce(nullif(btrim(coalesce(p_note, '')), ''), release_details)
        else release_details
      end
  where id = p_request_id;
end;
$$;

comment on function public.set_request_status(
  uuid, public.request_status, text
) is
  'Advances the retrieval workflow. Release and completion require a verified requester and a registrar or administrator.';

revoke all on function public.set_request_status(
  uuid, public.request_status, text
) from public;
revoke all on function public.set_request_status(
  uuid, public.request_status, text
) from anon;
grant execute on function public.set_request_status(
  uuid, public.request_status, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Requester verification
-- ---------------------------------------------------------------------------
create or replace function public.set_request_verification(
  p_request_id uuid,
  p_status public.request_verification_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.retrieval_requests%rowtype;
begin
  perform private.assert_active_staff();

  if coalesce(private.current_profile_role()::text, '')
     not in ('administrator', 'registrar') then
    raise exception 'Registrar or administrator access is required to verify a requester'
      using errcode = '42501';
  end if;

  select *
  into v_request
  from public.retrieval_requests
  where id = p_request_id;

  if not found then
    raise exception 'Retrieval request not found'
      using errcode = '22023';
  end if;

  if p_status is null then
    raise exception 'Select a verification result'
      using errcode = '22023';
  end if;

  if p_status = v_request.verification_status then
    raise exception 'The request already has this verification status'
      using errcode = '22023';
  end if;

  update public.retrieval_requests
  set verification_status = p_status,
      remarks = coalesce(
        nullif(btrim(coalesce(p_note, '')), ''),
        remarks
      )
  where id = p_request_id;
end;
$$;

revoke all on function public.set_request_verification(
  uuid, public.request_verification_status, text
) from public;
revoke all on function public.set_request_verification(
  uuid, public.request_verification_status, text
) from anon;
grant execute on function public.set_request_verification(
  uuid, public.request_verification_status, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Active staff directory for assignment controls
--
-- Non-administrators cannot read every profiles row, so this narrow function
-- exposes only the name and role needed by an assignment dropdown.
-- ---------------------------------------------------------------------------
create or replace function public.list_active_staff()
returns table (
  id uuid,
  full_name text,
  role public.app_role
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_active_staff();

  return query
  select p.id, p.full_name, p.role
  from public.profiles p
  where p.is_active
  order by p.full_name asc;
end;
$$;

revoke all on function public.list_active_staff() from public;
revoke all on function public.list_active_staff() from anon;
grant execute on function public.list_active_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.retrieval_requests enable row level security;
alter table public.request_events enable row level security;

drop policy if exists "retrieval_requests_select_active_staff"
  on public.retrieval_requests;
create policy "retrieval_requests_select_active_staff"
on public.retrieval_requests
for select
to authenticated
using (private.is_active_staff());

drop policy if exists "request_events_select_active_staff"
  on public.request_events;
create policy "request_events_select_active_staff"
on public.request_events
for select
to authenticated
using (private.is_active_staff());

revoke all on table public.retrieval_requests from anon;
revoke all on table public.retrieval_requests from authenticated;
grant select on table public.retrieval_requests to authenticated;

revoke all on table public.request_events from anon;
revoke all on table public.request_events from authenticated;
grant select on table public.request_events to authenticated;

revoke all on sequence public.retrieval_request_code_seq from anon;
revoke all on sequence public.retrieval_request_code_seq from authenticated;

-- ---------------------------------------------------------------------------
-- Schema version marker
-- ---------------------------------------------------------------------------
insert into public.system_settings (key, value, description, updated_at)
values (
  'schema_version',
  '{"version":"0.1.0","phase":9}'::jsonb,
  'TRACE schema version and latest applied phase',
  now()
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
