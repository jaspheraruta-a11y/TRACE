-- ============================================================================
-- TRACE — Phase 8
-- Physical archive locator and inventory
--
-- Models a single, structured storage location (room / cabinet / shelf / box /
-- folder) with a unique locator code. Students point at a location, and the
-- denormalized physical locator code on the student record is kept in sync.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Digitization status
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.digitization_status as enum (
    'not_started',
    'partial',
    'complete'
  );
exception
  when duplicate_object then null;
end
$$;

comment on type public.digitization_status is
  'Progress of digitization for a physical archive location.';

-- ---------------------------------------------------------------------------
-- Archive locations
-- ---------------------------------------------------------------------------
create table if not exists public.archive_locations (
  id uuid primary key default gen_random_uuid(),
  locator_code text not null,
  archive_category text not null,
  room text,
  cabinet text,
  shelf text,
  box_code text,
  folder_code text,
  digitization_status public.digitization_status not null
    default 'not_started',
  condition_notes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint archive_locations_locator_code_format
    check (locator_code ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{1,79}$'),
  constraint archive_locations_category_not_blank
    check (length(btrim(archive_category)) between 1 and 80),
  constraint archive_locations_room_length
    check (room is null or length(btrim(room)) between 1 and 80),
  constraint archive_locations_cabinet_length
    check (cabinet is null or length(btrim(cabinet)) between 1 and 80),
  constraint archive_locations_shelf_length
    check (shelf is null or length(btrim(shelf)) between 1 and 80),
  constraint archive_locations_box_length
    check (box_code is null or length(btrim(box_code)) between 1 and 80),
  constraint archive_locations_folder_length
    check (folder_code is null or length(btrim(folder_code)) between 1 and 80),
  constraint archive_locations_condition_length
    check (condition_notes is null or length(condition_notes) <= 2000)
);

comment on table public.archive_locations is
  'Physical storage locations for original records. Locator codes are unique and printable as QR labels.';

create unique index if not exists archive_locations_locator_unique_idx
  on public.archive_locations (lower(locator_code));
create index if not exists archive_locations_category_idx
  on public.archive_locations (archive_category, locator_code);
create index if not exists archive_locations_digitization_idx
  on public.archive_locations (digitization_status);

alter table public.students
  add column if not exists location_id uuid
  references public.archive_locations (id) on delete set null;

create index if not exists students_location_id_idx
  on public.students (location_id);

-- ---------------------------------------------------------------------------
-- Row preparation
-- ---------------------------------------------------------------------------
create or replace function private.prepare_archive_location_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(v_uid, new.created_by);
  end if;
  new.updated_by := coalesce(v_uid, new.updated_by);
  new.locator_code := upper(btrim(new.locator_code));
  return new;
end;
$$;

drop trigger if exists archive_locations_prepare_row
  on public.archive_locations;
create trigger archive_locations_prepare_row
before insert or update on public.archive_locations
for each row
execute function private.prepare_archive_location_row();

drop trigger if exists archive_locations_updated_at
  on public.archive_locations;
create trigger archive_locations_updated_at
before update on public.archive_locations
for each row
execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Keep the denormalized student locator code in sync
-- ---------------------------------------------------------------------------
create or replace function private.sync_students_on_location_code_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.locator_code is distinct from old.locator_code then
    perform set_config('trace.suppress_student_audit', 'on', true);
    update public.students
    set physical_locator_code = new.locator_code
    where location_id = new.id
      and physical_locator_code is distinct from new.locator_code;
    perform set_config('trace.suppress_student_audit', 'off', true);
  end if;
  return new;
end;
$$;

drop trigger if exists archive_locations_sync_students
  on public.archive_locations;
create trigger archive_locations_sync_students
after update of locator_code on public.archive_locations
for each row
execute function private.sync_students_on_location_code_change();

create or replace function private.clear_students_on_location_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('trace.suppress_student_audit', 'on', true);
  update public.students
  set location_id = null,
      physical_locator_code = null
  where location_id = old.id;
  perform set_config('trace.suppress_student_audit', 'off', true);
  return old;
end;
$$;

drop trigger if exists archive_locations_clear_students
  on public.archive_locations;
create trigger archive_locations_clear_students
before delete on public.archive_locations
for each row
execute function private.clear_students_on_location_delete();

-- Re-assert the student audit trigger with suppression support so a bulk
-- locator rename does not create one audit row per student.
create or replace function private.audit_student_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_summary text;
  v_row public.students%rowtype;
begin
  if (select auth.uid()) is null
     or coalesce(
       current_setting('trace.suppress_student_audit', true),
       'off'
     ) = 'on' then
    return new;
  end if;

  v_row := new;

  if tg_op = 'INSERT' then
    v_action := 'student.create';
    v_summary := 'Created a student archive record';
  elsif new.is_archived and not old.is_archived then
    v_action := 'student.archive';
    v_summary := 'Archived a student record';
  elsif not new.is_archived and old.is_archived then
    v_action := 'student.restore';
    v_summary := 'Restored a student record';
  else
    v_action := 'student.update';
    v_summary := 'Updated a student record';
  end if;

  perform public.record_audit_event(
    v_action,
    'student',
    v_row.id::text,
    v_summary,
    jsonb_build_object('archive_id', v_row.archive_id)
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit trigger
-- ---------------------------------------------------------------------------
create or replace function private.audit_location_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    perform public.record_audit_event(
      'location.delete',
      'archive_location',
      old.id::text,
      'Deleted a storage location',
      jsonb_build_object('locator_code', old.locator_code)
    );
    return old;
  end if;

  perform public.record_audit_event(
    case when tg_op = 'INSERT' then 'location.create' else 'location.update' end,
    'archive_location',
    new.id::text,
    case when tg_op = 'INSERT'
      then 'Created a storage location'
      else 'Updated a storage location'
    end,
    jsonb_build_object(
      'locator_code', new.locator_code,
      'digitization_status', new.digitization_status::text
    )
  );

  return new;
end;
$$;

drop trigger if exists archive_locations_audit_change
  on public.archive_locations;
create trigger archive_locations_audit_change
after insert or update or delete on public.archive_locations
for each row
execute function private.audit_location_change();

-- ---------------------------------------------------------------------------
-- Assign a student to a location
-- ---------------------------------------------------------------------------
create or replace function public.assign_student_location(
  p_student_id uuid,
  p_location_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locator text;
begin
  perform private.assert_active_staff();

  if p_student_id is null then
    raise exception 'Select a student record'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.students where id = p_student_id
  ) then
    raise exception 'Student record not found'
      using errcode = '22023';
  end if;

  if p_location_id is not null then
    select locator_code
    into v_locator
    from public.archive_locations
    where id = p_location_id;

    if not found then
      raise exception 'Storage location not found'
        using errcode = '22023';
    end if;
  end if;

  update public.students
  set location_id = p_location_id,
      physical_locator_code = v_locator
  where id = p_student_id;

  perform public.record_audit_event(
    'location.assign',
    'student',
    p_student_id::text,
    case when p_location_id is null
      then 'Removed a student physical locator'
      else 'Assigned a student physical locator'
    end,
    jsonb_build_object(
      'location_id', p_location_id,
      'locator_code', v_locator
    )
  );
end;
$$;

comment on function public.assign_student_location(uuid, uuid) is
  'Assigns or clears a student physical locator and writes an audit event.';

revoke all on function public.assign_student_location(uuid, uuid) from public;
revoke all on function public.assign_student_location(uuid, uuid) from anon;
grant execute on function public.assign_student_location(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Inventory summary
-- ---------------------------------------------------------------------------
create or replace function public.location_summary()
returns table (
  id uuid,
  locator_code text,
  archive_category text,
  room text,
  cabinet text,
  shelf text,
  box_code text,
  folder_code text,
  digitization_status public.digitization_status,
  condition_notes text,
  student_count bigint,
  document_count bigint,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_active_staff();

  return query
  select
    l.id,
    l.locator_code,
    l.archive_category,
    l.room,
    l.cabinet,
    l.shelf,
    l.box_code,
    l.folder_code,
    l.digitization_status,
    l.condition_notes,
    (
      select count(*)
      from public.students s
      where s.location_id = l.id
        and not s.is_archived
    ) as student_count,
    (
      select count(*)
      from public.documents d
      join public.students s on s.id = d.student_id
      where s.location_id = l.id
        and d.is_current
    ) as document_count,
    l.updated_at
  from public.archive_locations l
  order by l.locator_code asc;
end;
$$;

comment on function public.location_summary() is
  'Inventory rows with live student and current-document counts.';

revoke all on function public.location_summary() from public;
revoke all on function public.location_summary() from anon;
grant execute on function public.location_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.archive_locations enable row level security;

drop policy if exists "archive_locations_select_active_staff"
  on public.archive_locations;
create policy "archive_locations_select_active_staff"
on public.archive_locations
for select
to authenticated
using (private.is_active_staff());

drop policy if exists "archive_locations_insert_active_staff"
  on public.archive_locations;
create policy "archive_locations_insert_active_staff"
on public.archive_locations
for insert
to authenticated
with check (private.is_active_staff());

drop policy if exists "archive_locations_update_active_staff"
  on public.archive_locations;
create policy "archive_locations_update_active_staff"
on public.archive_locations
for update
to authenticated
using (private.is_active_staff())
with check (private.is_active_staff());

drop policy if exists "archive_locations_delete_admin"
  on public.archive_locations;
create policy "archive_locations_delete_admin"
on public.archive_locations
for delete
to authenticated
using (private.is_admin());

revoke all on table public.archive_locations from anon;
revoke all on table public.archive_locations from authenticated;
grant select, insert, update, delete on table public.archive_locations
  to authenticated;

-- ---------------------------------------------------------------------------
-- Schema version marker
-- ---------------------------------------------------------------------------
insert into public.system_settings (key, value, description, updated_at)
values (
  'schema_version',
  '{"version":"0.1.0","phase":8}'::jsonb,
  'TRACE schema version and latest applied phase',
  now()
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
