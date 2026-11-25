import { useDeferredValue, useMemo, useState } from 'react'
import {
  Archive,
  ArrowUpRight,
  FileUp,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { MetricCard } from '@/components/archive/MetricCard'
import { Pagination } from '@/components/archive/Pagination'
import { RecordStatusBadge } from '@/components/archive/StatusBadges'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getArchiveReport } from '@/lib/archive/reports'
import {
  searchStudents,
  setStudentArchived,
  type StudentSearchRow,
} from '@/lib/archive/students'
import { formatDate } from '@/lib/utils'
import { StudentFormDialog } from '@/pages/students/StudentFormDialog'
import { StudentImportDialog } from '@/pages/students/StudentImportDialog'

const PAGE_SIZE = 25

export function StudentsPage() {
  useDocumentTitle('Student archive')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [schoolYear, setSchoolYear] = useState('')
  const [school, setSchool] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [locator, setLocator] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<StudentSearchRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const {
    data,
    loading,
    error,
    reload,
  } = useAsyncData(
    () =>
      searchStudents({
        query: deferredQuery,
        schoolYear,
        school,
        yearLevel,
        subject,
        locator,
        includeArchived,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    [
      deferredQuery,
      schoolYear,
      school,
      yearLevel,
      subject,
      locator,
      includeArchived,
      page,
    ],
  )

  const report = useAsyncData(() => getArchiveReport(), [])

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const filtersActive = Boolean(
    deferredQuery.trim() ||
      schoolYear.trim() ||
      school.trim() ||
      yearLevel.trim() ||
      subject.trim() ||
      locator.trim() ||
      includeArchived,
  )

  const metrics = useMemo(() => {
    const value = report.data
    return {
      total: value?.students.total ?? 0,
      verified: value?.students.verified ?? 0,
      needsReview: value?.students.needs_review ?? 0,
      archived: value?.students.archived ?? 0,
    }
  }, [report.data])

  const resetFilters = () => {
    setQuery('')
    setSchoolYear('')
    setSchool('')
    setYearLevel('')
    setSubject('')
    setLocator('')
    setIncludeArchived(false)
    setPage(1)
  }

  const confirmArchive = async () => {
    if (!archiveTarget) return
    const target = archiveTarget
    setBusyId(target.id)

    try {
      await setStudentArchived(target.id, !target.is_archived)
      toast.success(
        target.is_archived
          ? `${target.full_name} restored to the active archive.`
          : `${target.full_name} archived. The record is preserved.`,
      )
      setArchiveTarget(null)
      reload()
      report.reload()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The record could not be updated.',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archive · Module B"
        title="Student archive"
        description="The masterlist of historical student records. Missing details remain blank, and archived records are preserved rather than deleted."
        badge={<Badge variant="success">Management active</Badge>}
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="size-4" aria-hidden="true" />}
            >
              Add student
            </Button>
            <Button
              variant="secondary"
              onClick={() => setImportOpen(true)}
              leftIcon={<FileUp className="size-4" aria-hidden="true" />}
            >
              Import CSV
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                reload()
                report.reload()
              }}
              disabled={loading}
              leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {report.error ? (
        <Alert variant="warning" title="Summary unavailable">
          {report.error} The searchable list below still uses live records.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total records"
          value={metrics.total.toLocaleString()}
          hint="Active and archived"
          icon={UserRound}
          loading={report.loading}
        />
        <MetricCard
          label="Verified"
          value={metrics.verified.toLocaleString()}
          hint="Record details checked"
          icon={ShieldCheck}
          loading={report.loading}
        />
        <MetricCard
          label="Needs review"
          value={metrics.needsReview.toLocaleString()}
          hint="Incomplete or conflicting details"
          icon={SearchX}
          loading={report.loading}
        />
        <MetricCard
          label="Archived"
          value={metrics.archived.toLocaleString()}
          hint="Preserved, not deleted"
          icon={Archive}
          loading={report.loading}
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Record list</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? 'Searching the archive…'
                  : `${total.toLocaleString()} matching record${total === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Search name, archive ID, guardian, school…"
                className="pl-9"
                aria-label="Search student archive"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Input
              value={schoolYear}
              onChange={(event) => {
                setSchoolYear(event.target.value)
                setPage(1)
              }}
              placeholder="School year (e.g. 1994-1995)"
              aria-label="Filter by school year"
            />
            <Input
              value={school}
              onChange={(event) => {
                setSchool(event.target.value)
                setPage(1)
              }}
              placeholder="School attended"
              aria-label="Filter by school"
            />
            <Input
              value={yearLevel}
              onChange={(event) => {
                setYearLevel(event.target.value)
                setPage(1)
              }}
              placeholder="Year level"
              aria-label="Filter by year level"
            />
            <Input
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value)
                setPage(1)
              }}
              placeholder="Subject"
              aria-label="Filter by subject"
            />
            <Input
              value={locator}
              onChange={(event) => {
                setLocator(event.target.value)
                setPage(1)
              }}
              placeholder="Locator code"
              aria-label="Filter by locator code"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => {
                  setIncludeArchived(event.target.checked)
                  setPage(1)
                }}
                className="size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              />
              Include archived records
            </label>
            {filtersActive ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {error ? (
            <Alert variant="danger" title="Archive unavailable">
              {error}
            </Alert>
          ) : loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-slate-100 pb-3"
                >
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={SearchX}
                title="No matching records"
                description="Try a different spelling, a partial archive ID, or clear one of the filters."
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Archive}
                title="The archive is empty"
                description="Add the first historical student record or import a CSV batch. No sample records are created automatically."
                action={
                  <Button
                    variant="primary"
                    onClick={() => setCreateOpen(true)}
                    leftIcon={<Plus className="size-4" aria-hidden="true" />}
                  >
                    Add student
                  </Button>
                }
              />
            )
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                      <th className="py-3 pr-4 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Archive ID</th>
                      <th className="px-4 py-3 font-semibold">School years</th>
                      <th className="px-4 py-3 font-semibold">Locator</th>
                      <th className="px-4 py-3 font-semibold">Documents</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="py-3 pl-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 pr-4">
                          <Link
                            to={`/students/${row.id}`}
                            className="group flex items-center gap-3"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                              {row.full_name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-900 group-hover:text-brand-800">
                                {row.full_name}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {row.date_of_birth
                                  ? `Born ${formatDate(row.date_of_birth)}`
                                  : 'Birth date not recorded'}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {row.archive_id}
                        </td>
                        <td className="max-w-52 px-4 py-3.5 text-xs text-slate-600">
                          {row.school_years ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {row.physical_locator_code ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {row.document_count}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <RecordStatusBadge status={row.verification_status} />
                            {row.is_archived ? (
                              <Badge variant="neutral">Archived</Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3.5 pl-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/students/${row.id}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                            >
                              Open
                              <ArrowUpRight className="size-3.5" aria-hidden="true" />
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === row.id}
                              onClick={() => setArchiveTarget(row)}
                            >
                              {row.is_archived ? 'Restore' : 'Archive'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 lg:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                        {row.full_name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/students/${row.id}`}
                          className="font-medium text-slate-900 hover:text-brand-800"
                        >
                          {row.full_name}
                        </Link>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {row.archive_id}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <RecordStatusBadge status={row.verification_status} />
                          {row.is_archived ? (
                            <Badge variant="neutral">Archived</Badge>
                          ) : null}
                          <Badge variant="outline">
                            {row.document_count} document
                            {row.document_count === 1 ? '' : 's'}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {row.physical_locator_code ?? 'No physical locator'}
                          {row.school_years ? ` · ${row.school_years}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Link
                        to={`/students/${row.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700"
                      >
                        Open record
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => setArchiveTarget(row)}
                      >
                        {row.is_archived ? 'Restore' : 'Archive'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                disabled={loading}
              />
            </>
          )}
        </CardContent>
      </Card>

      {createOpen ? (
        <StudentFormDialog
          open
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            setPage(1)
            reload()
            report.reload()
          }}
        />
      ) : null}

      {importOpen ? (
        <StudentImportDialog
          open
          onClose={() => setImportOpen(false)}
          onImported={() => {
            reload()
            report.reload()
          }}
        />
      ) : null}

      {archiveTarget ? (
        <ConfirmDialog
          open
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => {
            void confirmArchive()
          }}
          title={
            archiveTarget.is_archived
              ? 'Restore student record'
              : 'Archive student record'
          }
          description={
            archiveTarget.is_archived ? (
              <>
                <strong>{archiveTarget.full_name}</strong> will return to the
                active archive. The record and its history remain unchanged.
              </>
            ) : (
              <>
                <strong>{archiveTarget.full_name}</strong> will be hidden from
                default searches. The record is preserved and can be restored
                later; nothing is deleted.
              </>
            )
          }
          confirmLabel={archiveTarget.is_archived ? 'Restore' : 'Archive'}
          tone={archiveTarget.is_archived ? 'primary' : 'danger'}
          isLoading={busyId === archiveTarget.id}
        />
      ) : null}
    </div>
  )
}
