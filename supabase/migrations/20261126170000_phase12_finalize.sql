-- ============================================================================
-- TRACE — Phase 12
-- Finalization
--
-- Verifies that every module table and workflow function exists, then records
-- the final schema version. This migration changes no data and grants no new
-- access.
-- ============================================================================

begin;

do $$
declare
  v_missing text[] := array[]::text[];
  v_relation text;
  v_function text;
begin
  foreach v_relation in array array[
    'public.profiles',
    'public.audit_logs',
    'public.system_settings',
    'public.students',
    'public.student_school_years',
    'public.student_subjects',
    'public.documents',
    'public.archive_locations',
    'public.retrieval_requests',
    'public.request_events'
  ]
  loop
    if to_regclass(v_relation) is null then
      v_missing := array_append(v_missing, v_relation);
    end if;
  end loop;

  foreach v_function in array array[
    'public.search_students(text,text,text,text,text,text,boolean,integer,integer)',
    'public.find_student_duplicates(text,text,date,uuid)',
    'public.log_document_access(uuid)',
    'public.assign_student_location(uuid,uuid)',
    'public.location_summary()',
    'public.create_retrieval_request(text,text,uuid,text,text,text,uuid)',
    'public.update_retrieval_request(uuid,text,text,uuid,text,text,text,uuid,text)',
    'public.set_request_status(uuid,public.request_status,text)',
    'public.set_request_verification(uuid,public.request_verification_status,text)',
    'public.list_active_staff()',
    'public.archive_report()',
    'public.export_students(boolean,integer)',
    'public.export_requests(integer)',
    'public.report_gaps(integer)'
  ]
  loop
    if to_regprocedure(v_function) is null then
      v_missing := array_append(v_missing, v_function);
    end if;
  end loop;

  if array_length(v_missing, 1) > 0 then
    raise exception 'TRACE finalization found missing objects: %',
      array_to_string(v_missing, ', ')
      using errcode = '55000';
  end if;
end
$$;

insert into public.system_settings (key, value, description, updated_at)
values (
  'schema_version',
  '{"version":"1.0.0","phase":12}'::jsonb,
  'TRACE schema version and latest applied phase',
  now()
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

comment on schema public is
  'TRACE archival schema. Access is restricted to active staff profiles; public sign-up and public student search are not supported.';

commit;
