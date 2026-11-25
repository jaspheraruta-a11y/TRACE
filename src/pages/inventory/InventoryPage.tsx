import { useMemo, useState } from 'react'
import {
  Boxes,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { DigitizationBadge } from '@/components/archive/StatusBadges'
import { MetricCard } from '@/components/archive/MetricCard'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  deleteLocation,
  listLocationSummary,
  type LocationSummaryRow,
} from '@/lib/archive/inventory'
import { DIGITIZATION_LABELS } from '@/lib/archive/labels'
import { getArchiveReport } from '@/lib/archive/reports'
import { formatDateTime } from '@/lib/utils'
import { AssignStudentDialog } from '@/pages/inventory/AssignStudentDialog'
import { LocatorLabelDialog } from '@/pages/inventory/LocatorLabelDialog'
import { LocationFormDialog } from '@/pages/inventory/LocationFormDialog'

export function InventoryPage() {
  useDocumentTitle('Archive inventory')
  const { isAdmin } = useAuth()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [digitization, setDigitization] = useState('')

  const locations = useAsyncData(() => listLocationSummary(), [])
  const report = useAsyncData(() => getArchiveReport(), [])

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LocationSummaryRow | null>(null)
  const [assignTarget, setAssignTarget] = useState<LocationSummaryRow | null>(null)
  const [labelTarget, setLabelTarget] = useState<LocationSummaryRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LocationSummaryRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const rows = locations.data ?? []

  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.archive_category))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (category && row.archive_category !== category) return false
      if (digitization && row.digitization_status !== digitization) return false
      if (!term) return true
      return [
        row.locator_code,
        row.archive_category,
        row.room,
        row.cabinet,
        row.shelf,
        row.box_code,
        row.folder_code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [rows, query, category, digitization])

  const reload = () => {
    locations.reload()
    report.reload()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLocation(deleteTarget.id)
      toast.success('Storage location deleted. Linked students are now unassigned.')
      setDeleteTarget(null)
      reload()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The location could not be deleted.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archive · Modules G / I"
        title="Physical archive & inventory"
        description="Every original record points at one structured locator. Locator codes are unique, printable as labels, and safe to rename."
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => {
                setEditTarget(null)
                setFormOpen(true)
              }}
              leftIcon={<Plus className="size-4" aria-hidden="true" />}
            >
              New location
            </Button>
            <Button
              variant="ghost"
              onClick={reload}
              disabled={locations.loading}
              leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {report.error ? (
        <Alert variant="warning" title="Coverage summary unavailable">
          {report.error} The inventory list below still uses live records.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Storage locations"
          value={(report.data?.locations.total ?? 0).toLocaleString()}
          hint="Rooms, cabinets, boxes"
          icon={Boxes}
          loading={report.loading}
        />
        <MetricCard
          label="Assigned students"
          value={(
            report.data?.locations.students_with_location ?? 0
          ).toLocaleString()}
          hint={`${report.data?.coverage.locator_coverage_percent ?? 0}% coverage`}
          icon={UserPlus}
          loading={report.loading}
        />
        <MetricCard
          label="Without a locator"
          value={(
            report.data?.locations.students_without_location ?? 0
          ).toLocaleString()}
          hint="Need physical filing"
          icon={MapPin}
          loading={report.loading}
        />
        <MetricCard
          label="Digitization complete"
          value={(
            report.data?.locations.digitization_complete ?? 0
          ).toLocaleString()}
          hint="Locations fully scanned"
          icon={Printer}
          loading={report.loading}
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Locator register</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {locations.loading
                  ? 'Loading storage locations…'
                  : `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} location${
                      rows.length === 1 ? '' : 's'
                    }`}
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
                placeholder="Search locator, room, box…"
                className="pl-9"
                aria-label="Search storage locations"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter by archive category"
            >
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Select
              value={digitization}
              onChange={(event) => setDigitization(event.target.value)}
              aria-label="Filter by digitization status"
            >
              <option value="">All digitization states</option>
              {(
                Object.keys(DIGITIZATION_LABELS) as Array<
                  keyof typeof DIGITIZATION_LABELS
                >
              ).map((status) => (
                <option key={status} value={status}>
                  {DIGITIZATION_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {locations.error ? (
            <Alert variant="danger" title="Inventory unavailable">
              {locations.error}
            </Alert>
          ) : locations.loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={rows.length === 0 ? 'No storage locations yet' : 'No matching locations'}
              description={
                rows.length === 0
                  ? 'Create the first room, cabinet, box, or folder locator. No sample locations are created automatically.'
                  : 'Adjust the search or filters to find a locator.'
              }
              action={
                rows.length === 0 ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditTarget(null)
                      setFormOpen(true)
                    }}
                    leftIcon={<Plus className="size-4" aria-hidden="true" />}
                  >
                    New location
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                    <th className="py-3 pr-4 font-semibold">Locator</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Structure</th>
                    <th className="px-4 py-3 font-semibold">Students</th>
                    <th className="px-4 py-3 font-semibold">Documents</th>
                    <th className="px-4 py-3 font-semibold">Digitization</th>
                    <th className="py-3 pl-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => {
                    const structure = [
                      row.room ? `R ${row.room}` : null,
                      row.cabinet ? `C ${row.cabinet}` : null,
                      row.shelf ? `S ${row.shelf}` : null,
                      row.box_code ? `B ${row.box_code}` : null,
                      row.folder_code ? `F ${row.folder_code}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 pr-4">
                          <p className="font-mono text-xs font-semibold text-slate-900">
                            {row.locator_code}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Updated {formatDateTime(row.updated_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {row.archive_category}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {structure || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {row.student_count}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {row.document_count}
                        </td>
                        <td className="px-4 py-3.5">
                          <DigitizationBadge status={row.digitization_status} />
                        </td>
                        <td className="py-3.5 pl-4">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAssignTarget(row)}
                              leftIcon={
                                <UserPlus
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              }
                            >
                              Assign
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLabelTarget(row)}
                              leftIcon={
                                <Printer
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              }
                            >
                              Label
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditTarget(row)
                                setFormOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                            {isAdmin ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => setDeleteTarget(row)}
                                leftIcon={
                                  <Trash2
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                }
                              >
                                Delete
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {formOpen ? (
        <LocationFormDialog
          open
          initial={editTarget}
          onClose={() => {
            setFormOpen(false)
            setEditTarget(null)
          }}
          onSaved={reload}
        />
      ) : null}

      {assignTarget ? (
        <AssignStudentDialog
          open
          locationId={assignTarget.id}
          locatorCode={assignTarget.locator_code}
          onClose={() => setAssignTarget(null)}
          onAssigned={reload}
        />
      ) : null}

      {labelTarget ? (
        <LocatorLabelDialog
          open
          location={labelTarget}
          onClose={() => setLabelTarget(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          title="Delete storage location"
          description={
            <>
              <strong>{deleteTarget.locator_code}</strong> will be removed.
              Students currently assigned to it will keep their records but lose
              their physical locator. The audit trail keeps a record of the
              deletion.
            </>
          }
          confirmLabel="Delete location"
          tone="danger"
          isLoading={deleting}
        />
      ) : null}
    </div>
  )
}
