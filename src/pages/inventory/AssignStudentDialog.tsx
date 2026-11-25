import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { StudentPicker } from '@/components/archive/StudentPicker'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { assignStudentLocation } from '@/lib/archive/inventory'
import type { StudentSearchRow } from '@/lib/archive/students'

interface AssignStudentDialogProps {
  open: boolean
  locationId: string
  locatorCode: string
  onClose: () => void
  onAssigned: () => void
}

export function AssignStudentDialog({
  open,
  locationId,
  locatorCode,
  onClose,
  onAssigned,
}: AssignStudentDialogProps) {
  const [student, setStudent] = useState<StudentSearchRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!student) {
      setError('Select the student record to assign to this locator.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await assignStudentLocation(student.id, locationId)
      toast.success(`${student.full_name} assigned to ${locatorCode}.`)
      setStudent(null)
      onAssigned()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The student could not be assigned.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Assign a student to this locator"
      description={`The selected record will point at ${locatorCode}. A student can only have one physical locator.`}
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            isLoading={saving}
            disabled={!student}
            leftIcon={<UserPlus className="size-4" aria-hidden="true" />}
          >
            Assign student
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <Alert variant="danger" title="Assignment not completed">
            {error}
          </Alert>
        ) : null}
        <StudentPicker
          value={student}
          onChange={setStudent}
          label="Student record"
          hint="Search by name, archive ID, guardian, school, or existing locator."
          required
        />
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          If the student already has a different locator, this assignment
          replaces it. The change is recorded in the audit trail.
        </p>
      </div>
    </Dialog>
  )
}
