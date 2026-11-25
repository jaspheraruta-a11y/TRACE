import { useDeferredValue, useState } from 'react'
import {
  ClipboardList,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { MetricCard } from '@/components/archive/MetricCard'
import {
  RequestStatusBadge,
  RequestVerificationBadge,
} from '@/components/archive/StatusBadges'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  REQUEST_STATUS_LABELS,
  REQUEST_VERIFICATION_LABELS,
} from '@/lib/archive/labels'
import { getArchiveReport } from '@/lib/archive/reports'
import {
  getRequest,
  listRequests,
  type RequestWithRelations,
} from '@/lib/archive/requests'
import type {
  RequestStatus,
  RequestVerificationStatus,
} from '@/lib/supabase/database.types'
import { formatDate } from '@/lib/utils'
import { RequestDetailDialog } from '@/pages/requests/RequestDetailDialog'
import { RequestFormDialog } from '@/pages/requests/RequestFormDialog'

export function RequestsPage() {
  useDocumentTitle('Retrieval requests')
  const [searchParams, setSearchParams] = useSearchParams()
  const studentFilter = searchParams.get('student')

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [status, setStatus] = useState('')
  const [verification, setVerification] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<RequestWithRelations | null>(null)

  const requests = useAsyncData(
    () =>
      listRequests({
        query: deferredQuery,
        status: (status as RequestStatus) || undefined,
        verificationStatus:
          (verification as RequestVerificationStatus) || undefined,
        studentId: studentFilter ?? undefined,
        limit: 200,
      }),
    [deferredQuery, status, verification, studentFilter],
  )

  const report = useAsyncData(() => getArchiveReport(), [])
  const rows = requests.data ?? []

  const clearStudentFilter = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('student')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations · Module H"
        title="Retrieval requests"
        description="Track every request from intake through verification and release. A record cannot be released until the requester is verified."
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="size-4" aria-hidden="true" />}
            >
              New request
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                requests.reload()
                report.reload()
              }}
              disabled={requests.loading}
              leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {report.error ? (
        <Alert variant="warning" title="Request summary unavailable">
          {report.error} The request list below still uses live records.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total requests"
          value={(report.data?.requests.total ?? 0).toLocaleString()}
          hint="All recorded requests"
          icon={ClipboardList}
          loading={report.loading}
        />
        <MetricCard
          label="Open requests"
          value={(report.data?.requests.open ?? 0).toLocaleString()}
          hint="Not yet released or closed"
          icon={Clock3}
          loading={report.loading}
        />
        <MetricCard
          label="Released (30 days)"
          value={(
            report.data?.requests.released_last_30_days ?? 0
          ).toLocaleString()}
          hint="Recent releases"
          icon={UserCheck}
          loading={report.loading}
        />
        <MetricCard
          label="Awaiting verification"
          value={(
            report.data?.requests.by_status.verification_required ?? 0
          ).toLocaleString()}
          hint="Requester checks pending"
          icon={ShieldCheck}
          loading={report.loading}
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Request register</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {requests.loading
                  ? 'Loading requests…'
                  : `${rows.length.toLocaleString()} request${
                      rows.length === 1 ? '' : 's'
                    } shown`}
              </p>
            </div>
            <div className="relative w-full lg:w-72">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search requester, code, contact…"
                className="pl-9"
                aria-label="Search retrieval requests"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by request status"
            >
              <option value="">All statuses</option>
              {(
                Object.keys(REQUEST_STATUS_LABELS) as RequestStatus[]
              ).map((option) => (
                <option key={option} value={option}>
                  {REQUEST_STATUS_LABELS[option]}
                </option>
              ))}
            </Select>
            <Select
              value={verification}
              onChange={(event) => setVerification(event.target.value)}
              aria-label="Filter by verification status"
            >
              <option value="">All verification states</option>
              {(
                Object.keys(REQUEST_VERIFICATION_LABELS) as RequestVerificationStatus[]
              ).map((option) => (
                <option key={option} value={option}>
                  {REQUEST_VERIFICATION_LABELS[option]}
                </option>
              ))}
            </Select>
            {studentFilter ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900">
                <span className="truncate">Filtered to one student record</span>
                <Button variant="ghost" size="sm" onClick={clearStudentFilter}>
                  Clear
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {requests.error ? (
            <Alert variant="danger" title="Requests unavailable">
              {requests.error}
            </Alert>
          ) : requests.loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={
                query || status || verification || studentFilter
                  ? 'No matching requests'
                  : 'No retrieval requests yet'
              }
              description={
                query || status || verification || studentFilter
                  ? 'Adjust the search or filters. Requests are kept permanently, including closed ones.'
                  : 'Create the first request when someone asks the Registrar for a record.'
              }
              action={
                !query && !status && !verification && !studentFilter ? (
                  <Button
                    variant="primary"
                    onClick={() => setCreateOpen(true)}
                    leftIcon={<Plus className="size-4" aria-hidden="true" />}
                  >
                    New request
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                    <th className="py-3 pr-4 font-semibold">Request</th>
                    <th className="px-4 py-3 font-semibold">Requester</th>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Requested</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Verification</th>
                    <th className="py-3 pl-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 pr-4">
                        <p className="font-mono text-xs font-semibold text-slate-900">
                          {row.request_code}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {row.assignee
                            ? `Assigned to ${row.assignee.full_name}`
                            : 'Unassigned'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-800">
                          {row.requester_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.requester_type}
                          {row.relationship ? ` · ${row.relationship}` : ''}
                        </p>
                      </td>
                      <td className="max-w-48 px-4 py-3.5 text-xs text-slate-600">
                        {row.student ? (
                          <>
                            <span className="block truncate">
                              {row.student.full_name}
                            </span>
                            <span className="block font-mono text-[10px] text-slate-400">
                              {row.student.archive_id}
                            </span>
                          </>
                        ) : (
                          'Not identified'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {formatDate(row.request_date)}
                      </td>
                      <td className="px-4 py-3.5">
                        <RequestStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <RequestVerificationBadge
                          status={row.verification_status}
                        />
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelected(row)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!requests.loading && rows.length > 0 ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Badge variant="outline">Private</Badge>
          Requesters are not system users. Every request is handled by authorized
          Registrar staff only.
        </p>
      ) : null}

      {createOpen ? (
        <RequestFormDialog
          open
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            requests.reload()
            report.reload()
          }}
        />
      ) : null}

      {selected ? (
        <RequestDetailDialog
          open
          request={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            requests.reload()
            report.reload()
            void getRequest(selected.id)
              .then((fresh) => {
                if (fresh) setSelected(fresh)
              })
              .catch(() => undefined)
          }}
        />
      ) : null}
    </div>
  )
}
