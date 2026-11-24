# TRACE

**Transcript and Record Archival and Cataloguing Engine**

An internal archival and retrieval system for the Junior High School
Registrar's Office. TRACE is built to digitize, organize, search, preserve, and
retrieve historical student records — including incomplete records from the
1980s and 1990s — while keeping the path back to every physical original.

> TRACE is **not** a general school management system, a public alumni portal,
> or a public student database. It is an authenticated, role-controlled tool
> for authorized Registrar personnel.

---

## Current status — Phase 1 complete

Phase 1 establishes the secure foundation only. Later phases add the archive
modules in order.

| Phase | Module | Status |
| --- | --- | --- |
| 1 | Foundation, shell, auth boundary, initial migration | **Complete** |
| 2 | Full account provisioning and role management | Planned |
| 3 | Student Archive (Module B) | Planned |
| 4 | Historical personal information | Planned |
| 5 | High School Record / Prospectus | Planned |
| 6 | Smart Search (Module D) | Planned |
| 7 | Document Digitization (Module F) | Planned |
| 8 | Physical Archive Locator & Inventory (G / I) | Planned |
| 9 | Retrieval Requests (Module H) | Planned |
| 10 | Reports (Module L) | Planned |
| 11 | Audit expansion and security testing | Planned |
| 12 | Finalization and deployment documentation | Planned |

### What is functional in Phase 1

- Real Supabase Authentication with email and password.
- Session restoration and sign-out.
- Protected routes and an explicit blocked-access screen for unprovisioned or
  inactive accounts.
- Role-aware navigation for Administrator, Registrar, and Digitization Staff.
- Administrator-only staff directory and audit viewer backed by RLS.
- Real dashboard readiness checks (environment, profile, schema) — no
  fabricated statistics.
- Sign-in events written to the audit log by a security-definer function.
- Private, unauthenticated access refused at the route boundary.
- Responsive application shell with collapsible sidebar, mobile drawer,
  account menu, and a keyboard command palette (`Ctrl/Cmd + K`).
- Phase 1 database migration and seed file.

### What is intentionally not present yet

- Student records, academic history, documents, inventory, locators, and
  retrieval requests.
- Public sign-up, alumni portal, or public search.
- Sample or fabricated production records.
- Any archive statistics that are not derived from real database rows.

Planned modules display an honest module-status page with no inactive buttons
and no placeholder data.

---

## Technology

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Routing | React Router v7 (data router) |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Forms & validation | React Hook Form + Zod |
| Icons / toasts | Lucide React / Sonner |
| Data helpers | TanStack Table (installed for later archive tables), date-fns |
| Future modules | QR code generation (`qrcode.react`), PDF viewing added in Phase 7 |

No `localStorage` database is used. Supabase is the persistence layer.
`localStorage` stores only the Supabase session token (managed by the SDK) and
the sidebar collapse preference.

---

## Architecture

```
src/
  components/
    auth/           Access-blocked screen for unprovisioned/inactive accounts
    layout/         App shell, sidebar, top bar, command palette
    ui/             Reusable design-system primitives
  context/          AuthProvider (session + profile + role)
  hooks/            Document title
  lib/
    supabase/       Client, hand-written Database types
    audit.ts        Human-readable audit action labels
    modules.ts      Module catalogue and phase metadata
    navigation.ts   Role-aware navigation configuration
    roles.ts        Role labels, descriptions, and access scopes
    utils.ts        Formatting and class helpers
  pages/
    account/        Real staff profile and session details
    admin/          Staff directory, audit trail, system settings
    auth/           Login
    dashboard/      Readiness dashboard using real data
    errors/         403, 404, route error boundary
    modules/        Honest status pages for planned modules
  routes/           ProtectedRoute, RequireRole, router
supabase/
  migrations/       Phase 1 foundation SQL
  seed.sql          Non-secret system settings only
```

**Boundaries**

- UI components never talk to the database directly for authorization.
- `AuthContext` resolves the session and the staff profile from Supabase.
- Role checks in the UI hide navigation; PostgreSQL RLS is the authority.
- Audit writes are performed by security-definer functions, not client inserts.
- The Supabase service-role key is never referenced in this codebase.

---

## Prerequisites

- Node.js 22+ and npm 10+
- A Supabase project (free tier is sufficient for development)
- Supabase CLI (optional, for migrations)

---

## 1. Create the frontend (already done)

These are the exact commands used to create this repository:

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom @supabase/supabase-js react-hook-form zod \
  @hookform/resolvers lucide-react sonner @tanstack/react-table clsx \
  tailwind-merge qrcode.react date-fns @fontsource-variable/inter
npm install -D tailwindcss @tailwindcss/vite
```

The Vite React TypeScript template provides the base configuration. Tailwind
v4 is wired through `@tailwindcss/vite` in `vite.config.ts`; the design tokens
live in `src/index.css`.

---

## 2. Configure the environment

Copy the template:

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

- Only the **anon / publishable** key belongs in a Vite app.
- Never put the **service-role** key in any `VITE_*` variable.
- Never commit `.env.local`.
- Restart the dev server after changing environment variables.

The app validates the configuration at startup. If it is missing, the login
screen explains what to fix instead of attempting a fake session.

---

## 3. Apply the database migration

### Option A — Supabase SQL editor (quickest)

1. Open **SQL Editor** in the Supabase dashboard.
2. Run the complete contents of
   `supabase/migrations/20261124090000_phase1_foundation.sql`.
3. Run the complete contents of `supabase/seed.sql`.
4. Confirm `schema_version` appears under **Table Editor → system_settings**.

### Option B — Supabase CLI

```bash
npx supabase init                       # first time only: creates supabase/config.toml
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

For a local Supabase stack (requires Docker):

```bash
npx supabase start
npx supabase db reset   # applies migrations and supabase/seed.sql
```

The migration is written to be safe to re-run: enums, tables, indexes,
triggers, policies, and functions are created idempotently.

---

## 4. Create the first administrator

There is no public sign-up and no client-side role assignment.

1. In **Supabase → Authentication → Users**, create a user with a real email and
   a strong password. Confirm the email if confirmation is enabled.
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

To provision another staff member, create the auth user first, then insert a
profile with one of:

- `registrar`
- `digitization_staff`
- `administrator`

Set `is_active = true` only after the account has been approved.

**Least privilege:** a new profile defaults to `digitization_staff` and
`is_active = false`. Inactive profiles can authenticate but cannot enter the
application; they see the access-blocked screen.

---

## 5. Run the application

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

Static hosts must rewrite unknown paths to `index.html` because TRACE uses the
HTML5 history API (`/students`, `/admin/audit`, etc.).

---

## 6. Verify security before trusting the deployment

Phase 1 policies are **authored and included in the migration**, but they have
not been verified against your live Supabase project. Run these checks before
using real student data.

### Policy inventory

```sql
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'system_settings', 'audit_logs')
order by table_name, grantee, privilege_type;
```

Expected Phase 1 posture:

- `profiles`: SELECT for authenticated only; own row or administrator.
- `system_settings`: SELECT for active staff only.
- `audit_logs`: SELECT for active administrators only.
- No client INSERT/UPDATE/DELETE grants or policies on these tables.
- No anon access to any of them.
- `record_audit_event` executable only by trusted database functions.
- `record_sign_in` executable by authenticated users; actor and action fixed.

### Manual checks with a non-admin test account

1. Sign in as a Digitization Staff account. Confirm the sidebar hides
   **Staff Accounts**, **Audit Trail**, and **System Settings**.
2. Open `/admin/users` directly. Confirm the 403 page appears.
3. Open `/admin/audit` directly. Confirm the 403 page appears.
4. Query `audit_logs` from the browser console with the anon key. Confirm zero
   rows / permission denied.
5. Attempt to update your own `profiles.role` to `administrator`. Confirm the
   request is denied.
6. Attempt to insert an `audit_logs` row directly. Confirm the request is
   denied.
7. Sign in as an administrator. Confirm the staff directory and audit trail
   show real data, and that a sign-in event appears.
8. Set a test profile to `is_active = false`, then sign in. Confirm the
   access-blocked screen appears and archival routes remain inaccessible.

If any check fails, stop and correct the policies before encoding records.

---

## Data privacy rules

- Treat every historical record as confidential personal information.
- Scanned documents will use a **private** Supabase Storage bucket and
  short-expiry signed URLs (Phase 7). No public URLs.
- Do not put student names, grades, or document contents into audit metadata.
- Do not use real records in development. Use fictional fixtures only.
- No public search page, public QR payload, or unauthenticated document route
  may be introduced.
- QR codes (Phase 8) will identify a locator or internal record; scanning must
  still require authentication and authorization.
- Keep the service-role key server-side only.

---

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check with `tsc -b` and build production assets |
| `npm run typecheck` | Type-check only (`tsc -b`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint (currently reports advisory warnings only) |

---

## Deployment notes

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting
   provider's environment settings.
2. Configure SPA rewrites to `index.html`.
3. Apply the migration and seed to the production Supabase project **before**
   deploying the frontend.
4. Provision the first administrator.
5. Run the security checklist above with a non-admin account.
6. Confirm Supabase backups are enabled and document the restore procedure.
7. Do not enable real student scans until Phase 7 storage policies are tested.

---

## Known Phase 1 limitations

- **RLS is unverified against a live project.** The migration defines the
  policies, but section 6 must be executed before real student data is stored.
- **Account provisioning is SQL-only.** Creating staff, resetting passwords, and
  editing roles in the interface arrive in Phase 2.
- **The production bundle is a single ~850 kB chunk (~245 kB gzipped).** Route
  level code splitting is worthwhile once the archive modules are added.
- **No offline or print output yet.** Reports and printable locator labels are
  later phases.
- `npm run lint` reports advisory `react(set-state-in-effect)` warnings for the
  standard fetch-on-mount pattern. They are warnings, not failures.

---

## Phase 1 acceptance checklist

- [x] React + TypeScript + Vite project builds without type errors.
- [x] Tailwind CSS configured with an institutional design system.
- [x] React Router with protected and role-gated routes.
- [x] Supabase client configured through environment variables.
- [x] Login, session restore, sign-out, and blocked-access states.
- [x] Responsive shell with collapsible sidebar and mobile drawer.
- [x] Top navigation with account menu and keyboard command palette.
- [x] Initial dashboard and module landing pages.
- [x] Initial migration for profiles, audit logs, settings, helpers, and RLS.
- [x] No fabricated statistics, no placeholder buttons, no public data access.
- [ ] RLS verified against a live project (see section 6 — required before
      production use).

Phase 2 begins only after the Phase 1 checks pass.
