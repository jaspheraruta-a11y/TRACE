import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createLocation, updateLocation } from '@/lib/archive/inventory'
import {
  ARCHIVE_CATEGORY_OPTIONS,
  DIGITIZATION_LABELS,
} from '@/lib/archive/labels'
import type {
  ArchiveLocationRow,
  DigitizationStatus,
} from '@/lib/supabase/database.types'

interface LocationFormDialogProps {
  open: boolean
  initial?: EditableLocation | null
  onClose: () => void
  onSaved: () => void
}

type EditableLocation = Pick<
  ArchiveLocationRow,
  | 'id'
  | 'locator_code'
  | 'archive_category'
  | 'room'
  | 'cabinet'
  | 'shelf'
  | 'box_code'
  | 'folder_code'
  | 'digitization_status'
  | 'condition_notes'
>

interface FormValues {
  locatorCode: string
  archiveCategory: string
  room: string
  cabinet: string
  shelf: string
  boxCode: string
  folderCode: string
  digitizationStatus: DigitizationStatus
  conditionNotes: string
}

function valuesFrom(initial: EditableLocation | null | undefined): FormValues {
  return {
    locatorCode: initial?.locator_code ?? '',
    archiveCategory: initial?.archive_category ?? ARCHIVE_CATEGORY_OPTIONS[0],
    room: initial?.room ?? '',
    cabinet: initial?.cabinet ?? '',
    shelf: initial?.shelf ?? '',
    boxCode: initial?.box_code ?? '',
    folderCode: initial?.folder_code ?? '',
    digitizationStatus: initial?.digitization_status ?? 'not_started',
    conditionNotes: initial?.condition_notes ?? '',
  }
}

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function LocationFormDialog({
  open,
  initial,
  onClose,
  onSaved,
}: LocationFormDialogProps) {
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
    const locator = values.locatorCode.trim().toUpperCase()
    if (!locator) {
      setError('Enter a locator code, for example R1-C2-S3-B04-F02.')
      return
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{1,79}$/.test(locator)) {
      setError(
        'Locator codes may contain letters, numbers, dots, underscores, slashes, and hyphens.',
      )
      return
    }
    if (!values.archiveCategory.trim()) {
      setError('Select an archive category.')
      return
    }

    const payload = {
      locator_code: locator,
      archive_category: values.archiveCategory.trim(),
      room: optionalText(values.room),
      cabinet: optionalText(values.cabinet),
      shelf: optionalText(values.shelf),
      box_code: optionalText(values.boxCode),
      folder_code: optionalText(values.folderCode),
      digitization_status: values.digitizationStatus,
      condition_notes: optionalText(values.conditionNotes),
    }

    setSaving(true)
    try {
      if (initial) {
        await updateLocation(initial.id, payload)
        toast.success('Storage location updated.')
      } else {
        await createLocation(payload)
        toast.success('Storage location created.')
      }
      onSaved()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The location could not be saved.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit storage location' : 'New storage location'}
      description="Locator codes are unique and are printed on the physical label. Renaming a locator updates every linked student record."
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
            {initial ? 'Save location' : 'Create location'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <Alert variant="danger" title="Location not saved">
            {error}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="locator-code"
            label="Locator code"
            hint="Stored in uppercase, for example R1-C2-S3-B04-F02."
            required
          >
            <Input
              id="locator-code"
              value={values.locatorCode}
              maxLength={80}
              className="font-mono uppercase"
              onChange={(event) => update('locatorCode', event.target.value)}
            />
          </FormField>
          <FormField id="archive-category" label="Archive category" required>
            <Select
              id="archive-category"
              value={values.archiveCategory}
              onChange={(event) => update('archiveCategory', event.target.value)}
            >
              {ARCHIVE_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="room" label="Room">
            <Input
              id="room"
              value={values.room}
              maxLength={80}
              onChange={(event) => update('room', event.target.value)}
            />
          </FormField>
          <FormField id="cabinet" label="Cabinet">
            <Input
              id="cabinet"
              value={values.cabinet}
              maxLength={80}
              onChange={(event) => update('cabinet', event.target.value)}
            />
          </FormField>
          <FormField id="shelf" label="Shelf">
            <Input
              id="shelf"
              value={values.shelf}
              maxLength={80}
              onChange={(event) => update('shelf', event.target.value)}
            />
          </FormField>
          <FormField id="box-code" label="Box">
            <Input
              id="box-code"
              value={values.boxCode}
              maxLength={80}
              onChange={(event) => update('boxCode', event.target.value)}
            />
          </FormField>
          <FormField id="folder-code" label="Folder">
            <Input
              id="folder-code"
              value={values.folderCode}
              maxLength={80}
              onChange={(event) => update('folderCode', event.target.value)}
            />
          </FormField>
          <FormField id="digitization" label="Digitization status">
            <Select
              id="digitization"
              value={values.digitizationStatus}
              onChange={(event) =>
                update(
                  'digitizationStatus',
                  event.target.value as DigitizationStatus,
                )
              }
            >
              {(
                Object.keys(DIGITIZATION_LABELS) as DigitizationStatus[]
              ).map((status) => (
                <option key={status} value={status}>
                  {DIGITIZATION_LABELS[status]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField id="condition-notes" label="Condition notes">
          <textarea
            id="condition-notes"
            value={values.conditionNotes}
            rows={3}
            maxLength={2000}
            onChange={(event) => update('conditionNotes', event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none"
          />
        </FormField>
      </div>
    </Dialog>
  )
}
