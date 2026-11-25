# TRACE

**Transcript and Record Archival and Cataloguing Engine**

An internal archival and retrieval system for the Junior High School Registrar's
Office. TRACE digitizes, organizes, searches, preserves, and retrieves
historical student records — including incomplete records from the 1980s and
1990s — while keeping the path back to every physical original.

> TRACE is **not** a general school management system, a public alumni portal,
> or a public student database. It is an authenticated, role-controlled tool
> for authorized Registrar personnel.

---

## Status — v1.0.0 / Phase 12 code complete

All twelve phases are implemented in the application and in SQL migrations.
`npm run build` passes and `npm run lint` reports advisory warnings only.

**Deployment is not yet live-verified.** No Supabase credentials, `.env.local`,
or Supabase CLI access were available in this workspace, so the migrations have
not been applied to a live project and the RLS/Storage/RPC checks in section 7
still need to be run before real student data is stored.

| Phase | Delivered capability | Code status |
| --- | --- | --- |
| 1 | Foundation, application shell, auth boundary, audit writer | Complete |
| 2 | Staff provisioning and role management | Complete |
| 3 / 4 | Student archive and historical personal information | Complete |
| 5 | High school record / prospectus | Complete |
| 6 | Smart Search | Complete |
| 7 | Document digitization and private storage | Complete |
| 8 | Physical locator and inventory | Complete |
| 9 | Retrieval requests | Complete |
| 10 | Reports and CSV exports | Complete |
| 11 | Audit hardening | Complete |
| 12 | Finalization and schema version `1.0.0` | Complete |

“Complete” here means the code and migration are written and pass local static
checks. It does **not** mean a live Supabase project has been verified.

### What is functional now

- Supabase email/password authentication, session restore, sign-out, protected
  routes, and an access-blocked screen for unprovisioned or inactive accounts.
- Role-aware navigation for Administrator, Registrar, and Digitization Staff;
  PostgreSQL RLS remains the authorization authority.
- Administrator-only staff creation, activation, suspension, and role changes
  through server-side RPCs with self-change and last-administrator guards.
- Student masterlist with filtered/paginated browsing, duplicate detection,
  CSV import, archive/restore, and a full record view.
- High school year entries with free-text year levels, subjects, C.S. averages,
  action-taken values, credits, attendance, and remarks.
- Ranked Smart Search using full-text search and trigram similarity across
  names, archive IDs, guardians, schools, subjects, and locators.
- Private document uploads (PDF/JPEG/PNG, 25 MB), verification/rejection,
  short-lived signed URLs, and an audit event on every document access.
- Structured storage locations with unique locator codes, student assignment,
  digitization status, printable labels, and QR codes.
- Retrieval request intake, assignment, requester verification, workflow RPCs,
  release guard, and append-only event history.
- Live reports, coverage/gap reporting, and role-scoped CSV exports.
- Append-only audit trail with administrator-only reads and triggers covering
  students, academic history, documents, locations, and requests.
- Responsive shell with collapsible sidebar, mobile drawer, account menu, and
  keyboard command palette (`Ctrl/Cmd + K`).

### Deliberately not included

- Public sign-up, public alumni portal, or public student search.
- Mock records, placeholder buttons, or fabricated dashboard/report figures.
- Any browser code containing the Supabase service-role key.
- Direct client writes to `retrieval_requests`, `request_events`, or
  `audit_logs`; all workflow and audit writes go through controlled functions.
- Permanent deletion of student records. Records are archived and restored.

---

## Technology

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Routing | React Router v7 data router |
| Backend | Supabase — PostgreSQL, Auth, Storage, RLS, RPCs |
| Forms & validation | React Hook Form + Zod |
| Icons / toasts | Lucide React / Sonner |
| Data helpers | date-fns; TanStack Table is installed but current tables render directly |
| Labels | `qrcode.react` for printable locator labels |
| Audit metadata | Typed JSON with human-readable action labels |

Supabase is the only persistence layer. `localStorage` is used only for the
SDK session and the sidebar collapse preference — never as a database.

---

## Architecture

```text
src/
  components/
    archive/        StudentPicker, DocumentTable, StatusBadges, dialogs
    auth/           Access-blocked screen
    layout/         App shell, sidebar, top bar, command palette
    ui/             Buttons, cards, dialogs, forms, feedback primitives
  context/          AuthProvider (session + profile + role)
  hooks/            useDocumentTitle, useAsyncData
  lib/
    archive/        Supabase query/RPC wrappers, CSV helpers, labels
    supabase/       Client and hand-written Database types
    audit.ts        Human-readable audit action labels
    modules.ts      Module catalogue
    navigation.ts   Role-aware navigation configuration
    roles.ts        Role labels, descriptions, and scopes
    utils.ts        Formatting and class helpers
  pages/
    account/        Staff profile and session details
    admin/          Staff directory, audit trail, system settings
    auth/           Login
    dashboard/      Live archive dashboard
    documents/      Private document register and upload
    errors/         403, 404, route error boundary
    inventory/      Locator register, assignment, labels
    reports/        Live aggregates, gaps, CSV exports
    requests/       Request register and detail workflow
    search/         Ranked Smart Search
    students/       Masterlist, form, import, full record view
  routes/           ProtectedRoute, RequireRole, router
supabase/
  migrations/       Twelve phase migrations, applied in filename order
  fixes/            One-time repair scripts for live projects
  seed.sql          Non-secret system settings only
```

**Security boundaries**

- UI role checks hide navigation; PostgreSQL RLS is the authority.
- `AuthContext` resolves the session and active staff profile from Supabase.
- Privileged database functions are `SECURITY DEFINER` with pinned
  `search_path = ''` and explicit active-staff/admin guards.
- Audit rows are written by triggers or controlled functions, never by client
  `INSERT`/`UPDATE`/`DELETE`.
- Storage objects live in a private bucket and are opened only through
  short-lived signed URLs issued to authorized staff.
- No service-role or secret key is referenced anywhere in the frontend.

---

## Prerequisites

- Node.js 22+ and npm 10+
- A Supabase project
- Supabase CLI only if you prefer CLI migration application
- An administrator email ready for bootstrap

---

## 1. Configure the environment

```bash
cp .env.example .env.local        # macOS / Linux / Git Bash
Copy-Item .env.example .env.local # Windows PowerShell
```

Set the two public values from **Supabase → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
```

Rules:

- Only the anon/publishable key belongs in a Vite app.
- Never put the service-role key in a `VITE_*` variable.
- Never commit `.env.local`.
- Restart the dev server after changing environment variables.

The login page reports missing configuration instead of attempting a fake
session.

---

## 2. Apply the database migrations

Apply files in **filename/timestamp order**. The Phase 6 search migration is
named after Phase 7 because it depends on the student, academic, and document
tables, so follow the filenames rather than the phase numbers.

| Order | File | Purpose |
| --- | --- | --- |
| 1 | `20261124090000_phase1_foundation.sql` | Profiles, settings, audit writer, helpers, RLS |
| 2 | `seed.sql` | Non-secret defaults; safe to re-run |
| 3 | `20261125120000_phase2_account_management.sql` | Staff RPCs and profile hardening |
| 4 | `20261126090000_phase3_student_archive.sql` | Students, archive IDs, Phases 3/4 fields |
| 5 | `20261126100000_phase5_academic_history.sql` | School years and subjects |
| 6 | `20261126110000_phase7_documents.sql` | Document metadata and private bucket |
| 7 | `20261126120000_phase6_smart_search.sql` | Search vector, indexes, ranked RPC |
| 8 | `20261126130000_phase8_inventory_locator.sql` | Locations, assignment, locator summary |
| 9 | `20261126140000_phase9_retrieval_requests.sql` | Requests, events, workflow RPCs |
| 10 | `20261126150000_phase10_reports.sql` | Aggregates and export RPCs |
| 11 | `20261126160000_phase11_audit_hardening.sql` | Entity index and read-only audit posture |
| 12 | `20261126170000_phase12_finalize.sql` | Object verification and final version marker |

`seed.sql` inserts `schema_version` with `ON CONFLICT DO NOTHING`, so re-running
it cannot roll a fully migrated database back. Phase 2 is also safe to re-run:
it replaces the staff-provisioning RPCs without downgrading a later
`schema_version`. Phase 12 finishes with `{"version":"1.0.0","phase":12}` and
fails if any required table or function is missing.

### Supabase SQL editor

1. Run each file above in order in **SQL Editor**.
2. Confirm `schema_version` under **Table Editor → system_settings** reads
   `{"version":"1.0.0","phase":12}`.
3. Confirm the `student-documents` bucket exists and is private.

### Supabase CLI

```bash
npx supabase init                       # first time only
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

For a local stack (requires Docker):

```bash
npx supabase start
npx supabase db reset   # applies migrations and supabase/seed.sql
```

`db push` applies migrations to the linked project but does not run the seed
file there; run `seed.sql` once in the SQL editor if you use the CLI for a
remote project. The SQL files are written to be safe to re-run.

---

## 3. Bootstrap the first administrator

There is no public sign-up and no client-side role assignment.

1. In **Supabase → Authentication → Users**, create a user with a real email
   and strong password. Confirm the email if confirmation is enabled.
2. Run this in the SQL editor, replacing the email and name:

```sql
insert into public.profiles (id, email, full_name, role, is_active)
select
  u.id,
  lower(u.email),
  'Registrar Administrator',
  'administrator',
  true
from auth.users u
where lower(u.email) = lower('admin@school.edu.ph')
on conflict (id) do update
set role = 'administrator',
    is_active = true,
    email = excluded.email;
```

3. Sign in to TRACE with that account.
4. In **Supabase → Authentication → Providers → Email**, disable **Allow new
   users to sign up**. Public sign-up must remain off.

### Ongoing staff management

Use **Administration → Staff Accounts**:

1. Choose **Add staff** and enter name, email, role, and a temporary password.
2. Share the temporary password securely and confirm the staff member's identity.
3. Choose **Activate** to grant access.
4. Use **Role** to reassign `administrator`, `registrar`, or
   `digitization_staff`; use **Suspend** to revoke access without deleting data.

New accounts are created inactive with the least-privilege role. Administrators
cannot change their own role or status, and TRACE refuses to suspend or
downgrade its last active administrator. Every change is audited.

### If a non-administrator cannot sign in

TRACE roles are stored **only** in `public.profiles.role`. Never set
`auth.users.role` or `auth.users.aud` to `administrator`, `registrar`, or
`digitization_staff`. Supabase Auth requires both values to stay
`authenticated`.

Password sign-in also depends on standard Supabase Auth structure that an
account created directly in **Supabase → Authentication → Users** receives
automatically:

- `auth.users.instance_id = '00000000-0000-0000-0000-000000000000'`
- `auth.users.aud = 'authenticated'` and `auth.users.role = 'authenticated'`
- `auth.users.is_sso_user = false`
- token columns such as `confirmation_token` are `''`, not `NULL`
- an `auth.identities` row with `provider = 'email'`

Earlier TRACE provisioning wrote the password hash but omitted the nil
`instance_id` and email identity, so GoTrue returned
`Invalid login credentials` even though the bcrypt hash was valid.

Check the affected account in **SQL Editor**:

```sql
select
  u.email,
  u.instance_id = '00000000-0000-0000-0000-000000000000'::uuid as instance_ok,
  u.aud,
  u.role as auth_role,
  u.email_confirmed_at is not null as email_confirmed,
  (
    u.confirmation_token is null
    or u.email_change is null
    or u.email_change_token_new is null
    or u.recovery_token is null
  ) as null_tokens,
  count(i.id) filter (where i.provider = 'email') as email_identities,
  p.role as trace_role,
  p.is_active
from auth.users u
left join public.profiles p on p.id = u.id
left join auth.identities i on i.user_id = u.id
where lower(u.email) = lower('registrar@school.edu.ph')
group by u.id, p.id;
```

Expected result: `instance_ok = true`, `aud = authenticated`,
`auth_role = authenticated`, `email_confirmed = true`, `null_tokens = false`,
`email_identities >= 1`, `trace_role = registrar` (or `digitization_staff`),
and `is_active = true`.

Apply the fix in this order:

1. Re-run the corrected `20261125120000_phase2_account_management.sql` in
   **SQL Editor**. This replaces `public.create_staff_account` so every new
   staff account receives the required Auth structure. It is safe to re-run
   and will not downgrade `schema_version` from Phase 12.
2. Run `supabase/fixes/20261126180000_repair_staff_auth_roles.sql`. It repairs
   every existing TRACE-linked account and installs the administrator-only RPC
   used by **Fix login** in **Staff Accounts**. It is safe to re-run.
3. To repair just one affected account from SQL Editor after step 1 or 2:

   ```sql
   do $$
   declare
     v_id uuid;
     v_email text := lower('registrar@school.edu.ph');
   begin
     select id into v_id
     from auth.users
     where lower(email) = v_email;

     if v_id is null then
       raise exception 'No auth user found for %', v_email;
     end if;

     perform private.normalize_staff_auth_user(v_id, v_email);
     perform private.ensure_staff_email_identity(v_id, v_email);
   end
   $$;
   ```

4. Confirm the account is active in **Staff Accounts** and activate it there
   if needed. Then retry sign-in.

Use **Add staff** for new accounts rather than creating them manually in
Supabase Authentication, so the profile is linked and starts inactive as
required.

---

## 4. Run the application

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

```bash
npm run build     # typecheck + production build
npm run typecheck # typecheck only
npm run lint      # oxlint
npm run preview   # preview production assets
```

Static hosts must rewrite unknown paths to `index.html` because TRACE uses the
HTML5 history API (`/students`, `/admin/audit`, etc.).

---

## 5. Modules

| Area | Route | What it does |
| --- | --- | --- |
| Dashboard | `/dashboard` | Live counts, coverage, attention gaps, quick actions, role scope, recent admin activity |
| Student Archive | `/students`, `/students/:id` | Masterlist, optional historical fields, duplicate detection, CSV import, archive/restore, academic history, documents, locator |
| Smart Search | `/search` | Ranked fuzzy/full-text search with school year, school, year level, subject, and locator filters |
| Digital Documents | `/documents` | Private register, upload, verify/reject, short-lived signed access |
| Inventory | `/inventory` | Locator register, student assignment, digitization status, printable QR labels |
| Retrieval Requests | `/requests` | Intake, assignment, verification, workflow, release guard, event history |
| Reports | `/reports` | Live aggregates, coverage, gap report, CSV exports |
| Audit Trail | `/admin/audit` | Administrator-only, append-only activity log |
| Staff Accounts | `/admin/users` | Administrator-only account provisioning and roles |
| Settings | `/admin/settings` | Real environment/schema visibility and deployment checklist |

Historical year-level and action-taken values are free text. Missing details stay
blank; no value is invented to complete an old record.

---

## 6. Private document storage

- Bucket: `student-documents`, `public = false`.
- Limit: 25 MB; allowed MIME types: `application/pdf`, `image/jpeg`,
  `image/png`.
- Object paths begin with the owning student's UUID. Storage RLS checks the
  folder, active staff status, and student existence.
- The browser never receives a public object URL. Opening a document calls
  `public.log_document_access(uuid)`, which verifies access and writes a
  `document.view` audit event before issuing a short-lived signed URL.
- Verification and rejection are restricted to Registrar/Administrator staff by
  a database trigger. Deletion is restricted to Registrar/Administrator.
- QR codes identify locators only; scanning a label does not bypass Supabase
  authentication or RLS.

---

## 7. Security verification checklist — required before real data

The policies are authored in the migrations but have not been verified against
the live project. Run these checks after applying all migrations.

### Policy and grant inventory

```sql
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles', 'system_settings', 'audit_logs', 'students',
    'student_school_years', 'student_subjects', 'documents',
    'archive_locations', 'retrieval_requests', 'request_events'
  )
group by table_name, grantee
order by table_name, grantee;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'student-documents';

select policyname, cmd, roles
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'trace_documents_%'
order by policyname;
```

Expected posture:

- No `anon` grants on any archive table or storage object.
- `profiles`: own row or administrator; no client role/status writes.
- `system_settings`: active staff reads; writes are SQL/administrative.
- `audit_logs`: administrator SELECT only; no client writes.
- `students`: active staff SELECT/INSERT/UPDATE; no DELETE policy.
- `student_school_years`, `student_subjects`, `documents`,
  `archive_locations`: active staff reads/writes; location DELETE is
  administrator-only; document DELETE is Registrar/Administrator.
- `retrieval_requests` and `request_events`: active staff SELECT only. All
  writes go through `create_retrieval_request`, `update_retrieval_request`,
  `set_request_status`, and `set_request_verification`.
- `set_request_status` blocks `released`/`completed` unless the requester is
  verified and the actor is a Registrar or Administrator.
- `search_students`, `find_student_duplicates`, and the report/export RPCs
  require active staff status.
- `record_audit_event` is not directly executable by browsers.
- Privileged functions use `security definer` with `set search_path = ''`.
- The storage bucket is private with the four `trace_documents_*` policies and
  the student UUID path check.

### Manual checks with test accounts

1. Sign in as Digitization Staff. Confirm Staff Accounts, Audit Trail, and
   System Settings are hidden, and direct `/admin/users` and `/admin/audit`
   URLs show the 403 page.
2. Query `audit_logs`, `students`, and `storage.objects` with the anon key.
   Confirm no rows are returned.
3. Try to update your own `profiles.role` or `profiles.is_active` from the
   browser console. Confirm the request is denied.
4. Try to insert or delete an `audit_logs` row. Confirm the request is denied.
5. Try to delete a student. Confirm no client DELETE path exists.
6. Try to delete an archive location as non-admin. Confirm the request is denied.
7. Try to update a document's verification status as non-Registrar/non-admin.
   Confirm the trigger denies it.
8. Open a document as active staff. Confirm a `document.view` audit entry is
   written and the signed URL expires quickly.
9. Try to construct a direct public storage URL for a document. Confirm access
   is denied.
10. Create a retrieval request and attempt to set it to `released` without
    verification. Confirm the RPC rejects it.
11. Verify as Registrar/Administrator, then release. Confirm both the request
    event and audit trail show the action.
12. Try calling `set_staff_active` or `set_staff_role` from a non-admin session.
    Confirm the RPC denies it.
13. Confirm an administrator cannot change their own role/status or suspend the
    last active administrator.
14. Set a test profile inactive, sign in, and confirm the access-blocked screen
    with no archival routes available.

If any check fails, stop and correct the database policy before encoding
records.

---

## 8. Data handling rules

- Treat every historical record as confidential personal information.
- Preserve incomplete historical data. Do not fill missing fields with guesses.
- Keep year-level and action-taken wording as written in the original record.
- Archive instead of deleting students; document deletion is narrowly allowed
  and audited.
- Do not put student names, grades, or document contents into audit metadata.
- Do not seed real records. `seed.sql` contains only non-secret settings.
- Keep the service-role key server-side only.
- Do not introduce public search, public document routes, or unverified QR
  access.

---

## 9. Known limitations

- **Live verification is outstanding.** Migrations are not applied and RLS,
  Storage, and RPC behavior are untested against a live Supabase project.
- **`.env.local` is not present** in this workspace; create it from
  `.env.example` before running the app.
- **Public sign-up still needs to be disabled** in the Supabase dashboard.
- **Password reset has no in-app flow.** Administrators create temporary
  passwords; resets use the Supabase dashboard or a future self-service flow.
- **The production bundle is one ~1.02 MB chunk (~284 kB gzipped).** Route-level
  code splitting is a future optimization.
- **`npm run lint` reports advisory warnings** for the fetch-on-mount pattern
  and hook dependencies; there are no lint errors.
- The gap table shows the first 500 rows for readability; CSV exports use the
  full RPC result.
- No offline mode is provided; the archive requires Supabase access.

---

## 10. Acceptance checklist

- [x] All twelve phase implementations and migrations are written.
- [x] React + TypeScript + Vite production build passes.
- [x] Lint passes with advisory warnings only.
- [x] No mock records, placeholder actions, or fabricated statistics.
- [x] Private document bucket, signed access, and access audit events authored.
- [x] Workflow status/verification writes restricted to RPCs.
- [x] Final schema marker is `{"version":"1.0.0","phase":12}`.
- [ ] Supabase migrations applied in the documented order.
- [ ] `.env.local` created with real public Supabase values.
- [ ] Public sign-up disabled.
- [ ] First administrator provisioned.
- [ ] Section 7 live security checks passed.

---

## 11. Deployment notes

1. Apply all migrations and the seed to the production Supabase project before
   deploying the frontend.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider.
3. Configure SPA rewrites to `index.html`.
4. Bootstrap the first administrator and disable public sign-up.
5. Run the complete security checklist with non-admin test accounts.
6. Confirm Supabase backups and document the restore procedure.
7. Only then begin encoding real student records and uploading scans.
