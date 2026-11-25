-- ============================================================================
-- TRACE — Phase 7
-- Document digitization and private storage
--
-- Creates document metadata, a private Supabase Storage bucket, storage
-- policies, verification rules, and access auditing. Documents are never
-- exposed through public URLs; the application requests short-lived signed
-- URLs only after an authenticated, authorized staff request.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Document verification status
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.document_verification_status as enum (
    'pending',
    'verified',
    'rejected'
  );
exception
  when duplicate_object then null;
end
$$;

comment on type public.document_verification_status is
  'Review state of a scanned document. Pending documents are visible but not treated as verified evidence.';

-- ---------------------------------------------------------------------------
-- Document metadata
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  verification_status public.document_verification_status not null
    default 'pending',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  is_current boolean not null default true,
  replaces_document_id uuid references public.documents (id) on delete set null,
  constraint documents_type_not_blank
    check (length(btrim(document_type)) between 1 and 80),
  constraint documents_file_name_not_blank
    check (length(btrim(file_name)) between 1 and 255),
  constraint documents_storage_path_not_blank
    check (length(btrim(storage_path)) between 1 and 500),
  constraint documents_file_size_range
    check (file_size is null or file_size between 0 and 52428800),
  constraint documents_mime_type_allowed
    check (
      mime_type is null
      or mime_type in ('application/pdf', 'image/jpeg', 'image/png')
    )
);

comment on table public.documents is
  'Private scanned-document metadata. Files live in the student-documents storage bucket; no public URL is ever issued.';

create unique index if not exists documents_storage_path_unique_idx
  on public.documents (storage_path);
create index if not exists documents_student_idx
  on public.documents (student_id, uploaded_at desc);
create index if not exists documents_verification_idx
  on public.documents (verification_status, uploaded_at desc);
create unique index if not exists documents_current_per_type_unique_idx
  on public.documents (student_id, lower(document_type))
  where is_current;

-- ---------------------------------------------------------------------------
-- Row preparation and integrity rules
-- ---------------------------------------------------------------------------
create or replace function private.prepare_document_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.uploaded_by := coalesce(v_uid, new.uploaded_by);
    new.uploaded_at := coalesce(new.uploaded_at, now());
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

drop trigger if exists documents_prepare_row on public.documents;
create trigger documents_prepare_row
before insert or update on public.documents
for each row
execute function private.prepare_document_row();

create or replace function private.protect_document_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.student_id is distinct from old.student_id
     or new.storage_path is distinct from old.storage_path
     or new.uploaded_by is distinct from old.uploaded_by
     or new.uploaded_at is distinct from old.uploaded_at then
    if not private.is_admin() then
      raise exception
        'Only an administrator may move a document to another student or storage path'
        using errcode = '42501';
    end if;
  end if;

  if new.verification_status is distinct from old.verification_status
     and private.current_profile_role() not in ('administrator', 'registrar') then
    raise exception 'Registrar or administrator access is required to verify documents'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists documents_protect_columns on public.documents;
create trigger documents_protect_columns
before update on public.documents
for each row
execute function private.protect_document_columns();

-- ---------------------------------------------------------------------------
-- Audit trigger
-- ---------------------------------------------------------------------------
create or replace function private.audit_document_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_summary text;
  v_row public.documents%rowtype;
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    perform public.record_audit_event(
      'document.delete',
      'document',
      old.id::text,
      'Deleted a document record',
      jsonb_build_object(
        'student_id', old.student_id,
        'document_type', old.document_type
      )
    );
    return old;
  end if;

  v_row := new;

  if tg_op = 'INSERT' then
    if v_row.replaces_document_id is not null then
      v_action := 'document.replace';
      v_summary := 'Uploaded a replacement document';
    else
      v_action := 'document.upload';
      v_summary := 'Uploaded a document';
    end if;
  elsif v_row.verification_status is distinct from old.verification_status then
    v_action := case
      when v_row.verification_status = 'verified' then 'document.verify'
      when v_row.verification_status = 'rejected' then 'document.reject'
      else 'document.reopen'
    end;
    v_summary := case
      when v_row.verification_status = 'verified' then 'Verified a document'
      when v_row.verification_status = 'rejected' then 'Rejected a document'
      else 'Returned a document to pending review'
    end;
  else
    v_action := 'document.update';
    v_summary := 'Updated document metadata';
  end if;

  perform public.record_audit_event(
    v_action,
    'document',
    v_row.id::text,
    v_summary,
    jsonb_build_object(
      'student_id', v_row.student_id,
      'document_type', v_row.document_type,
      'verification_status', v_row.verification_status::text
    )
  );

  return new;
end;
$$;

drop trigger if exists documents_audit_change on public.documents;
create trigger documents_audit_change
after insert or update or delete on public.documents
for each row
execute function private.audit_document_change();

-- ---------------------------------------------------------------------------
-- Controlled access log
-- ---------------------------------------------------------------------------
create or replace function public.log_document_access(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.documents%rowtype;
begin
  perform private.assert_active_staff();

  select *
  into v_document
  from public.documents
  where id = p_document_id;

  if not found then
    raise exception 'Document not found'
      using errcode = '22023';
  end if;

  perform public.record_audit_event(
    'document.view',
    'document',
    v_document.id::text,
    'Opened a private document',
    jsonb_build_object(
      'student_id', v_document.student_id,
      'document_type', v_document.document_type
    )
  );
end;
$$;

revoke all on function public.log_document_access(uuid) from public;
revoke all on function public.log_document_access(uuid) from anon;
grant execute on function public.log_document_access(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;

drop policy if exists "documents_select_active_staff" on public.documents;
create policy "documents_select_active_staff"
on public.documents
for select
to authenticated
using (private.is_active_staff());

drop policy if exists "documents_insert_active_staff" on public.documents;
create policy "documents_insert_active_staff"
on public.documents
for insert
to authenticated
with check (private.is_active_staff());

drop policy if exists "documents_update_active_staff" on public.documents;
create policy "documents_update_active_staff"
on public.documents
for update
to authenticated
using (private.is_active_staff())
with check (private.is_active_staff());

drop policy if exists "documents_delete_registrar_or_admin" on public.documents;
create policy "documents_delete_registrar_or_admin"
on public.documents
for delete
to authenticated
using (
  private.is_admin()
  or private.current_profile_role() = 'registrar'
);

revoke all on table public.documents from anon;
revoke all on table public.documents from authenticated;
grant select, insert, update, delete on table public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    values (
      'student-documents',
      'student-documents',
      false,
      26214400,
      array['application/pdf', 'image/jpeg', 'image/png']
    )
    on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;

do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "trace_documents_select" on storage.objects';
  execute $policy$
    create policy "trace_documents_select"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'student-documents'
      and private.is_active_staff()
    )
  $policy$;

  execute 'drop policy if exists "trace_documents_insert" on storage.objects';
  execute $policy$
    create policy "trace_documents_insert"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'student-documents'
      and private.is_active_staff()
      and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and exists (
        select 1
        from public.students s
        where s.id::text = (storage.foldername(name))[1]
      )
    )
  $policy$;

  execute 'drop policy if exists "trace_documents_update" on storage.objects';
  execute $policy$
    create policy "trace_documents_update"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'student-documents'
      and private.is_active_staff()
    )
    with check (
      bucket_id = 'student-documents'
      and private.is_active_staff()
    )
  $policy$;

  execute 'drop policy if exists "trace_documents_delete" on storage.objects';
  execute $policy$
    create policy "trace_documents_delete"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'student-documents'
      and (
        owner = (select auth.uid())
        or private.is_admin()
        or private.current_profile_role() = 'registrar'
      )
    )
  $policy$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Schema version marker
-- ---------------------------------------------------------------------------
insert into public.system_settings (key, value, description, updated_at)
values (
  'schema_version',
  '{"version":"0.1.0","phase":7}'::jsonb,
  'TRACE schema version and latest applied phase',
  now()
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
