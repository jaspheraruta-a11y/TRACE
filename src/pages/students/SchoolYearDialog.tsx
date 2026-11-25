import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import {
  createSchoolYear,
  updateSchoolYear,
} from '@/lib/archive/academic'
import type { SchoolYearRow } from '@/lib/supabase/database.types'

interface SchoolYearDialogProps {
  open: boolean
  studentId: string
  initial?: SchoolYearRow | null
  onClose: () => void
  onSaved: () => void
}

interface FormValues {
  yearLevel: string
  schoolYear: string
  schoolAttended: string
  curriculumYear: string
  totalDaysSchool: string
  totalDaysPresent: string
  remarks: string
  sortOrder: string
}

function valuesFrom(initial: SchoolYearRow | null | undefined): FormValues {
  return {
    yearLevel: initial?.year_level ?? '',
    schoolYear: initial?.school_year ?? '',
    schoolAttended: initial?.school_attended ?? '',
    curriculumYear: initial?.curriculum_year ?? '',
    totalDaysSchool:
      initial?.total_days_school === null || initial?.total_days_school === undefined
        ? ''
        : String(initial.total_days_school),
    totalDaysPresent:
      initial?.total_days_present === null ||
      initial?.total_days_present === undefined
        ? ''
        : String(initial.total_days_present),
    remarks: initial?.remarks ?? '',
    sortOrder: initial ? String(initial.sort_order) : '0',
  }
}

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function SchoolYearDialog({
  open,
  studentId,
  initial,
  onClose,
  onSaved,
}: SchoolYearDialogProps) {
  const [values, setValues] = useState<FormValues>(() => valuesFrom(initial))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(valuesFrom(initial))
    setError(null)
  }, [open, initial])

  const update = <Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }))

  const save = async () => {
    setError(null)
    if (!values.yearLevel.trim()) {
      setError('Enter the year level exactly as the original record shows it.')
      return
    }

    const daysSchool = optionalInt(values.totalDaysSchool)
    const daysPresent = optionalInt(values.totalDaysPresent)
    if (
      (daysSchool !== null && (daysSchool < 0 || daysSchool > 400)) ||
      (daysPresent !== null && (daysPresent < 0 || daysPresent > 400))
    ) {
      setError('Attendance days must be between 0 and 400.')
      return
    }

    const sortOrder = optionalInt(values.sortOrder) ?? 0
    const payload = {
      student_id: studentId,
      year_level: values.yearLevel.trim(),
      school_year: optionalText(values.schoolYear),
      school_attended: optionalText(values.schoolAttended),
      curriculum_year: optionalText(values.curriculumYear),
      total_days_school: daysSchool,
      total_days_present: daysPresent,
      remarks: optionalText(values.remarks),
      sort_order: sortOrder,
    }

    setSaving(true)
    try {
      if (initial) {
        await updateSchoolYear(initial.id, payload)
        toast.success('High school year updated.')
      } else {
        await createSchoolYear(payload)
        toast.success('High school year added.')
      }
      onSaved()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The year entry could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit high school year' : 'Add high school year'}
      description="Year levels are free text so historical labels are preserved exactly as written."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            isLoading={saving}
            leftIcon={<Save className="size-4" aria-hidden="true" />}
          >
            {initial ? 'Save year' : 'Add year'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <Alert variant="danger" title="Year not saved">
            {error}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="year-level"
            label="Year level"
            hint="For example, First Year, Second Year, or Grade 8."
            required
          >
            <Input
              id="year-level"
              value={values.yearLevel}
              maxLength={80}
              onChange={(event) => update('yearLevel', event.target.value)}
            />
          </FormField>
          <FormField id="school-year" label="School year">
            <Input
              id="school-year"
              value={values.schoolYear}
              maxLength={40}
              placeholder="e.g. 1994-1995"
              onChange={(event) => update('schoolYear', event.target.value)}
            />
          </FormField>
          <FormField id="school-attended" label="School attended">
            <Input
              id="school-attended"
              value={values.schoolAttended}
              onChange={(event) => update('schoolAttended', event.target.value)}
            />
          </FormField>
          <FormField id="curriculum-year" label="Curriculum year">
            <Input
              id="curriculum-year"
              value={values.curriculumYear}
              onChange={(event) => update('curriculumYear', event.target.value)}
            />
          </FormField>
          <FormField id="days-school" label="Total school days">
            <Input
              id="days-school"
              inputMode="numeric"
              value={values.totalDaysSchool}
              onChange={(event) => update('totalDaysSchool', event.target.value)}
            />
          </FormField>
          <FormField id="days-present" label="Total days present">
            <Input
              id="days-present"
              inputMode="numeric"
              value={values.totalDaysPresent}
              onChange={(event) => update('totalDaysPresent', event.target.value)}
            />
          </FormField>
          <FormField
            id="sort-order"
            label="Display order"
            hint="Lower numbers appear first."
          >
            <Input
              id="sort-order"
              inputMode="numeric"
              value={values.sortOrder}
              onChange={(event) => update('sortOrder', event.target.value)}
            />
          </FormField>
        </div>

        <FormField id="year-remarks" label="Remarks">
          <textarea
            id="year-remarks"
            value={values.remarks}
            rows={3}
            onChange={(event) => update('remarks', event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
          />
        </FormField>
      </div>
    </Dialog>
  )
}
