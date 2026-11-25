import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AssignLocationDialog } from '@/components/archive/AssignLocationDialog'
import { DocumentTable } from '@/components/archive/DocumentTable'
import {
  RecordStatusBadge,
  RequestStatusBadge,
  RequestVerificationBadge,
} from '@/components/archive/StatusBadges'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  deleteSchoolYear,
  deleteSubject as removeSubject,
  listSchoolYears,
} from '@/lib/archive/academic'
import { listStudentDocuments } from '@/lib/archive/documents'
import { listRequests } from '@/lib/archive/requests'
import { getStudent, setStudentArchived } from '@/lib/archive/students'
import type { SubjectRow } from '@/lib/supabase/database.types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { SchoolYearDialog } from '@/pages/students/SchoolYearDialog'
import { StudentFormDialog } from '@/pages/students/StudentFormDialog'
import { SubjectDialog } from '@/pages/students/SubjectDialog'
import { UploadDocumentDialog } from '@/pages/documents/UploadDocumentDialog'

function DetailRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-800">
        {value === null || value === undefined || value === '' ? '—' : value}
      </dd>
    </div>
  )
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasRole } = useAuth()
  const canManageDocuments = hasRole('administrator', 'registrar')
  const canVerifyDocuments = hasRole('administrator', 'registrar')

  const student = useAsyncData(
    () => (id ? getStudent(id) : Promise.resolve(null)),
    [id],
  )
  const years = useAsyncData(
    () => (id ? listSchoolYears(id) : Promise.resolve([])),
    [id],
  )
  const documents = useAsyncData(
    () => (id ? listStudentDocuments(id) : Promise.resolve([])),
    [id],
  )
  const requests = useAsyncData(
    () => (id ? listRequests({ studentId: id, limit: 25 }) : Promise.resolve([])),
    [id],
  )

  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const [yearDialog, setYearDialog] = useState<{
    open: boolean
    initialId: string | null
  }>({ open: false, initialId: null })
  const [subjectDialog, setSubjectDialog] = useState<{
    open: boolean
    schoolYearId: string | null
    initial: SubjectRow | null
  }>({ open: false, schoolYearId: null, initial: null })
  const [deleteYearId, setDeleteYearId] = useState<string | null>(null)
  const [deleteSubject, setDeleteSubject] = useState<SubjectRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  useDocumentTitle(student.data?.full_name ?? 'Student record')

  const reloadAll = () => {
    student.reload()
    years.reload()
    documents.reload()
    requests.reload()
  }

  if (!id) {
    return (
      <Alert variant="danger" title="Record not found">
        The requested student record is missing an identifier.
      </Alert>
    )
  }

  if (student.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (student.error) {
    return (
      <Alert variant="danger" title="Record unavailable">
        {student.error}
      </Alert>
    )
  }

  if (!student.data) {
    return (
      <div className="space-y-4">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to student archive
        </Link>
        <Alert variant="warning" title="Record not found">
          This student record does not exist or is not available to your account.
        </Alert>
      </div>
    )
  }

  const record = student.data
  const yearRows = years.data ?? []
  const documentRows = documents.data ?? []
  const requestRows = requests.data ?? []
  const currentYear = yearRows.find(
    (year) => year.id === yearDialog.initialId,
  )

  const confirmArchive = async () => {
    setArchiving(true)
    try {
      await setStudentArchived(record.id, !record.is_archived)
      toast.success(
        record.is_archived
          ? 'Student record restored to the active archive.'
          : 'Student record archived. Nothing was deleted.',
      )
      setArchiveOpen(false)
      reloadAll()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The record could not be updated.',
      )
    } finally {
      setArchiving(false)
    }
  }

  const confirmDeleteYear = async () => {
    if (!deleteYearId) return
    setDeleting(true)
    try {
      await deleteSchoolYear(deleteYearId)
      toast.success('High school year removed.')
      setDeleteYearId(null)
      years.reload()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The year could not be removed.',
      )
    } finally {
      setDeleting(false)
    }
  }

  const confirmDeleteSubject = async () => {
    if (!deleteSubject) return
    setDeleting(true)
    try {
      await removeSubject(deleteSubject.id)
      toast.success('Subject removed.')
      setDeleteSubject(null)
      years.reload()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The subject could not be removed.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to student archive
      </Link>

      <PageHeader
        eyebrow="Student record"
        title={record.full_name}
        description={`${record.archive_id} · Created ${formatDate(
          record.created_at,
        )} · Last updated ${formatDateTime(record.updated_at)}`}
        badge={
          <div className="flex flex-wrap items-center gap-1.5">
            <RecordStatusBadge status={record.verification_status} />
            {record.is_archived ? (
              <Badge variant="neutral">Archived</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </div>
        }
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setEditOpen(true)}
              leftIcon={<Pencil className="size-4" aria-hidden="true" />}
            >
              Edit record
            </Button>
            <Button
              variant="secondary"
              onClick={() => setUploadOpen(true)}
              leftIcon={<Upload className="size-4" aria-hidden="true" />}
            >
              Upload scan
            </Button>
            <Button
              variant="ghost"
              onClick={() => setArchiveOpen(true)}
              leftIcon={
                <RefreshCw className="size-4" aria-hidden="true" />
              }
            >
              {record.is_archived ? 'Restore' : 'Archive'}
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4 text-slate-400" aria-hidden="true" />
                Historical personal information
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Missing details stay blank. Only recorded values are shown.
              </p>
            </CardHeader>
            <CardContent className="pt-5">
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <DetailRow label="Date of birth" value={formatDate(record.date_of_birth)} />
                <DetailRow label="Birth province" value={record.birth_province} />
                <DetailRow label="Birth town or city" value={record.birth_town} />
                <DetailRow label="Birth barangay" value={record.birth_barangay} />
                <DetailRow
                  label="Parent or guardian"
                  value={record.parent_guardian_name}
                />
                <DetailRow
                  label="Guardian occupation"
                  value={record.parent_guardian_occupation}
                />
                <DetailRow
                  label="Guardian address"
                  value={record.parent_guardian_address}
                />
                <DetailRow
                  label="Intermediate school"
                  value={record.intermediate_school}
                />
                <DetailRow
                  label="Intermediate year completed"
                  value={record.intermediate_year_completed}
                />
                <DetailRow
                  label="Intermediate general average"
                  value={record.intermediate_general_average}
                />
                <DetailRow
                  label="Elementary years"
                  value={record.elementary_years}
                />
              </dl>
              {record.remarks ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                    Remarks
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-slate-700">
                    {record.remarks}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap
                    className="size-4 text-slate-400"
                    aria-hidden="true"
                  />
                  High school record
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Year entries and their subjects, preserved as recorded.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setYearDialog({ open: true, initialId: null })
                }
                leftIcon={<Plus className="size-3.5" aria-hidden="true" />}
              >
                Add year
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {years.error ? (
                <Alert variant="danger" title="Academic history unavailable">
                  {years.error}
                </Alert>
              ) : years.loading ? (
                <Skeleton className="h-32 rounded-lg" />
              ) : yearRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center">
                  <BookOpen
                    className="mx-auto size-5 text-slate-400"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    No high school years recorded
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a year entry when the original record shows one.
                  </p>
                </div>
              ) : (
                yearRows.map((year) => (
                  <div
                    key={year.id}
                    className="rounded-xl border border-slate-200"
                  >
                    <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {year.year_level}
                          {year.school_year ? (
                            <span className="ml-2 font-normal text-slate-500">
                              {year.school_year}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {[year.school_attended, year.curriculum_year]
                            .filter(Boolean)
                            .join(' · ') || 'School details not recorded'}
                        </p>
                        {year.total_days_school !== null ||
                        year.total_days_present !== null ? (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <CalendarDays
                              className="size-3"
                              aria-hidden="true"
                            />
                            {year.total_days_present ?? '—'} present of{' '}
                            {year.total_days_school ?? '—'} days
                          </p>
                        ) : null}
                        {year.remarks ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {year.remarks}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSubjectDialog({
                              open: true,
                              schoolYearId: year.id,
                              initial: null,
                            })
                          }
                          leftIcon={
                            <Plus className="size-3.5" aria-hidden="true" />
                          }
                        >
                          Subject
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setYearDialog({ open: true, initialId: year.id })
                          }
                          leftIcon={
                            <Pencil className="size-3.5" aria-hidden="true" />
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setDeleteYearId(year.id)}
                          leftIcon={
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {year.subjects.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-500">
                        No subjects recorded for this year.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-semibold tracking-[0.1em] text-slate-500 uppercase">
                              <th className="py-2 pr-3 pl-4 font-semibold">
                                Subject
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                C.S. average
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                Action taken
                              </th>
                              <th className="px-3 py-2 font-semibold">
                                Credits
                              </th>
                              <th className="py-2 pr-4 pl-3 text-right font-semibold">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {year.subjects.map((subject) => (
                              <tr key={subject.id}>
                                <td className="py-2 pr-3 pl-4 font-medium text-slate-800">
                                  {subject.subject_name}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {subject.cs_average ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {subject.action_taken ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {subject.credits_earned ?? '—'}
                                </td>
                                <td className="py-2 pr-4 pl-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setSubjectDialog({
                                          open: true,
                                          schoolYearId: year.id,
                                          initial: subject,
                                        })
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                      onClick={() => setDeleteSubject(subject)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4 text-slate-400" aria-hidden="true" />
                  Digital documents
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {documentRows.length} document
                  {documentRows.length === 1 ? '' : 's'} attached to this record.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUploadOpen(true)}
                leftIcon={<Upload className="size-3.5" aria-hidden="true" />}
              >
                Upload scan
              </Button>
            </CardHeader>
            <CardContent className="pt-5">
              {documents.error ? (
                <Alert variant="danger" title="Documents unavailable">
                  {documents.error}
                </Alert>
              ) : documents.loading ? (
                <Skeleton className="h-24 rounded-lg" />
              ) : (
                <DocumentTable
                  documents={documentRows}
                  canVerify={canVerifyDocuments}
                  canDelete={canManageDocuments}
                  onChanged={() => {
                    documents.reload()
                    requests.reload()
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-slate-400" aria-hidden="true" />
                Physical locator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-mono text-sm font-semibold text-slate-900">
                  {record.physical_locator_code ?? 'Not assigned'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {record.physical_locator_code
                    ? 'The original records are filed at this locator.'
                    : 'Assign a storage location to support physical retrieval.'}
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setAssignOpen(true)}
                leftIcon={<MapPin className="size-4" aria-hidden="true" />}
              >
                {record.physical_locator_code
                  ? 'Change locator'
                  : 'Assign locator'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck
                  className="size-4 text-slate-400"
                  aria-hidden="true"
                />
                Record control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              <dl className="space-y-3">
                <DetailRow
                  label="Verification"
                  value={
                    <RecordStatusBadge status={record.verification_status} />
                  }
                />
                <DetailRow label="Encoded" value={formatDateTime(record.created_at)} />
                <DetailRow
                  label="Last updated"
                  value={formatDateTime(record.updated_at)}
                />
                {record.is_archived ? (
                  <DetailRow
                    label="Archived"
                    value={formatDateTime(record.archived_at)}
                  />
                ) : null}
              </dl>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                Archiving hides a record from default searches but never deletes
                it. Every change is written to the audit trail.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList
                  className="size-4 text-slate-400"
                  aria-hidden="true"
                />
                Retrieval requests
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {requests.error ? (
                <Alert variant="warning" title="Requests unavailable">
                  {requests.error}
                </Alert>
              ) : requests.loading ? (
                <Skeleton className="h-16 rounded-lg" />
              ) : requestRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No retrieval requests reference this record yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {requestRows.map((request) => (
                    <li
                      key={request.id}
                      className="rounded-lg border border-slate-200 px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[11px] text-slate-500">
                          {request.request_code}
                        </p>
                        <RequestStatusBadge status={request.status} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-slate-900">
                        {request.requester_name}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <RequestVerificationBadge
                          status={request.verification_status}
                        />
                        <span className="text-[11px] text-slate-500">
                          {formatDate(request.request_date)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to={`/requests?student=${record.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
              >
                View in Retrieval Requests
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {editOpen ? (
        <StudentFormDialog
          open
          mode="edit"
          student={record}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            reloadAll()
          }}
        />
      ) : null}

      {uploadOpen ? (
        <UploadDocumentDialog
          open
          studentId={record.id}
          studentLabel={`${record.full_name} · ${record.archive_id}`}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            documents.reload()
            requests.reload()
          }}
        />
      ) : null}

      {assignOpen ? (
        <AssignLocationDialog
          open
          studentId={record.id}
          studentName={record.full_name}
          currentLocationId={record.location_id}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            student.reload()
            requests.reload()
          }}
        />
      ) : null}

      {yearDialog.open ? (
        <SchoolYearDialog
          open
          studentId={record.id}
          initial={currentYear ?? null}
          onClose={() => setYearDialog({ open: false, initialId: null })}
          onSaved={() => years.reload()}
        />
      ) : null}

      {subjectDialog.open && subjectDialog.schoolYearId ? (
        <SubjectDialog
          open
          schoolYearId={subjectDialog.schoolYearId}
          initial={subjectDialog.initial}
          onClose={() =>
            setSubjectDialog({
              open: false,
              schoolYearId: null,
              initial: null,
            })
          }
          onSaved={() => years.reload()}
        />
      ) : null}

      {archiveOpen ? (
        <ConfirmDialog
          open
          onClose={() => setArchiveOpen(false)}
          onConfirm={() => void confirmArchive()}
          title={record.is_archived ? 'Restore record' : 'Archive record'}
          description={
            record.is_archived ? (
              <>
                <strong>{record.full_name}</strong> will return to the active
                archive. Nothing about the record changes.
              </>
            ) : (
              <>
                <strong>{record.full_name}</strong> will be hidden from default
                searches but preserved in full. It can be restored at any time.
              </>
            )
          }
          confirmLabel={record.is_archived ? 'Restore' : 'Archive'}
          tone={record.is_archived ? 'primary' : 'danger'}
          isLoading={archiving}
        />
      ) : null}

      {deleteYearId ? (
        <ConfirmDialog
          open
          onClose={() => setDeleteYearId(null)}
          onConfirm={() => void confirmDeleteYear()}
          title="Delete high school year"
          description="This removes the year entry and every subject recorded under it. The audit trail keeps a record of the deletion. This cannot be undone."
          confirmLabel="Delete year"
          tone="danger"
          isLoading={deleting}
        />
      ) : null}

      {deleteSubject ? (
        <ConfirmDialog
          open
          onClose={() => setDeleteSubject(null)}
          onConfirm={() => void confirmDeleteSubject()}
          title="Remove subject"
          description={
            <>
              <strong>{deleteSubject.subject_name}</strong> will be removed from
              this year entry. The audit trail keeps a record of the deletion.
            </>
          }
          confirmLabel="Remove subject"
          tone="danger"
          isLoading={deleting}
        />
      ) : null}
    </div>
  )
}
