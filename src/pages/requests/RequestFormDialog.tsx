import { useEffect, useState } from 'react'
import { Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { StudentPicker, type PickedStudent } from '@/components/archive/StudentPicker'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { REQUEST_TYPE_OPTIONS } from '@/lib/archive/labels'
import {
  createRequest,
  listActiveStaff,
  updateRequest,
  type ActiveStaffOption,
  type RequestWithRelations,
} from '@/lib/archive/requests'

interface RequestFormDialogProps {
  open: boolean
  initial?: RequestWithRelations | null
  defaultStudent?: PickedStudent | null
  onClose: () => void
  onSaved: () => void
}

interface FormValues {
  requesterName: string
  requesterType: string
  relationship: string
  contactInfo: string
  purpose: string
  assignedTo: string
  remarks: string
}

function valuesFrom(initial: RequestWithRelations | null | undefined): FormValues {
  return {
    requesterName: initial?.requester_name ?? '',
    requesterType: initial?.requester_type ?? REQUEST_TYPE_OPTIONS[0],
    relationship: initial?.relationship ?? '',
    contactInfo: initial?.contact_info ?? '',
    purpose: initial?.purpose ?? '',
    assignedTo: initial?.assigned_to ?? '',
    remarks: initial?.remarks ?? '',
  }
}

function toPickedStudent(
  request: RequestWithRelations | null | undefined,
): PickedStudent | null {
  if (!request?.student) return null
  return {
    id: request.student.id,
    full_name: request.student.full_name,
    archive_id: request.student.archive_id,
  }
}

export function RequestFormDialog({
  open,
  initial,
  defaultStudent,
  onClose,
  onSaved,
}: RequestFormDialogProps) {
  const [values, setValues] = useState<FormValues>(() => valuesFrom(initial))
  const [student, setStudent] = useState<PickedStudent | null>(
    () => toPickedStudent(initial) ?? defaultStudent ?? null,
  )
  const [staff, setStaff] = useState<ActiveStaffOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(valuesFrom(initial))
    setStudent(toPickedStudent(initial) ?? defaultStudent ?? null)
    setError(null)

    let active = true
    void listActiveStaff()
      .then((rows) => {
        if (active) setStaff(rows)
      })
      .catch(() => {
        if (active) setStaff([])
      })

    return () => {
      active = false
    }
  }, [open, initial, defaultStudent])

  const update = <Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }))

  const save = async () => {
    setError(null)
    if (values.requesterName.trim().length < 2) {
      setError('Enter the requester’s full name.')
      return
    }
    if (!values.requesterType.trim()) {
      setError('Select the requester type.')
      return
    }

    setSaving(true)
    try {
      if (initial) {
        await updateRequest({
          requestId: initial.id,
          requesterName: values.requesterName,
          requesterType: values.requesterType,
          studentId: student?.id ?? null,
          relationship: values.relationship,
          contactInfo: values.contactInfo,
          purpose: values.purpose,
          assignedTo: values.assignedTo || null,
          remarks: values.remarks,
        })
        toast.success('Retrieval request updated.')
      } else {
        await createRequest({
          requesterName: values.requesterName,
          requesterType: values.requesterType,
          studentId: student?.id ?? null,
          relationship: values.relationship,
          contactInfo: values.contactInfo,
          purpose: values.purpose,
          assignedTo: values.assignedTo || null,
        })
        toast.success('Retrieval request created.')
      }
      onSaved()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The request could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit retrieval request' : 'New retrieval request'}
      description="Record who is asking, what they need, and how their authority was established."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            isLoading={saving}
            leftIcon={
              initial ? (
                <Save className="size-4" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )
            }
          >
            {initial ? 'Save request' : 'Create request'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <Alert variant="danger" title="Request not saved">
            {error}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="requester-name" label="Requester name" required>
            <Input
              id="requester-name"
              value={values.requesterName}
              maxLength={160}
              onChange={(event) => update('requesterName', event.target.value)}
            />
          </FormField>
          <FormField id="requester-type" label="Requester type" required>
            <Select
              id="requester-type"
              value={values.requesterType}
              onChange={(event) => update('requesterType', event.target.value)}
            >
              {REQUEST_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id="requester-relationship"
            label="Relationship to the student"
            hint="For example, mother, guardian, or authorized representative."
          >
            <Input
              id="requester-relationship"
              value={values.relationship}
              maxLength={160}
              onChange={(event) => update('relationship', event.target.value)}
            />
          </FormField>
          <FormField id="requester-contact" label="Contact information">
            <Input
              id="requester-contact"
              value={values.contactInfo}
              maxLength={500}
              onChange={(event) => update('contactInfo', event.target.value)}
            />
          </FormField>
        </div>

        <StudentPicker
          value={student}
          onChange={(selected) => setStudent(selected)}
          label="Student record requested"
          hint="Leave blank if the student has not been identified yet."
        />

        <FormField id="request-purpose" label="Purpose of the request">
          <textarea
            id="request-purpose"
            value={values.purpose}
            rows={2}
            maxLength={2000}
            onChange={(event) => update('purpose', event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
          />
        </FormField>

        <FormField id="request-assignee" label="Assigned staff member">
          <Select
            id="request-assignee"
            value={values.assignedTo}
            onChange={(event) => update('assignedTo', event.target.value)}
          >
            <option value="">Unassigned</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </Select>
        </FormField>

        {initial ? (
          <FormField id="request-remarks" label="Remarks">
            <textarea
              id="request-remarks"
              value={values.remarks}
              rows={2}
              maxLength={2000}
              onChange={(event) => update('remarks', event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
            />
          </FormField>
        ) : null}
      </div>
    </Dialog>
  )
}
