import { useDeferredValue, useState } from 'react'
import {
  ArrowUpRight,
  FileSearch,
  MapPin,
  RefreshCw,
  Search,
  SearchX,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Pagination } from '@/components/archive/Pagination'
import { RecordStatusBadge } from '@/components/archive/StatusBadges'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import { searchStudents } from '@/lib/archive/students'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 20

export function SearchPage() {
  useDocumentTitle('Smart search')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [schoolYear, setSchoolYear] = useState('')
  const [school, setSchool] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [locator, setLocator] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const { data, loading, error, reload } = useAsyncData(
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

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const filtersActive = Boolean(
    schoolYear.trim() ||
      school.trim() ||
      yearLevel.trim() ||
      subject.trim() ||
      locator.trim() ||
      includeArchived,
  )

  const reset = () => {
    setQuery('')
    setSchoolYear('')
    setSchool('')
    setYearLevel('')
    setSubject('')
    setLocator('')
    setIncludeArchived(false)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archive · Module D"
        title="Smart search"
        description="Find a record from an imperfect detail. Results are ranked across names, archive IDs, guardians, schools, subjects, and physical locators."
        actions={
          <Button
            variant="ghost"
            onClick={reload}
            disabled={loading}
            leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
          >
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
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
                placeholder="Search a name, archive ID, guardian, school, subject, or locator…"
                className="h-11 pl-9"
                aria-label="Search the student archive"
                autoFocus
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters((value) => !value)}
              leftIcon={
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              }
            >
              {showFilters ? 'Hide filters' : 'More filters'}
            </Button>
          </div>

          {showFilters ? (
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
          ) : null}

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
            {filtersActive || query ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                Clear search
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {error ? (
            <Alert variant="danger" title="Search unavailable">
              {error}
            </Alert>
          ) : loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-3 w-72" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={query || filtersActive ? 'No matching records' : 'Start a search'}
              description={
                query || filtersActive
                  ? 'Try a shorter phrase, a partial archive ID, or fewer filters. Misspellings are tolerated but very short terms are not.'
                  : 'Enter at least part of a name, an archive ID, or any known detail. The archive is never browsable without a search.'
              }
            />
          ) : (
            <>
              <div className="space-y-3">
                {rows.map((row) => (
                  <Link
                    key={row.id}
                    to={`/students/${row.id}`}
                    className="group block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-panel"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800 ring-1 ring-brand-100">
                          {row.full_name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 group-hover:text-brand-800">
                            {row.full_name}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-slate-500">
                            {row.archive_id}
                            {row.date_of_birth
                              ? ` · born ${formatDate(row.date_of_birth)}`
                              : ''}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <RecordStatusBadge
                              status={row.verification_status}
                            />
                            {row.is_archived ? (
                              <Badge variant="neutral">Archived</Badge>
                            ) : null}
                            {row.school_years ? (
                              <Badge variant="outline">{row.school_years}</Badge>
                            ) : null}
                            {row.physical_locator_code ? (
                              <Badge variant="outline">
                                <MapPin
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                {row.physical_locator_code}
                              </Badge>
                            ) : null}
                            <Badge variant="outline">
                              <UserRound className="size-3" aria-hidden="true" />
                              {row.document_count} document
                              {row.document_count === 1 ? '' : 's'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700">
                        Open record
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

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

      {!loading && !error && rows.length > 0 ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <FileSearch className="size-3" aria-hidden="true" />
          Results are ranked by archive ID, name prefix, full-text relevance, and
          similarity. Only authorized staff can run this search.
        </p>
      ) : null}
    </div>
  )
}
