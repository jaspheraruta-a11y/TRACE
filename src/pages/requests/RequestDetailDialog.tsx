import { useState, type ReactNode } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Clock3,
  History,
  Link2,
  Pencil,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  RequestStatusBadge,
  RequestVerificationBadge,
} from '@/components/archive/StatusBadges'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  REQUEST_STATUS_LABELS,
  REQUEST_TERMINAL_STATUSES,
  REQUEST_VERIFICATION_LABELS,
  REQUEST_WORKFLOW_ORDER,
} from '@/lib/archive/labels'
import {
  listRequestEvents,
  setRequestStatus,
  setRequestVerification,
  type RequestWithRelations,
} from '@/lib/archive/requests'
import type {
  RequestStatus,
  RequestVerificationStatus,
} from '@/lib/supabase/database.types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { RequestFormDialog } from '@/pages/requests/RequestFormDialog'

interface RequestDetailDialogProps {
  open: boolean
  request: RequestWithRelations
  onClose: () => void
  onChanged: () => void
}

function Field({ label, value }: { label: string; value: ReactNode }) {
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

export function RequestDetailDialog({
  open,
  request,
  onClose,
  onChanged,
}: RequestDetailDialogProps) {
  const { hasRole } = useAuth()
  const canVerify = hasRole('administrator', 'registrar')
  const canRelease = hasRole('administrator', 'registrar')

  const events = useAsyncData(() => listRequestEvents(request.id), [request.id])
  const [nextStatus, setNextStatus] = useState<RequestStatus | ''>('')
  const [statusNote, setStatusNote] = useState('')
  const [verificationNote, setVerificationNote] = useState('')
  const [busy, setBusy] = useState<'status' | 'verification' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const terminal = REQUEST_TERMINAL_STATUSES.includes(request.status)
  const statusOptions = REQUEST_WORKFLOW_ORDER.filter(
    (status) => status !== request.status,
  )

  const applyStatus = async () => {
    if (!nextStatus) {
      setError('Select the next workflow status.')
      return
    }
    if (nextStatus === 'released' || nextStatus === 'completed') {
      if (!canRelease) {
        setError('Only a Registrar or Administrator can release a record.')
        return
      }
      if (request.verification_status !== 'verified') {
        setError('Verify the requester before releasing the record.')
        return
      }
    }

    setBusy('status')
    setError(null)
    try {
      await setRequestStatus(request.id, nextStatus, statusNote)
      toast.success(`Request moved to ${REQUEST_STATUS_LABELS[nextStatus]}.`)
      setNextStatus('')
      setStatusNote('')
      onChanged()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The status could not be updated.',
      )
    } finally {
      setBusy(null)
    }
  }

  const applyVerification = async (status: RequestVerificationStatus) => {
    setBusy('verification')
    setError(null)
    try {
      await setRequestVerification(request.id, status, verificationNote)
      toast.success(`Requester marked as ${REQUEST_VERIFICATION_LABELS[status]}.`)
      setVerificationNote('')
      onChanged()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The verification could not be updated.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={`Request ${request.request_code}`}
        description={`${request.requester_name} · ${request.requester_type}`}
        className="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => setEditOpen(true)}
              leftIcon={<Pencil className="size-4" aria-hidden="true" />}
            >
              Edit details
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {error ? (
            <Alert variant="danger" title="Action not completed">
              {error}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <RequestVerificationBadge status={request.verification_status} />
            {request.release_date ? (
              <span className="text-xs text-slate-500">
                Released {formatDate(request.release_date)}
              </span>
            ) : null}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Requester" value={request.requester_name} />
            <Field label="Requester type" value={request.requester_type} />
            <Field label="Relationship" value={request.relationship} />
            <Field label="Contact" value={request.contact_info} />
            <Field
              label="Student record"
              value={
                request.student ? (
                  <Link
                    to={`/students/${request.student.id}`}
                    className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                  >
                    <Link2 className="size-3" aria-hidden="true" />
                    {request.student.full_name}
                    <span className="font-mono text-[10px] text-slate-500">
                      {request.student.archive_id}
                    </span>
                  </Link>
                ) : (
                  'Not identified'
                )
              }
            />
            <Field
              label="Assigned to"
              value={request.assignee?.full_name ?? 'Unassigned'}
            />
            <Field
              label="Request date"
              value={
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3 text-slate-400" aria-hidden="true" />
                  {formatDate(request.request_date)}
                </span>
              }
            />
            <Field
              label="Verified by"
              value={
                request.verified_at
                  ? formatDateTime(request.verified_at)
                  : 'Not verified'
              }
            />
            <Field
              label="Last updated"
              value={formatDateTime(request.updated_at)}
            />
          </dl>

          {request.purpose ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Purpose
              </p>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-700">
                {request.purpose}
              </p>
            </div>
          ) : null}

          {request.remarks ? (
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Remarks
              </p>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-700">
                {request.remarks}
              </p>
            </div>
          ) : null}

          {request.release_details ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-emerald-700 uppercase">
                Release details
              </p>
              <p className="mt-1 text-sm whitespace-pre-line text-emerald-900">
                {request.release_details}
              </p>
            </div>
          ) : null}

          {!terminal ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="size-4 text-slate-400" aria-hidden="true" />
                  Requester verification
                </p>
                {canVerify ? (
                  <>
                    <FormField
                      id="verification-note"
                      label="Verification note"
                      hint="Record what was checked. The note is appended to remarks."
                    >
                      <textarea
                        id="verification-note"
                        value={verificationNote}
                        rows={2}
                        maxLength={2000}
                        onChange={(event) =>
                          setVerificationNote(event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
                      />
                    </FormField>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={busy === 'verification'}
                        disabled={
                          request.verification_status === 'verified' ||
                          busy === 'verification'
                        }
                        onClick={() => void applyVerification('verified')}
                        leftIcon={
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        }
                      >
                        Verify
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={
                          request.verification_status === 'rejected' ||
                          busy === 'verification'
                        }
                        onClick={() => void applyVerification('rejected')}
                        leftIcon={
                          <XCircle className="size-3.5" aria-hidden="true" />
                        }
                      >
                        Reject
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          request.verification_status === 'unverified' ||
                          busy === 'verification'
                        }
                        onClick={() => void applyVerification('unverified')}
                        leftIcon={
                          <CircleSlash className="size-3.5" aria-hidden="true" />
                        }
                      >
                        Reset
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Only a Registrar or Administrator can verify a requester.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Clock3 className="size-4 text-slate-400" aria-hidden="true" />
                  Advance the workflow
                </p>
                <FormField id="next-status" label="Next status">
                  <Select
                    id="next-status"
                    value={nextStatus}
                    onChange={(event) =>
                      setNextStatus(event.target.value as RequestStatus | '')
                    }
                  >
                    <option value="">Select a status</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {REQUEST_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField
                  id="status-note"
                  label="Status note"
                  hint="Required context for release or unavailability decisions."
                >
                  <textarea
                    id="status-note"
                    value={statusNote}
                    rows={2}
                    maxLength={2000}
                    onChange={(event) => setStatusNote(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
                  />
                </FormField>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  isLoading={busy === 'status'}
                  disabled={!nextStatus || busy === 'status'}
                  onClick={() => void applyStatus()}
                  leftIcon={<History className="size-3.5" aria-hidden="true" />}
                >
                  Apply status
                </Button>
              </div>
            </div>
          ) : (
            <Alert variant="info" title="Workflow closed">
              This request is {REQUEST_STATUS_LABELS[request.status].toLowerCase()}.
              Its history remains available below.
            </Alert>
          )}

          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <History className="size-4 text-slate-400" aria-hidden="true" />
              Event history
            </p>
            {events.error ? (
              <Alert variant="warning" title="History unavailable" className="mt-2">
                {events.error}
              </Alert>
            ) : events.loading ? (
              <Skeleton className="mt-2 h-24 rounded-lg" />
            ) : (events.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No events recorded yet.
              </p>
            ) : (
              <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">
                {(events.data ?? []).map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-white bg-brand-400"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-slate-800">
                      {event.note ??
                        event.event_type.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>{formatDateTime(event.created_at)}</span>
                      {event.to_status ? (
                        <RequestStatusBadge status={event.to_status} />
                      ) : null}
                      {event.actor_id ? (
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="size-3" aria-hidden="true" />
                          Staff action
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Dialog>

      {editOpen ? (
        <RequestFormDialog
          open
          initial={request}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            onChanged()
          }}
        />
      ) : null}
    </>
  )
}
