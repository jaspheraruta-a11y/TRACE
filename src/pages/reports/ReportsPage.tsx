import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Download,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { MetricCard } from '@/components/archive/MetricCard'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import { downloadCsv, toCsv } from '@/lib/archive/csv'
import { REQUEST_STATUS_LABELS } from '@/lib/archive/labels'
import {
  exportRequests,
  exportStudents,
  getArchiveReport,
  getReportGaps,
} from '@/lib/archive/reports'
import type { RequestStatus } from '@/lib/supabase/database.types'
import { formatDateTime } from '@/lib/utils'

const GAP_LABELS: Record<string, string> = {
  missing_locator: 'Missing physical locator',
  missing_document: 'No current scanned document',
  pending_document: 'Document awaiting verification',
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function CoverageBar({
  label,
  percent,
  detail,
}: {
  label: string
  percent: number
  detail: string
}) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="font-semibold text-slate-900">{percent}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-600 transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  )
}

export function ReportsPage() {
  useDocumentTitle('Reports')
  const [gapType, setGapType] = useState('')
  const [exporting, setExporting] = useState<'students' | 'requests' | null>(null)

  const report = useAsyncData(() => getArchiveReport(), [])
  const gaps = useAsyncData(() => getReportGaps(), [])

  const gapRows = gaps.data ?? []
  const filteredGaps = useMemo(
    () => (gapType ? gapRows.filter((row) => row.gap_type === gapType) : gapRows),
    [gapRows, gapType],
  )

  const gapCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of gapRows) {
      counts.set(row.gap_type, (counts.get(row.gap_type) ?? 0) + 1)
    }
    return counts
  }, [gapRows])

  const exportStudentCsv = async () => {
    setExporting('students')
    try {
      const rows = await exportStudents(true)
      const csv = toCsv(rows, [
        { header: 'Archive ID', value: (row) => row.archive_id },
        { header: 'Full name', value: (row) => row.full_name },
        { header: 'Date of birth', value: (row) => row.date_of_birth },
        { header: 'Verification', value: (row) => row.verification_status },
        { header: 'Locator', value: (row) => row.physical_locator_code },
        { header: 'School years', value: (row) => row.school_years },
        { header: 'Current documents', value: (row) => row.document_count },
        { header: 'Archived', value: (row) => (row.is_archived ? 'Yes' : 'No') },
      ])
      downloadCsv(
        `trace-students-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
      )
      toast.success(`${rows.length} student records exported.`)
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The export could not be created.',
      )
    } finally {
      setExporting(null)
    }
  }

  const exportRequestCsv = async () => {
    setExporting('requests')
    try {
      const rows = await exportRequests()
      const csv = toCsv(rows, [
        { header: 'Request code', value: (row) => row.request_code },
        { header: 'Requester', value: (row) => row.requester_name },
        { header: 'Requester type', value: (row) => row.requester_type },
        { header: 'Student archive ID', value: (row) => row.student_archive_id },
        { header: 'Student name', value: (row) => row.student_name },
        { header: 'Status', value: (row) => row.status },
        { header: 'Verification', value: (row) => row.verification_status },
        { header: 'Requested', value: (row) => row.request_date },
        { header: 'Released', value: (row) => row.release_date },
        { header: 'Assigned to', value: (row) => row.assigned_to_name },
      ])
      downloadCsv(
        `trace-requests-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
      )
      toast.success(`${rows.length} retrieval requests exported.`)
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The export could not be created.',
      )
    } finally {
      setExporting(null)
    }
  }

  const data = report.data
  const statusEntries = Object.entries(data?.requests.by_status ?? {}).sort(
    (a, b) => b[1] - a[1],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations · Module L"
        title="Reports"
        description="Every figure is calculated from live archive tables. Exports contain only records your role can already read."
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => void exportStudentCsv()}
              isLoading={exporting === 'students'}
              leftIcon={<Download className="size-4" aria-hidden="true" />}
            >
              Export students
            </Button>
            <Button
              variant="secondary"
              onClick={() => void exportRequestCsv()}
              isLoading={exporting === 'requests'}
              leftIcon={<Download className="size-4" aria-hidden="true" />}
            >
              Export requests
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                report.reload()
                gaps.reload()
              }}
              disabled={report.loading || gaps.loading}
              leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {report.error ? (
        <Alert variant="danger" title="Report unavailable">
          {report.error}
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
          hint={`${formatBytes(data?.documents.storage_bytes ?? 0)} stored`}
          icon={FileText}
          loading={report.loading}
        />
        <MetricCard
          label="Storage locations"
          value={(data?.locations.total ?? 0).toLocaleString()}
          hint={`${data?.locations.digitization_complete ?? 0} fully digitized`}
          icon={Boxes}
          loading={report.loading}
        />
        <MetricCard
          label="Open requests"
          value={(data?.requests.open ?? 0).toLocaleString()}
          hint={`${data?.requests.released_last_30_days ?? 0} released in 30 days`}
          icon={BarChart3}
          loading={report.loading}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Archive coverage</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Share of student records with a scan and a physical locator.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {report.loading ? (
              <>
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
              </>
            ) : (
              <>
                <CoverageBar
                  label="Document coverage"
                  percent={data?.coverage.document_coverage_percent ?? 0}
                  detail={`${
                    data?.documents.students_with_current_document ?? 0
                  } of ${data?.students.total ?? 0} records have a current scan`}
                />
                <CoverageBar
                  label="Locator coverage"
                  percent={data?.coverage.locator_coverage_percent ?? 0}
                  detail={`${
                    data?.locations.students_with_location ?? 0
                  } of ${data?.students.total ?? 0} records have a physical locator`}
                />
              </>
            )}
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Record verification
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="success">
                  {data?.students.verified ?? 0} verified
                </Badge>
                <Badge variant="danger">
                  {data?.students.needs_review ?? 0} need review
                </Badge>
                <Badge variant="warning">
                  {data?.students.unverified ?? 0} unverified
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retrieval status</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Distribution of every recorded retrieval request.
            </p>
          </CardHeader>
          <CardContent className="pt-5">
            {report.loading ? (
              <Skeleton className="h-40 rounded-lg" />
            ) : statusEntries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No retrieval requests have been recorded yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {statusEntries.map(([status, total]) => {
                  const percent =
                    (data?.requests.total ?? 0) > 0
                      ? Math.round(
                          (total / (data?.requests.total ?? 1)) * 100,
                        )
                      : 0
                  return (
                    <li key={status}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700">
                          {REQUEST_STATUS_LABELS[status as RequestStatus] ??
                            status.replaceAll('_', ' ')}
                        </span>
                        <span className="font-medium text-slate-900">
                          {total}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {data?.academic.school_year_entries ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 uppercase">Year entries</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {data?.academic.subject_entries ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 uppercase">Subjects</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {data?.academic.students_with_history ?? 0}
                </p>
                <p className="text-[10px] text-slate-500 uppercase">
                  With history
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" aria-hidden="true" />
                Archive gap report
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Active records missing a locator, a scan, or a verification.
                {gaps.data
                  ? ` ${gapRows.length.toLocaleString()} gap${
                      gapRows.length === 1 ? '' : 's'
                    } found.`
                  : ''}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={gapType}
                onChange={(event) => setGapType(event.target.value)}
                aria-label="Filter gaps by type"
              >
                <option value="">All gap types</option>
                {Object.entries(GAP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} ({gapCounts.get(value) ?? 0})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {gaps.error ? (
            <Alert variant="danger" title="Gap report unavailable">
              {gaps.error}
            </Alert>
          ) : gaps.loading ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : filteredGaps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-5 py-8 text-center">
              <ShieldCheck
                className="mx-auto size-5 text-emerald-600"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium text-emerald-900">
                No gaps in this view
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                Every active record has the required locator and document state.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                    <th className="py-3 pr-4 font-semibold">Gap</th>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Archive ID</th>
                    <th className="px-4 py-3 font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGaps.slice(0, 500).map((row) => (
                    <tr key={`${row.gap_type}-${row.student_id}`}>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            row.gap_type === 'pending_document'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {GAP_LABELS[row.gap_type] ??
                            row.gap_type.replaceAll('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {row.full_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {row.archive_id}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {row.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredGaps.length > 500 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Showing the first 500 of {filteredGaps.length.toLocaleString()}{' '}
                  gaps. Export the student list for a complete worklist.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-slate-400">
        Report generated {formatDateTime(data?.generated_at)} · Figures refresh
        with each visit and are never cached as a separate dataset.
      </p>
    </div>
  )
}
