import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import {
  assignStudentLocation,
  listLocationOptions,
} from '@/lib/archive/inventory'
import type { ArchiveLocationRow } from '@/lib/supabase/database.types'

interface AssignLocationDialogProps {
  open: boolean
  studentId: string
  studentName: string
  currentLocationId: string | null
  onClose: () => void
  onAssigned: () => void
}

export function AssignLocationDialog({
  open,
  studentId,
  studentName,
  currentLocationId,
  onClose,
  onAssigned,
}: AssignLocationDialogProps) {
  const [locations, setLocations] = useState<
    Pick<ArchiveLocationRow, 'id' | 'locator_code' | 'archive_category'>[]
  >([])
  const [locationId, setLocationId] = useState(currentLocationId ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLocationId(currentLocationId ?? '')
    setError(null)
    setLoading(true)

    void listLocationOptions()
      .then((rows) => {
        setLocations(rows)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error ? cause.message : 'Storage locations could not load.',
        )
        setLoading(false)
      })
  }, [open, currentLocationId])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await assignStudentLocation(studentId, locationId || null)
      toast.success(
        locationId
          ? 'Physical locator assigned.'
          : 'Physical locator removed from the record.',
      )
      onAssigned()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The locator could not be updated.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign physical locator"
      description={`Choose where the original records for ${studentName} are stored.`}
      className="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            isLoading={saving}
            disabled={loading}
            leftIcon={<MapPin className="size-4" aria-hidden="true" />}
          >
            Save locator
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <Alert variant="danger" title="Locator not updated">
            {error}
          </Alert>
        ) : null}

        <FormField
          id="assign-location"
          label="Storage location"
          hint="Select “Unassigned” to remove the current locator. Locations are created in the Inventory module."
        >
          <Select
            id="assign-location"
            value={locationId}
            disabled={loading}
            onChange={(event) => setLocationId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.locator_code} · {location.archive_category}
              </option>
            ))}
          </Select>
        </FormField>

        {!loading && locations.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            No storage locations exist yet. Create one in the Inventory module
            first, then return to this record.
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
