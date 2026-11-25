import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Save, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { RECORD_STATUS_LABELS } from '@/lib/archive/labels'
import {
  createStudent,
  findStudentDuplicates,
  updateStudent,
  type DuplicateCandidate,
} from '@/lib/archive/students'
import type {
  RecordVerificationStatus,
  StudentInsert,
  StudentRow,
  StudentUpdate,
} from '@/lib/supabase/database.types'
import { formatDate } from '@/lib/utils'

interface StudentFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  student?: StudentRow | null
  onClose: () => void
  onSaved: (student: StudentRow) => void
}

interface FormValues {
  lastName: string
  firstName: string
  middleName: string
  extensionName: string
  dateOfBirth: string
  birthProvince: string
  birthTown: string
  birthBarangay: string
  guardianName: string
  guardianOccupation: string
  guardianAddress: string
  intermediateSchool: string
  intermediateYear: string
  intermediateAverage: string
  elementaryYears: string
  remarks: string
  verificationStatus: RecordVerificationStatus
}

function emptyValues(): FormValues {
  return {
    lastName: '',
    firstName: '',
    middleName: '',
    extensionName: '',
    dateOfBirth: '',
    birthProvince: '',
    birthTown: '',
    birthBarangay: '',
    guardianName: '',
    guardianOccupation: '',
    guardianAddress: '',
    intermediateSchool: '',
    intermediateYear: '',
    intermediateAverage: '',
    elementaryYears: '',
    remarks: '',
    verificationStatus: 'unverified',
  }
}

function valuesFromStudent(student: StudentRow): FormValues {
  return {
    lastName: student.last_name,
    firstName: student.first_name,
    middleName: student.middle_name ?? '',
    extensionName: student.extension_name ?? '',
    dateOfBirth: student.date_of_birth ?? '',
    birthProvince: student.birth_province ?? '',
    birthTown: student.birth_town ?? '',
    birthBarangay: student.birth_barangay ?? '',
    guardianName: student.parent_guardian_name ?? '',
    guardianOccupation: student.parent_guardian_occupation ?? '',
    guardianAddress: student.parent_guardian_address ?? '',
    intermediateSchool: student.intermediate_school ?? '',
    intermediateYear:
      student.intermediate_year_completed === null
        ? ''
        : String(student.intermediate_year_completed),
    intermediateAverage:
      student.intermediate_general_average === null
        ? ''
        : String(student.intermediate_general_average),
    elementaryYears:
      student.elementary_years === null ? '' : String(student.elementary_years),
    remarks: student.remarks ?? '',
    verificationStatus: student.verification_status,
  }
}

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function StudentFormDialog({
  open,
  mode,
  student,
  onClose,
  onSaved,
}: StudentFormDialogProps) {
  const initial = useMemo(
    () => (mode === 'edit' && student ? valuesFromStudent(student) : emptyValues()),
    [mode, student],
  )
  const [values, setValues] = useState<FormValues>(initial)
  const [formError, setFormError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValues(initial)
    setFormError(null)
    setDuplicates([])
  }, [initial, open])

  const update = <Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const buildPayload = (): StudentInsert | StudentUpdate | null => {
    if (!values.lastName.trim() || !values.firstName.trim()) {
      setFormError('Last name and first name are required.')
      return null
    }

    if (values.dateOfBirth) {
      const birth = new Date(`${values.dateOfBirth}T00:00:00`)
      if (Number.isNaN(birth.getTime()) || birth > new Date()) {
        setFormError('Date of birth cannot be in the future.')
        return null
      }
    }

    const intermediateYear = optionalNumber(values.intermediateYear)
    if (
      intermediateYear !== null &&
      (intermediateYear < 1900 || intermediateYear > 2100)
    ) {
      setFormError('Intermediate completion year must be between 1900 and 2100.')
      return null
    }

    const average = optionalNumber(values.intermediateAverage)
    if (average !== null && (average < 0 || average > 100)) {
      setFormError('General average must be between 0 and 100.')
      return null
    }

    const elementaryYears = optionalNumber(values.elementaryYears)
    if (
      elementaryYears !== null &&
      (elementaryYears < 0 || elementaryYears > 20)
    ) {
      setFormError('Elementary years must be between 0 and 20.')
      return null
    }

    const payload: StudentUpdate = {
      last_name: values.lastName.trim(),
      first_name: values.firstName.trim(),
      middle_name: optionalText(values.middleName),
      extension_name: optionalText(values.extensionName),
      date_of_birth: values.dateOfBirth || null,
      birth_province: optionalText(values.birthProvince),
      birth_town: optionalText(values.birthTown),
      birth_barangay: optionalText(values.birthBarangay),
      parent_guardian_name: optionalText(values.guardianName),
      parent_guardian_occupation: optionalText(values.guardianOccupation),
      parent_guardian_address: optionalText(values.guardianAddress),
      intermediate_school: optionalText(values.intermediateSchool),
      intermediate_year_completed: intermediateYear,
      intermediate_general_average: average,
      elementary_years: elementaryYears,
      remarks: optionalText(values.remarks),
      verification_status: values.verificationStatus,
    }

    return payload
  }

  const save = async (confirmedDuplicate: boolean) => {
    setFormError(null)
    const payload = buildPayload()
    if (!payload) return

    setSaving(true)
    try {
      if (mode === 'create' && !confirmedDuplicate) {
        const candidates = await findStudentDuplicates({
          lastName: values.lastName,
          firstName: values.firstName,
          dateOfBirth: values.dateOfBirth || null,
        })

        if (candidates.length > 0) {
          setDuplicates(candidates)
          setSaving(false)
          return
        }
      }

      const saved =
        mode === 'edit' && student
          ? await updateStudent(student.id, payload)
          : await createStudent(payload as StudentInsert)

      toast.success(
        mode === 'edit'
          ? 'Student record updated.'
          : `Student record ${saved.archive_id} created.`,
      )
      onSaved(saved)
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'The record could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit student record' : 'Add student record'}
      description={
        mode === 'edit'
          ? 'Update the historical information. Blank fields stay blank.'
          : 'Historical details are optional. TRACE never invents missing data.'
      }
      className="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={saving}
            onClick={() => void save(false)}
            leftIcon={
              mode === 'edit' ? (
                <Save className="size-4" aria-hidden="true" />
              ) : (
                <UserPlus className="size-4" aria-hidden="true" />
              )
            }
          >
            {mode === 'edit' ? 'Save changes' : 'Check and save'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {formError ? (
          <Alert variant="danger" title="Record not saved">
            {formError}
          </Alert>
        ) : null}

        {duplicates.length > 0 ? (
          <Alert variant="warning" title="Possible duplicate records">
            <p>
              Review these existing records before adding another one. If this is
              a different student, you can still save.
            </p>
            <ul className="mt-3 space-y-2">
              {duplicates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="rounded-md border border-amber-200 bg-white/70 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {candidate.full_name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {candidate.archive_id}
                    {candidate.date_of_birth
                      ? ` · born ${formatDate(candidate.date_of_birth)}`
                      : ''}
                    {candidate.is_archived ? ' · archived' : ''}
                  </p>
                </li>
              ))}
            </ul>
            <Button
              variant="danger"
              size="sm"
              className="mt-3"
              onClick={() => void save(true)}
              isLoading={saving}
              leftIcon={<AlertTriangle className="size-3.5" aria-hidden="true" />}
            >
              Save anyway
            </Button>
          </Alert>
        ) : null}

        {mode === 'edit' && student ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Archive ID
              </p>
              <p className="mt-0.5 font-mono text-sm text-slate-800">
                {student.archive_id}
              </p>
            </div>
            <div className="w-full sm:w-52">
              <FormField id="edit-verification" label="Verification status">
                <Select
                  id="edit-verification"
                  value={values.verificationStatus}
                  onChange={(event) =>
                    update(
                      'verificationStatus',
                      event.target.value as RecordVerificationStatus,
                    )
                  }
                >
                  {(
                    Object.keys(RECORD_STATUS_LABELS) as RecordVerificationStatus[]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {RECORD_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-900">
            An archive ID such as <strong>TRC-2026-00001</strong> is assigned
            automatically after saving.
          </p>
        )}

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-900">
            Name and identity
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="student-last-name" label="Last name" required>
              <Input
                id="student-last-name"
                value={values.lastName}
                onChange={(event) => update('lastName', event.target.value)}
                autoComplete="family-name"
              />
            </FormField>
            <FormField id="student-first-name" label="First name" required>
              <Input
                id="student-first-name"
                value={values.firstName}
                onChange={(event) => update('firstName', event.target.value)}
                autoComplete="given-name"
              />
            </FormField>
            <FormField id="student-middle-name" label="Middle name">
              <Input
                id="student-middle-name"
                value={values.middleName}
                onChange={(event) => update('middleName', event.target.value)}
                autoComplete="additional-name"
              />
            </FormField>
            <FormField
              id="student-extension"
              label="Extension name"
              hint="For example Jr., Sr., or III."
            >
              <Input
                id="student-extension"
                value={values.extensionName}
                onChange={(event) => update('extensionName', event.target.value)}
              />
            </FormField>
            <FormField id="student-dob" label="Date of birth">
              <Input
                id="student-dob"
                type="date"
                value={values.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => update('dateOfBirth', event.target.value)}
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-900">
            Birth place
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="student-birth-province" label="Province">
              <Input
                id="student-birth-province"
                value={values.birthProvince}
                onChange={(event) => update('birthProvince', event.target.value)}
              />
            </FormField>
            <FormField id="student-birth-town" label="Town or city">
              <Input
                id="student-birth-town"
                value={values.birthTown}
                onChange={(event) => update('birthTown', event.target.value)}
              />
            </FormField>
            <FormField id="student-birth-barangay" label="Barangay">
              <Input
                id="student-birth-barangay"
                value={values.birthBarangay}
                onChange={(event) => update('birthBarangay', event.target.value)}
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-900">
            Parent or guardian
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="student-guardian" label="Name">
              <Input
                id="student-guardian"
                value={values.guardianName}
                onChange={(event) => update('guardianName', event.target.value)}
              />
            </FormField>
            <FormField id="student-guardian-occupation" label="Occupation">
              <Input
                id="student-guardian-occupation"
                value={values.guardianOccupation}
                onChange={(event) =>
                  update('guardianOccupation', event.target.value)
                }
              />
            </FormField>
          </div>
          <FormField id="student-guardian-address" label="Address">
            <Input
              id="student-guardian-address"
              value={values.guardianAddress}
              onChange={(event) => update('guardianAddress', event.target.value)}
            />
          </FormField>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-slate-900">
            Elementary and intermediate history
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="student-intermediate-school" label="Intermediate school">
              <Input
                id="student-intermediate-school"
                value={values.intermediateSchool}
                onChange={(event) =>
                  update('intermediateSchool', event.target.value)
                }
              />
            </FormField>
            <FormField
              id="student-intermediate-year"
              label="Year completed"
              hint="Four-digit year, if known."
            >
              <Input
                id="student-intermediate-year"
                inputMode="numeric"
                value={values.intermediateYear}
                onChange={(event) =>
                  update('intermediateYear', event.target.value)
                }
              />
            </FormField>
            <FormField id="student-intermediate-average" label="General average">
              <Input
                id="student-intermediate-average"
                inputMode="decimal"
                value={values.intermediateAverage}
                onChange={(event) =>
                  update('intermediateAverage', event.target.value)
                }
              />
            </FormField>
            <FormField id="student-elementary-years" label="Elementary years">
              <Input
                id="student-elementary-years"
                inputMode="numeric"
                value={values.elementaryYears}
                onChange={(event) =>
                  update('elementaryYears', event.target.value)
                }
              />
            </FormField>
          </div>
        </fieldset>

        <FormField
          id="student-remarks"
          label="Remarks"
          hint="Record only what the original documents actually show."
        >
          <textarea
            id="student-remarks"
            value={values.remarks}
            onChange={(event) => update('remarks', event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
          />
        </FormField>
      </div>
    </Dialog>
  )
}
