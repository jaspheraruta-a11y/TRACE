-- ============================================================================
-- TRACE — Phase 10
-- Reports and exports
--
-- All figures are derived from live archive tables. Nothing in this migration
-- invents a statistic, a student, or a document.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Aggregate report
-- ---------------------------------------------------------------------------
create or replace function public.archive_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total_students bigint;
  v_students_with_documents bigint;
  v_students_with_location bigint;
begin
  perform private.assert_active_staff();

  select count(*) into v_total_students
  from public.students;

  select count(distinct student_id) into v_students_with_documents
  from public.documents
  where is_current;

  select count(*) into v_students_with_location
  from public.students
  where location_id is not null
    and not is_archived;

  return jsonb_build_object(
    'generated_at', now(),
    'students', jsonb_build_object(
      'total', v_total_students,
      'active', (
        select count(*) from public.students where not is_archived
      ),
      'archived', (
        select count(*) from public.students where is_archived
      ),
      'verified', (
        select count(*) from public.students
        where verification_status = 'verified'
      ),
      'needs_review', (
        select count(*) from public.students
        where verification_status = 'needs_review'
      ),
      'unverified', (
        select count(*) from public.students
        where verification_status = 'unverified'
      )
    ),
    'documents', jsonb_build_object(
      'total', (select count(*) from public.documents),
      'current', (
        select count(*) from public.documents where is_current
      ),
      'verified', (
        select count(*) from public.documents
        where verification_status = 'verified'
      ),
      'pending', (
        select count(*) from public.documents
        where verification_status = 'pending'
      ),
      'rejected', (
        select count(*) from public.documents
        where verification_status = 'rejected'
      ),
      'students_with_current_document', v_students_with_documents,
      'storage_bytes', coalesce(
        (select sum(file_size) from public.documents),
        0
      )
    ),
    'locations', jsonb_build_object(
      'total', (select count(*) from public.archive_locations),
      'students_with_location', v_students_with_location,
      'students_without_location', greatest(
        v_total_students - v_students_with_location,
        0
      ),
      'digitization_not_started', (
        select count(*) from public.archive_locations
        where digitization_status = 'not_started'
      ),
      'digitization_partial', (
        select count(*) from public.archive_locations
        where digitization_status = 'partial'
      ),
      'digitization_complete', (
        select count(*) from public.archive_locations
        where digitization_status = 'complete'
      )
    ),
    'requests', jsonb_build_object(
      'total', (select count(*) from public.retrieval_requests),
      'open', (
        select count(*) from public.retrieval_requests
        where status in (
          'pending',
          'searching',
          'record_found',
          'verification_required',
          'ready_for_release'
        )
      ),
      'released_last_30_days', (
        select count(*) from public.retrieval_requests
        where status in ('released', 'completed')
          and release_date >= current_date - 30
      ),
      'by_status', coalesce(
        (
          select jsonb_object_agg(q.status, q.total)
          from (
            select status::text as status, count(*) as total
            from public.retrieval_requests
            group by status
          ) q
        ),
        '{}'::jsonb
      )
    ),
    'academic', jsonb_build_object(
      'school_year_entries', (
        select count(*) from public.student_school_years
      ),
      'subject_entries', (
        select count(*) from public.student_subjects
      ),
      'students_with_history', (
        select count(distinct student_id)
        from public.student_school_years
      )
    ),
    'coverage', jsonb_build_object(
      'document_coverage_percent', coalesce(
        round(
          100.0 * v_students_with_documents
          / nullif(v_total_students, 0),
          1
        ),
        0
      ),
      'locator_coverage_percent', coalesce(
        round(
          100.0 * v_students_with_location
          / nullif(v_total_students, 0),
          1
        ),
        0
      )
    )
  );
end;
$$;

comment on function public.archive_report() is
  'Live archive aggregates for the dashboard and reports. Returns zero counts for an empty archive.';

revoke all on function public.archive_report() from public;
revoke all on function public.archive_report() from anon;
grant execute on function public.archive_report() to authenticated;

-- ---------------------------------------------------------------------------
-- Student export
-- ---------------------------------------------------------------------------
create or replace function public.export_students(
  p_include_archived boolean default true,
  p_limit integer default 10000
)
returns table (
  archive_id text,
  full_name text,
  date_of_birth date,
  verification_status public.record_verification_status,
  physical_locator_code text,
  school_years text,
  document_count bigint,
  is_archived boolean
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
    s.archive_id,
    s.full_name,
    s.date_of_birth,
    s.verification_status,
    s.physical_locator_code,
    (
      select string_agg(distinct y.school_year, ', ' order by y.school_year)
      from public.student_school_years y
      where y.student_id = s.id
        and y.school_year is not null
    ) as school_years,
    (
      select count(*)
      from public.documents d
      where d.student_id = s.id
        and d.is_current
    ) as document_count,
    s.is_archived
  from public.students s
  where p_include_archived or not s.is_archived
  order by s.full_name asc
  limit greatest(1, least(coalesce(p_limit, 10000), 20000));
end;
$$;

revoke all on function public.export_students(boolean, integer) from public;
revoke all on function public.export_students(boolean, integer) from anon;
grant execute on function public.export_students(boolean, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Request export
-- ---------------------------------------------------------------------------
create or replace function public.export_requests(
  p_limit integer default 10000
)
returns table (
  request_code text,
  requester_name text,
  requester_type text,
  student_archive_id text,
  student_name text,
  status public.request_status,
  verification_status public.request_verification_status,
  request_date date,
  release_date date,
  assigned_to_name text
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
    r.request_code,
    r.requester_name,
    r.requester_type,
    s.archive_id as student_archive_id,
    s.full_name as student_name,
    r.status,
    r.verification_status,
    r.request_date,
    r.release_date,
    p.full_name as assigned_to_name
  from public.retrieval_requests r
  left join public.students s on s.id = r.student_id
  left join public.profiles p on p.id = r.assigned_to
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 10000), 20000));
end;
$$;

revoke all on function public.export_requests(integer) from public;
revoke all on function public.export_requests(integer) from anon;
grant execute on function public.export_requests(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Gap report
-- ---------------------------------------------------------------------------
create or replace function public.report_gaps(p_limit integer default 5000)
returns table (
  gap_type text,
  student_id uuid,
  archive_id text,
  full_name text,
  detail text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_active_staff();

  return query
  select * from (
    select
      'missing_locator'::text as gap_type,
      s.id as student_id,
      s.archive_id,
      s.full_name,
      'No physical storage location is assigned'::text as detail
    from public.students s
    where not s.is_archived
      and s.location_id is null

    union all

    select
      'missing_document'::text,
      s.id,
      s.archive_id,
      s.full_name,
      'No current scanned document is attached'::text
    from public.students s
    where not s.is_archived
      and not exists (
        select 1 from public.documents d
        where d.student_id = s.id
          and d.is_current
      )

    union all

    select
      'pending_document'::text,
      s.id,
      s.archive_id,
      s.full_name,
      'A current document is waiting for verification'::text
    from public.students s
    where not s.is_archived
      and exists (
        select 1 from public.documents d
        where d.student_id = s.id
          and d.is_current
          and d.verification_status = 'pending'
      )
  ) gaps
  order by gaps.gap_type, gaps.full_name
  limit greatest(1, least(coalesce(p_limit, 5000), 20000));
end;
$$;

revoke all on function public.report_gaps(integer) from public;
revoke all on function public.report_gaps(integer) from anon;
grant execute on function public.report_gaps(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Schema version marker
-- ---------------------------------------------------------------------------
insert into public.system_settings (key, value, description, updated_at)
values (
  'schema_version',
  '{"version":"0.1.0","phase":10}'::jsonb,
  'TRACE schema version and latest applied phase',
  now()
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
