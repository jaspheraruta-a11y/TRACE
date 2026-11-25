import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { createSubject, updateSubject } from '@/lib/archive/academic'
import type { SubjectRow } from '@/lib/supabase/database.types'

interface SubjectDialogProps {
  open: boolean
  schoolYearId: string
  initial?: SubjectRow | null
  onClose: () => void
  onSaved: () => void
}

interface FormValues {
  subjectName: string
  csAverage: string
  actionTaken: string
  creditsEarned: string
  sortOrder: string
}

function valuesFrom(initial: SubjectRow | null | undefined): FormValues {
  return {
    subjectName: initial?.subject_name ?? '',
    csAverage:
      initial?.cs_average === null || initial?.cs_average === undefined
        ? ''
        : String(initial.cs_average),
    actionTaken: initial?.action_taken ?? '',
    creditsEarned:
      initial?.credits_earned === null || initial?.credits_earned === undefined
        ? ''
        : String(initial.credits_earned),
    sortOrder: initial ? String(initial.sort_order) : '0',
  }
}

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function optionalDecimal(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function SubjectDialog({
  open,
  schoolYearId,
  initial,
  onClose,
  onSaved,
}: SubjectDialogProps) {
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
    if (!values.subjectName.trim()) {
      setError('Enter the subject name exactly as the original record shows it.')
      return
    }

    const average = optionalDecimal(values.csAverage)
    if (average !== null && (average < 0 || average > 100)) {
      setError('C.S. average must be between 0 and 100.')
      return
    }

    const credits = optionalDecimal(values.creditsEarned)
    if (credits !== null && (credits < 0 || credits > 100)) {
      setError('Credits earned must be between 0 and 100.')
      return
    }

    const payload = {
      school_year_id: schoolYearId,
      subject_name: values.subjectName.trim(),
      cs_average: average,
      action_taken: optionalText(values.actionTaken),
      credits_earned: credits,
      sort_order: optionalDecimal(values.sortOrder) ?? 0,
    }

    setSaving(true)
    try {
      if (initial) {
        await updateSubject(initial.id, payload)
        toast.success('Subject updated.')
      } else {
        await createSubject(payload)
        toast.success('Subject added.')
      }
      onSaved()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The subject could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit subject' : 'Add subject'}
      description="Action-taken values are stored as free text so historical wording is preserved."
      className="max-w-xl"
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
            {initial ? 'Save subject' : 'Add subject'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <Alert variant="danger" title="Subject not saved">
            {error}
          </Alert>
        ) : null}

        <FormField id="subject-name" label="Subject" required>
          <Input
            id="subject-name"
            value={values.subjectName}
            maxLength={160}
            onChange={(event) => update('subjectName', event.target.value)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="subject-average" label="C.S. average">
            <Input
              id="subject-average"
              inputMode="decimal"
              value={values.csAverage}
              onChange={(event) => update('csAverage', event.target.value)}
            />
          </FormField>
          <FormField id="subject-credits" label="Credits earned">
            <Input
              id="subject-credits"
              inputMode="decimal"
              value={values.creditsEarned}
              onChange={(event) => update('creditsEarned', event.target.value)}
            />
          </FormField>
          <FormField
            id="subject-action"
            label="Action taken"
            hint="Free text, for example Passed or Failed."
          >
            <Input
              id="subject-action"
              value={values.actionTaken}
              maxLength={160}
              onChange={(event) => update('actionTaken', event.target.value)}
            />
          </FormField>
          <FormField id="subject-order" label="Display order">
            <Input
              id="subject-order"
              inputMode="numeric"
              value={values.sortOrder}
              onChange={(event) => update('sortOrder', event.target.value)}
            />
          </FormField>
        </div>
      </div>
    </Dialog>
  )
}
