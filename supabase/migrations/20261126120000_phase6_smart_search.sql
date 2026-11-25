-- ============================================================================
-- TRACE — Phase 6
-- Smart search
--
-- Adds a maintained search vector, trigram indexes, a ranked search RPC, and
-- duplicate detection for staff entering new historical records.
--
-- Apply AFTER the student, academic, and document migrations, because the
-- ranked result includes a live current-document count.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Search vector
-- ---------------------------------------------------------------------------
alter table public.students
  add column if not exists search_vector tsvector;

create or replace function private.update_student_search_vector()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.search_vector := to_tsvector(
    'simple',
    concat_ws(
      ' ',
      new.full_name,
      new.archive_id,
      new.last_name,
      new.first_name,
      new.middle_name,
      new.parent_guardian_name,
      new.intermediate_school,
      new.physical_locator_code,
      new.remarks
    )
  );
  return new;
end;
$$;

drop trigger if exists students_search_vector on public.students;
create trigger students_search_vector
before insert or update on public.students
for each row
execute function private.update_student_search_vector();

update public.students
set search_vector = to_tsvector(
  'simple',
  concat_ws(
    ' ',
    full_name,
    archive_id,
    last_name,
    first_name,
    middle_name,
    parent_guardian_name,
    intermediate_school,
    physical_locator_code,
    remarks
  )
);

create index if not exists students_search_vector_idx
  on public.students using gin (search_vector);
create index if not exists students_full_name_trgm_idx
  on public.students using gin (lower(full_name) extensions.gin_trgm_ops);
create index if not exists students_last_name_trgm_idx
  on public.students using gin (lower(last_name) extensions.gin_trgm_ops);
create index if not exists students_first_name_trgm_idx
  on public.students using gin (lower(first_name) extensions.gin_trgm_ops);
create index if not exists students_archive_id_trgm_idx
  on public.students using gin (lower(archive_id) extensions.gin_trgm_ops);
create index if not exists students_locator_trgm_idx
  on public.students using gin (lower(physical_locator_code) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Internal staff guard for security-definer functions
-- ---------------------------------------------------------------------------
create or replace function private.assert_active_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_active_staff() then
    raise exception 'An active staff profile is required'
      using errcode = '42501';
  end if;
end;
$$;

comment on function private.assert_active_staff() is
  'Fails with 42501 unless the session belongs to an active staff profile.';

revoke all on function private.assert_active_staff() from public;
revoke all on function private.assert_active_staff() from anon;
revoke all on function private.assert_active_staff() from authenticated;

-- ---------------------------------------------------------------------------
-- Ranked search
-- ---------------------------------------------------------------------------
create or replace function public.search_students(
  p_query text default '',
  p_school_year text default null,
  p_school text default null,
  p_year_level text default null,
  p_subject text default null,
  p_locator text default null,
  p_include_archived boolean default false,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  archive_id text,
  full_name text,
  last_name text,
  first_name text,
  date_of_birth date,
  verification_status public.record_verification_status,
  physical_locator_code text,
  is_archived boolean,
  document_count bigint,
  school_years text,
  rank real,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_active_staff();

  return query
  with filtered as (
    select
      s.id,
      s.archive_id,
      s.full_name,
      s.last_name,
      s.first_name,
      s.date_of_birth,
      s.verification_status,
      s.physical_locator_code,
      s.is_archived,
      (
        select count(*)
        from public.documents d
        where d.student_id = s.id
          and d.is_current
      ) as document_count,
      (
        select string_agg(distinct y.school_year, ', ' order by y.school_year)
        from public.student_school_years y
        where y.student_id = s.id
          and y.school_year is not null
      ) as school_years,
      case
        when p_query is null or btrim(p_query) = '' then 0::real
        when lower(s.archive_id) = lower(btrim(p_query)) then 1::real
        when s.full_name ilike btrim(p_query) || '%' then 0.9::real
        else greatest(
          extensions.similarity(lower(s.full_name), lower(btrim(p_query))),
          ts_rank(
            s.search_vector,
            websearch_to_tsquery('simple', btrim(p_query))
          )
        )::real
      end as rank
    from public.students s
    where (p_include_archived or not s.is_archived)
      and (
        p_query is null
        or btrim(p_query) = ''
        or s.search_vector @@ websearch_to_tsquery('simple', btrim(p_query))
        or s.full_name ilike '%' || btrim(p_query) || '%'
        or s.archive_id ilike '%' || btrim(p_query) || '%'
        or s.parent_guardian_name ilike '%' || btrim(p_query) || '%'
        or s.intermediate_school ilike '%' || btrim(p_query) || '%'
        or s.physical_locator_code ilike '%' || btrim(p_query) || '%'
        or extensions.similarity(lower(s.full_name), lower(btrim(p_query))) > 0.2
      )
      and (
        p_school_year is null
        or btrim(p_school_year) = ''
        or exists (
          select 1
          from public.student_school_years y
          where y.student_id = s.id
            and y.school_year ilike '%' || btrim(p_school_year) || '%'
        )
      )
      and (
        p_school is null
        or btrim(p_school) = ''
        or exists (
          select 1
          from public.student_school_years y
          where y.student_id = s.id
            and y.school_attended ilike '%' || btrim(p_school) || '%'
        )
      )
      and (
        p_year_level is null
        or btrim(p_year_level) = ''
        or exists (
          select 1
          from public.student_school_years y
          where y.student_id = s.id
            and y.year_level ilike '%' || btrim(p_year_level) || '%'
        )
      )
      and (
        p_subject is null
        or btrim(p_subject) = ''
        or exists (
          select 1
          from public.student_school_years y
          join public.student_subjects sub on sub.school_year_id = y.id
          where y.student_id = s.id
            and sub.subject_name ilike '%' || btrim(p_subject) || '%'
        )
      )
      and (
        p_locator is null
        or btrim(p_locator) = ''
        or s.physical_locator_code ilike '%' || btrim(p_locator) || '%'
      )
  )
  select
    f.id,
    f.archive_id,
    f.full_name,
    f.last_name,
    f.first_name,
    f.date_of_birth,
    f.verification_status,
    f.physical_locator_code,
    f.is_archived,
    f.document_count,
    f.school_years,
    f.rank,
    count(*) over() as total_count
  from filtered f
  order by f.rank desc, f.full_name asc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.search_students(
  text, text, text, text, text, text, boolean, integer, integer
) is
  'Ranked, access-checked archive search. Combines full-text, trigram similarity, and structured filters.';

revoke all on function public.search_students(
  text, text, text, text, text, text, boolean, integer, integer
) from public;
revoke all on function public.search_students(
  text, text, text, text, text, text, boolean, integer, integer
) from anon;
grant execute on function public.search_students(
  text, text, text, text, text, text, boolean, integer, integer
) to authenticated;

-- ---------------------------------------------------------------------------
-- Duplicate detection
-- ---------------------------------------------------------------------------
create or replace function public.find_student_duplicates(
  p_last_name text,
  p_first_name text,
  p_date_of_birth date default null,
  p_exclude_id uuid default null
)
returns table (
  id uuid,
  archive_id text,
  full_name text,
  date_of_birth date,
  is_archived boolean,
  similarity real
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_active_staff();

  return query
  with candidates as (
    select
      s.id,
      s.archive_id,
      s.full_name,
      s.date_of_birth,
      s.is_archived,
      greatest(
        extensions.similarity(lower(s.last_name), lower(btrim(p_last_name))),
        extensions.similarity(lower(s.first_name), lower(btrim(p_first_name)))
      )::real as match_score
    from public.students s
    where (p_exclude_id is null or s.id <> p_exclude_id)
      and (
        lower(s.last_name) = lower(btrim(p_last_name))
        or lower(s.first_name) = lower(btrim(p_first_name))
        or extensions.similarity(lower(s.last_name), lower(btrim(p_last_name))) > 0.35
        or extensions.similarity(lower(s.first_name), lower(btrim(p_first_name))) > 0.35
      )
      and (
        p_date_of_birth is null
        or s.date_of_birth is null
        or s.date_of_birth = p_date_of_birth
      )
  )
  select
    c.id,
    c.archive_id,
    c.full_name,
    c.date_of_birth,
    c.is_archived,
    c.match_score as similarity
  from candidates c
  order by
    case when c.date_of_birth = p_date_of_birth then 0 else 1 end,
    c.match_score desc,
    c.full_name asc
  limit 10;
end;
$$;

comment on function public.find_student_duplicates(text, text, date, uuid) is
  'Returns likely duplicate archive records for staff review. Never blocks a save by itself.';

revoke all on function public.find_student_duplicates(text, text, date, uuid)
  from public;
revoke all on function public.find_student_duplicates(text, text, date, uuid)
  from anon;
grant execute on function public.find_student_duplicates(text, text, date, uuid)
  to authenticated;

commit;
