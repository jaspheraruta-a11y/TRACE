-- ============================================================================
-- TRACE — Phase 5
-- High school record / prospectus
--
-- Multiple school-year entries per student, each with its own subject list,
-- C.S. averages, action taken, credits, and attendance. Year-level labels are
-- free text so historical structures are preserved.
-- ============================================================================

begin;

create table if not exists public.student_school_years (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  year_level text not null,
  school_attended text,
  school_year text,
  curriculum_year text,
  total_days_school integer,
  total_days_present integer,
  remarks text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_school_years_year_level_not_blank
    check (length(btrim(year_level)) between 1 and 80),
  constraint student_school_years_days_school_range
    check (total_days_school is null or total_days_school between 0 and 400),
  constraint student_school_years_days_present_range
    check (total_days_present is null or total_days_present between 0 and 400)
);

comment on table public.student_school_years is
  'Historical high school year entries. Year-level labels are free text, not fixed to modern grade levels.';

create index if not exists student_school_years_student_idx
  on public.student_school_years (student_id, sort_order, created_at);

create table if not exists public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null
    references public.student_school_years (id) on delete cascade,
  subject_name text not null,
  cs_average numeric(5, 2),
  action_taken text,
  credits_earned numeric(5, 2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_subjects_name_not_blank
    check (length(btrim(subject_name)) between 1 and 160),
  constraint student_subjects_cs_average_range
    check (cs_average is null or cs_average between 0 and 100),
  constraint student_subjects_credits_range
    check (credits_earned is null or credits_earned between 0 and 100)
);

comment on table public.student_subjects is
  'Subjects belonging to exactly one historical school-year entry. Historical action-taken values are preserved as text.';

create index if not exists student_subjects_school_year_idx
  on public.student_subjects (school_year_id, sort_order, created_at);
create index if not exists student_subjects_name_idx
  on public.student_subjects (lower(subject_name));

-- ---------------------------------------------------------------------------
-- Row preparation
-- ---------------------------------------------------------------------------
create or replace function private.prepare_school_year_row()
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
  return new;
end;
$$;

drop trigger if exists student_school_years_prepare on public.student_school_years;
create trigger student_school_years_prepare
before insert or update on public.student_school_years
for each row
execute function private.prepare_school_year_row();

drop trigger if exists student_school_years_updated_at
  on public.student_school_years;
create trigger student_school_years_updated_at
before update on public.student_school_years
for each row
execute function private.set_updated_at();

drop trigger if exists student_subjects_updated_at on public.student_subjects;
create trigger student_subjects_updated_at
before update on public.student_subjects
for each row
execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit triggers
-- ---------------------------------------------------------------------------
create or replace function private.audit_school_year_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_row public.student_school_years%rowtype;
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    perform public.record_audit_event(
      'academic.delete',
      'student_school_year',
      old.id::text,
      'Removed a high school year entry',
      jsonb_build_object('student_id', old.student_id)
    );
    return old;
  end if;

  v_row := new;
  v_action := case
    when tg_op = 'INSERT' then 'academic.create'
    else 'academic.update'
  end;

  perform public.record_audit_event(
    v_action,
    'student_school_year',
    v_row.id::text,
    'Changed a high school year entry',
    jsonb_build_object('student_id', v_row.student_id)
  );

  return new;
end;
$$;

drop trigger if exists student_school_years_audit on public.student_school_years;
create trigger student_school_years_audit
after insert or update or delete on public.student_school_years
for each row
execute function private.audit_school_year_change();

create or replace function private.audit_subject_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_row public.student_subjects%rowtype;
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    perform public.record_audit_event(
      'subject.delete',
      'student_subject',
      old.id::text,
      'Removed a subject entry',
      jsonb_build_object('school_year_id', old.school_year_id)
    );
    return old;
  end if;

  v_row := new;
  v_action := case
    when tg_op = 'INSERT' then 'subject.create'
    else 'subject.update'
  end;

  perform public.record_audit_event(
    v_action,
    'student_subject',
    v_row.id::text,
    'Changed a subject entry',
    jsonb_build_object('school_year_id', v_row.school_year_id)
  );

  return new;
end;
$$;

drop trigger if exists student_subjects_audit on public.student_subjects;
create trigger student_subjects_audit
after insert or update or delete on public.student_subjects
for each row
execute function private.audit_subject_change();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.student_school_years enable row level security;
alter table public.student_subjects enable row level security;

drop policy if exists "school_years_select_active_staff"
  on public.student_school_years;
create policy "school_years_select_active_staff"
on public.student_school_years
for select
to authenticated
using (private.is_active_staff());

drop policy if exists "school_years_insert_active_staff"
  on public.student_school_years;
create policy "school_years_insert_active_staff"
on public.student_school_years
for insert
to authenticated
with check (private.is_active_staff());

drop policy if exists "school_years_update_active_staff"
  on public.student_school_years;
create policy "school_years_update_active_staff"
on public.student_school_years
for update
to authenticated
using (private.is_active_staff())
with check (private.is_active_staff());

drop policy if exists "school_years_delete_active_staff"
  on public.student_school_years;
create policy "school_years_delete_active_staff"
on public.student_school_years
for delete
to authenticated
using (private.is_active_staff());

drop policy if exists "subjects_select_active_staff"
  on public.student_subjects;
create policy "subjects_select_active_staff"
on public.student_subjects
for select
to authenticated
using (private.is_active_staff());

drop policy if exists "subjects_insert_active_staff"
  on public.student_subjects;
create policy "subjects_insert_active_staff"
on public.student_subjects
for insert
to authenticated
with check (private.is_active_staff());

drop policy if exists "subjects_update_active_staff"
  on public.student_subjects;
create policy "subjects_update_active_staff"
on public.student_subjects
for update
to authenticated
using (private.is_active_staff())
with check (private.is_active_staff());

drop policy if exists "subjects_delete_active_staff"
  on public.student_subjects;
create policy "subjects_delete_active_staff"
on public.student_subjects
for delete
to authenticated
using (private.is_active_staff());

revoke all on table public.student_school_years from anon;
revoke all on table public.student_school_years from authenticated;
grant select, insert, update, delete on table public.student_school_years
  to authenticated;

revoke all on table public.student_subjects from anon;
revoke all on table public.student_subjects from authenticated;
grant select, insert, update, delete on table public.student_subjects
  to authenticated;

commit;
