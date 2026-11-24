import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  KeyRound,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { buttonStyles } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { describeAuditAction } from '@/lib/audit'
import { ARCHIVE_MODULES } from '@/lib/modules'
import { ROLE_DESCRIPTIONS, ROLE_SCOPE, roleLabel } from '@/lib/roles'
import { supabase, supabaseConfig } from '@/lib/supabase/client'
import type {
  AuditLogRow,
  Json,
} from '@/lib/supabase/database.types'
import {
  cn,
  formatDateTime,
  formatRelative,
  getInitials,
} from '@/lib/utils'

interface SchemaState {
  loading: boolean
  version: string | null
  updatedAt: string | null
  error: string | null
}

interface ActivityState {
  loading: boolean
  rows: AuditLogRow[]
  error: string | null
}

function readSchemaVersion(value: Json | null | undefined): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const version = value.version
    if (typeof version === 'string') return version
  }
  return null
}

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { profile, session, isAdmin } = useAuth()
  const [schema, setSchema] = useState<SchemaState>({
    loading: true,
    version: null,
    updatedAt: null,
    error: null,
  })
  const [activity, setActivity] = useState<ActivityState>({
    loading: true,
    rows: [],
    error: null,
  })
  const [staff, setStaff] = useState<{ total: number; active: number } | null>(
    null,
  )

  useEffect(() => {
    if (!supabase) {
      setSchema({ loading: false, version: null, updatedAt: null, error: null })
      return
    }

    let active = true
    void supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'schema_version')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setSchema({
            loading: false,
            version: null,
            updatedAt: null,
            error: error.message,
          })
          return
        }
        setSchema({
          loading: false,
          version: readSchemaVersion(data?.value),
          updatedAt: data?.updated_at ?? null,
          error: null,
        })
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!supabase || !isAdmin) {
      setActivity({ loading: false, rows: [], error: null })
      return
    }

    let active = true

    void supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setActivity({ loading: false, rows: [], error: error.message })
          return
        }
        setActivity({ loading: false, rows: data ?? [], error: null })
      })

    void supabase
      .from('profiles')
      .select('id, is_active')
      .then(({ data, error }) => {
        if (!active || error || !data) return
        setStaff({
          total: data.length,
          active: data.filter((row) => row.is_active).length,
        })
      })

    return () => {
      active = false
    }
  }, [isAdmin])

  const checklist = [
    {
      label: 'Supabase environment',
      detail: supabaseConfig.isConfigured
        ? 'Project URL and anon key loaded from environment variables.'
        : 'Environment variables are missing.',
      ready: supabaseConfig.isConfigured,
    },
    {
      label: 'Authenticated session',
      detail: session?.user.email
        ? `Signed in as ${session.user.email}.`
        : 'No active session.',
      ready: Boolean(session),
    },
    {
      label: 'Staff profile & role',
      detail: profile
        ? `${roleLabel(profile.role)} · profile active.`
        : 'Profile not provisioned.',
      ready: Boolean(profile?.is_active),
    },
    {
      label: 'Foundation migration',
      detail: schema.loading
        ? 'Reading schema version…'
        : schema.version
          ? `Schema ${schema.version} reported by system_settings.`
          : 'The Phase 1 migration has not been applied.',
      ready: Boolean(schema.version),
    },
    {
      label: 'Private document storage',
      detail: 'Provisioned with the Document Digitization module (Phase 7).',
      ready: false,
    },
  ]

  const visibleModules = ARCHIVE_MODULES.filter(
    (module) => !module.roles || isAdmin,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Junior High School Registrar's Office"
        title="Archive overview"
        description="TRACE is being delivered in tested phases. This foundation release establishes secure staff access, the application shell, and the database controls the archive modules will build on."
        badge={<Badge variant="success">Foundation online</Badge>}
        actions={
          <Link to="/account" className={buttonStyles({ variant: 'secondary' })}>
            <UserRound className="size-4" aria-hidden="true" />
            My account
          </Link>
        }
      />

      <Card className="relative overflow-hidden border-brand-900 bg-brand-950 text-white shadow-raised">
        <div
          className="pointer-events-none absolute inset-0 bg-archive-grid opacity-60"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-24 right-10 size-64 rounded-full bg-brand-700/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-brand-200 uppercase">
              <span
                className="size-1.5 rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              Phase 1 complete
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-[26px]">
              Secure access is active.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Staff authentication, role-aware navigation, protected routes,
              and the initial database migration are in place. Archive
              statistics will appear here once real records are encoded — no
              placeholder figures are displayed.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-6 border-t border-white/10 pt-5 sm:gap-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <div>
              <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                Release
              </dt>
              <dd className="mt-1.5 text-xl font-semibold text-white">
                Phase 1
                <span className="ml-1 text-xs font-normal text-slate-400">
                  of 12
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                Schema
              </dt>
              <dd className="mt-1.5 text-xl font-semibold text-white">
                {schema.loading ? (
                  <Skeleton className="h-6 w-16 bg-white/20" />
                ) : (
                  (schema.version ?? 'Not applied')
                )}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      {schema.error ? (
        <Alert variant="warning" title="Database schema not detected">
          The Phase 1 migration could not be read from{' '}
          <code className="font-mono text-xs">system_settings</code>. Apply{' '}
          <code className="font-mono text-xs">
            supabase/migrations/20261124090000_phase1_foundation.sql
          </code>{' '}
          and run the seed file. Details: {schema.error}
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-900 ring-1 ring-brand-200">
              {getInitials(profile?.full_name ?? 'Staff')}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                Signed in as
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {profile?.full_name ?? '—'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {profile?.email ?? session?.user.email}
              </p>
              <div className="mt-2">
                <RoleBadge role={profile?.role} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                Account status
              </p>
              <Badge variant={profile?.is_active ? 'success' : 'warning'}>
                {profile?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <KeyRound className="size-4 text-slate-400" aria-hidden="true" />
              Supabase Authentication
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Last sign-in{' '}
              <span className="font-medium text-slate-700">
                {formatDateTime(session?.user.last_sign_in_at)}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {roleLabel(profile?.role)} access scope
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                Database schema
              </p>
              <Database className="size-4 text-slate-400" aria-hidden="true" />
            </div>
            {schema.loading ? (
              <Skeleton className="mt-3 h-6 w-24" />
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {schema.version
                  ? `Foundation ${schema.version}`
                  : 'Migration not applied'}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              {schema.updatedAt
                ? `Recorded ${formatDateTime(schema.updatedAt)}`
                : 'Profiles, audit logs, and system settings'}
            </p>
            {isAdmin && staff ? (
              <p className="mt-1 text-xs text-slate-500">
                {staff.active} active of {staff.total} staff profiles
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Foundation checklist</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Verified against this session and the connected project.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklist.map((item) => (
              <div key={item.label} className="flex gap-3">
                {item.ready ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="mt-0.5 size-4 shrink-0 text-slate-300"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      item.ready ? 'text-slate-800' : 'text-slate-500',
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Archive module roadmap</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Each module activates only after its schema, policies, and
                workflow are tested.
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 whitespace-nowrap">
              {visibleModules.length} modules
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-1 sm:grid-cols-2">
            {visibleModules.map((module) => {
              const Icon = module.icon
              return (
                <Link
                  key={module.id}
                  to={module.path}
                  className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200 ring-inset transition-colors group-hover:bg-white group-hover:text-brand-700">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="text-sm leading-snug font-medium text-slate-800">
                        {module.name}
                      </span>
                      <Badge
                        variant={
                          module.state === 'foundation' ? 'success' : 'neutral'
                        }
                        className="mt-0.5 shrink-0 text-[10px]"
                      >
                        {module.state === 'foundation'
                          ? 'Foundation'
                          : `Phase ${module.phase}`}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {module.summary}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-1.5 size-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
                    aria-hidden="true"
                  />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div
        className={cn(
          'grid gap-6 lg:grid-cols-3',
          !isAdmin && 'items-start',
        )}
      >
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Recent archival activity</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Real events from the protected audit log.
              </p>
            </div>
            {isAdmin ? (
              <Link
                to="/admin/audit"
                className="shrink-0 text-xs font-medium whitespace-nowrap text-brand-700 hover:text-brand-900"
              >
                Open audit trail
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {!isAdmin ? (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                Audit activity is visible to administrators. Your own record
                changes will still be logged for accountability.
              </div>
            ) : activity.loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.error ? (
              <Alert variant="warning" title="Audit log unavailable">
                {activity.error}
              </Alert>
            ) : activity.rows.length === 0 ? (
              <div className="flex items-start gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
                <Clock3
                  className="mt-0.5 size-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                No audit events yet. Sign-in events are recorded after a
                successful authentication.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {activity.rows.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                      aria-hidden="true"
                    >
                      <ShieldCheck className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {entry.summary ??
                          describeAuditAction(entry.action)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {entry.actor_email ?? 'System'} ·{' '}
                        {entry.entity_type}
                        {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ''}
                      </p>
                    </div>
                    <time
                      dateTime={entry.created_at}
                      className="shrink-0 text-xs text-slate-400"
                      title={formatDateTime(entry.created_at)}
                    >
                      {formatRelative(entry.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your access scope</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Enforced in the database, not only in this interface.
            </p>
          </CardHeader>
          <CardContent>
            <RoleBadge role={profile?.role} />
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {profile ? ROLE_DESCRIPTIONS[profile.role] : ''}
            </p>
            <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
              {(profile ? ROLE_SCOPE[profile.role] : []).map((capability) => (
                <li key={capability} className="flex gap-2.5 text-xs text-slate-600">
                  <CheckCircle2
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  {capability}
                </li>
              ))}
            </ul>
            <Link
              to="/account"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
            >
              View account details
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
