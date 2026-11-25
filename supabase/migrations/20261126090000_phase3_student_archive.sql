-- ============================================================================
-- TRACE — Phase 3 / 4
-- Student archive masterlist and historical personal information
--
-- Adds the central archival student table, automatic archive IDs, full-name
-- maintenance, archive/restore metadata, audit triggers, and RLS.
--
-- Historical values are intentionally optional. Nothing is invented when a
-- field is missing.
-- ============================================================================

begin;

do $$
begin
  create type public.record_verification_status as enum (
    'unverified',
    'needs_review',
    'verified'
  );
exception
  when duplicate_object then null;
end
$$;

create sequence if not exists public.student_archive_id_seq;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  archive_id text not null,
  last_name text not null,
  first_name text not null,
  middle_name text,
  extension_name text,
  full_name text not null,
  date_of_birth date,
  birth_province text,
  birth_town text,
  birth_barangay text,
  parent_guardian_name text,
  parent_guardian_occupation text,
  parent_guardian_address text,
  intermediate_school text,
  intermediate_year_completed integer,
  intermediate_general_average numeric(5, 2),
  elementary_years integer,
  remarks text,
  verification_status public.record_verification_status not null
    default 'unverified',
  physical_locator_code text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.profiles (id) on delete set null,
  encoded_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_archive_id_format
    check (archive_id ~ '^[A-Za-z0-9][A-Za-z0-9-]{2,39}$'),
  constraint students_last_name_not_blank
    check (length(btrim(last_name)) between 1 and 120),
  constraint students_first_name_not_blank
    check (length(btrim(first_name)) between 1 and 120),
  constraint students_full_name_not_blank
    check (length(btrim(full_name)) between 2 and 320),
  constraint students_birth_not_future
    check (date_of_birth is null or date_of_birth <= current_date),
  constraint students_intermediate_year_range
    check (
      intermediate_year_completed is null
      or intermediate_year_completed between 1900 and 2100
    ),
  constraint students_intermediate_average_range
    check (
      intermediate_general_average is null
      or intermediate_general_average between 0 and 100
    ),
  constraint students_elementary_years_range
    check (elementary_years is null or elementary_years between 0 and 20),
  constraint students_locator_code_length
    check (
      physical_locator_code is null
      or length(btrim(physical_locator_code)) between 1 and 80
    )
);

comment on table public.students is
  'Central archival masterlist. Optional historical fields stay nullable; missing data is never fabricated.';

create unique index if not exists students_archive_id_unique_idx
  on public.students (upper(archive_id));
create index if not exists students_last_name_idx
  on public.students (lower(last_name));
create index if not exists students_first_name_idx
  on public.students (lower(first_name));
create index if not exists students_full_name_idx
  on public.students (lower(full_name));
create index if not exists students_birth_date_idx
  on public.students (date_of_birth);
create index if not exists students_archived_idx
  on public.students (is_archived, created_at desc);
create index if not exists students_locator_idx
  on public.students (lower(physical_locator_code));

-- ---------------------------------------------------------------------------
-- Row preparation
-- ---------------------------------------------------------------------------
create or replace function private.prepare_student_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if new.archive_id is null or btrim(new.archive_id) = '' then
      new.archive_id :=
        'TRC-' || to_char(now(), 'YYYY') || '-' ||
        lpad(nextval('public.student_archive_id_seq')::text, 5, '0');
    end if;
    new.encoded_by := coalesce(v_uid, new.encoded_by);
  end if;

  new.full_name := btrim(
    concat_ws(
      ' ',
      new.first_name,
      nullif(btrim(coalesce(new.middle_name, '')), ''),
      new.last_name,
      nullif(btrim(coalesce(new.extension_name, '')), '')
    )
  );

  new.updated_by := coalesce(v_uid, new.updated_by);

  if tg_op = 'UPDATE' then
    if new.is_archived and not old.is_archived then
      new.archived_at := now();
      new.archived_by := coalesce(v_uid, new.archived_by);
    elsif not new.is_archived and old.is_archived then
      new.archived_at := null;
      new.archived_by := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists students_prepare_row on public.students;
create trigger students_prepare_row
before insert or update on public.students
for each row
execute function private.prepare_student_row();

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row
execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit trigger
-- ---------------------------------------------------------------------------
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
  if (select auth.uid()) is null then
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

drop trigger if exists students_audit_change on public.students;
create trigger students_audit_change
after insert or update on public.students
for each row
execute function private.audit_student_change();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.students enable row level security;

drop policy if exists "students_select_active_staff" on public.students;
create policy "students_select_active_staff"
on public.students
for select
to authenticated
using (private.is_active_staff());

drop policy if exists "students_insert_active_staff" on public.students;
create policy "students_insert_active_staff"
on public.students
for insert
to authenticated
with check (private.is_active_staff());

drop policy if exists "students_update_active_staff" on public.students;
create policy "students_update_active_staff"
on public.students
for update
to authenticated
using (private.is_active_staff())
with check (private.is_active_staff());

-- No delete policy: archival records are archived/restored, not destroyed.

revoke all on table public.students from anon;
revoke all on table public.students from authenticated;
grant select, insert, update on table public.students to authenticated;

revoke all on sequence public.student_archive_id_seq from anon;
revoke all on sequence public.student_archive_id_seq from authenticated;

commit;
