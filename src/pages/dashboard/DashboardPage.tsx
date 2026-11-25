import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileText,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/archive/MetricCard'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { buttonStyles } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import { describeAuditAction } from '@/lib/audit'
import { getArchiveReport } from '@/lib/archive/reports'
import { ROLE_DESCRIPTIONS, ROLE_SCOPE, roleLabel } from '@/lib/roles'
import { supabase } from '@/lib/supabase/client'
import type { AuditLogRow } from '@/lib/supabase/database.types'
import { formatRelative, getInitials } from '@/lib/utils'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const QUICK_ACTIONS = [
  {
    label: 'Add a student record',
    description: 'Encode a historical record with optional details left blank.',
    to: '/students',
    icon: Plus,
  },
  {
    label: 'Search the archive',
    description: 'Find a record from a partial or misspelled detail.',
    to: '/search',
    icon: Search,
  },
  {
    label: 'Upload a scan',
    description: 'Attach a private PDF or image to a student record.',
    to: '/documents',
    icon: Upload,
  },
  {
    label: 'Record a request',
    description: 'Track a retrieval request from intake to release.',
    to: '/requests',
    icon: ClipboardList,
  },
] as const

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { profile, isAdmin } = useAuth()
  const report = useAsyncData(() => getArchiveReport(), [])

  const recent = useAsyncData<AuditLogRow[]>(async () => {
    if (!supabase || !isAdmin) return []
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)
    if (error) throw new Error(error.message)
    return data ?? []
  }, [isAdmin])

  const data = report.data
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'there'

  const attention = [
    {
      label: 'Records without a physical locator',
      value: data?.locations.students_without_location ?? 0,
      to: '/inventory',
    },
    {
      label: 'Current documents awaiting verification',
      value: data?.documents.pending ?? 0,
      to: '/documents',
    },
    {
      label: 'Requests awaiting verification',
      value: data?.requests.by_status.verification_required ?? 0,
      to: '/requests',
    },
    {
      label: 'Records marked needs review',
      value: data?.students.needs_review ?? 0,
      to: '/students',
    },
  ].filter((item) => item.value > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`${greeting()}, ${firstName}`}
        description="A live picture of the Registrar archive. Every number below comes from stored records — nothing is a sample or a projection."
        badge={<RoleBadge role={profile?.role ?? null} />}
        actions={
          <Link to="/students" className={buttonStyles({ variant: 'primary' })}>
            <Plus className="size-4" aria-hidden="true" />
            Add student
          </Link>
        }
      />

      {report.error ? (
        <Alert variant="danger" title="Archive metrics unavailable">
          {report.error} Open a module directly from the sidebar to continue
          working with live records.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Student records"
          value={(data?.students.total ?? 0).toLocaleString()}
          hint={`${data?.students.active ?? 0} active · ${
            data?.students.archived ?? 0
          } archived`}
          icon={Users}
          loading={report.loading}
        />
        <MetricCard
          label="Current documents"
          value={(data?.documents.current ?? 0).toLocaleString()}
          hint={`${data?.documents.verified ?? 0} verified · ${
            data?.documents.pending ?? 0
          } pending`}
          icon={FileText}
          loading={report.loading}
        />
        <MetricCard
          label="Physical locators"
          value={(data?.locations.total ?? 0).toLocaleString()}
          hint={`${data?.coverage.locator_coverage_percent ?? 0}% of records assigned`}
          icon={MapPin}
          loading={report.loading}
        />
        <MetricCard
          label="Open requests"
          value={(data?.requests.open ?? 0).toLocaleString()}
          hint={`${data?.requests.released_last_30_days ?? 0} released in 30 days`}
          icon={ClipboardList}
          loading={report.loading}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Archive health</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Coverage of the two things every record needs: a scan and a
                physical locator.
              </p>
            </div>
            <Link
              to="/reports"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              Full reports
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {report.loading ? (
              <>
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      Document coverage
                    </span>
                    <span className="font-semibold text-slate-900">
                      {data?.coverage.document_coverage_percent ?? 0}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{
                        width: `${Math.min(
                          100,
                          data?.coverage.document_coverage_percent ?? 0,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {data?.documents.students_with_current_document ?? 0} of{' '}
                    {data?.students.total ?? 0} records have at least one current
                    scan
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      Locator coverage
                    </span>
                    <span className="font-semibold text-slate-900">
                      {data?.coverage.locator_coverage_percent ?? 0}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(
                          100,
                          data?.coverage.locator_coverage_percent ?? 0,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {data?.locations.students_with_location ?? 0} of{' '}
                    {data?.students.total ?? 0} records have a physical storage
                    locator
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {data?.students.verified ?? 0}
                    </p>
                    <p className="text-[10px] tracking-wide text-slate-500 uppercase">
                      Verified records
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {data?.academic.school_year_entries ?? 0}
                    </p>
                    <p className="text-[10px] tracking-wide text-slate-500 uppercase">
                      Year entries
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {data?.academic.subject_entries ?? 0}
                    </p>
                    <p className="text-[10px] tracking-wide text-slate-500 uppercase">
                      Subject entries
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle
                className="size-4 text-amber-500"
                aria-hidden="true"
              />
              Needs attention
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Live gaps that block complete archival coverage.
            </p>
          </CardHeader>
          <CardContent className="pt-5">
            {report.loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ) : attention.length === 0 ? (
              <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-6 text-center">
                <ShieldCheck
                  className="mx-auto size-5 text-emerald-600"
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm font-medium text-emerald-900">
                  Nothing outstanding
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  No coverage gaps are currently recorded.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {attention.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 transition hover:border-brand-300 hover:bg-brand-50/40"
                    >
                      <span className="text-xs text-slate-700">{item.label}</span>
                      <Badge variant="warning">{item.value}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Common tasks, available according to your role.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/30"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <action.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 group-hover:text-brand-800">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {action.description}
                  </span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your access</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {roleLabel(profile?.role)}
            </p>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-600">
              {profile?.role
                ? ROLE_DESCRIPTIONS[profile.role]
                : 'No role is assigned to this account.'}
            </p>
            {profile?.role ? (
              <ul className="mt-3 space-y-1.5">
                {ROLE_SCOPE[profile.role].map((scope) => (
                  <li
                    key={scope}
                    className="flex items-start gap-2 text-xs text-slate-600"
                  >
                    <ShieldCheck
                      className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
                      aria-hidden="true"
                    />
                    {scope}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              to="/account"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              View account
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                The latest recorded staff actions. Audit entries cannot be edited.
              </p>
            </div>
            <Link
              to="/admin/audit"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              Open audit trail
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent className="pt-5">
            {recent.error ? (
              <Alert variant="warning" title="Activity unavailable">
                {recent.error}
              </Alert>
            ) : recent.loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 rounded-lg" />
                <Skeleton className="h-9 rounded-lg" />
                <Skeleton className="h-9 rounded-lg" />
              </div>
            ) : (recent.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">
                No staff activity has been recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(recent.data ?? []).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                        {getInitials(entry.actor_email ?? 'System')}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-800">
                          {describeAuditAction(entry.action)}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {entry.actor_email ?? 'System'} · {entry.entity_type}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {formatRelative(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-4 text-slate-400" aria-hidden="true" />
            Module guide
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              to: '/students',
              title: 'Student Archive',
              text: 'Masterlist, historical details, academic history.',
              icon: Users,
            },
            {
              to: '/search',
              title: 'Smart Search',
              text: 'Fuzzy, ranked search across every indexed field.',
              icon: Search,
            },
            {
              to: '/documents',
              title: 'Documents',
              text: 'Private scans, verification, signed access.',
              icon: FileText,
            },
            {
              to: '/inventory',
              title: 'Inventory',
              text: 'Locators, labels, digitization progress.',
              icon: MapPin,
            },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg border border-slate-200 p-3.5 transition hover:border-brand-300 hover:bg-brand-50/30"
            >
              <item.icon
                className="size-4 text-brand-600"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium text-slate-900">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{item.text}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
