import { useEffect, useState } from 'react'
import { FileUp, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { StudentPicker } from '@/components/archive/StudentPicker'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  uploadDocument,
} from '@/lib/archive/documents'
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/archive/labels'
import type { StudentSearchRow } from '@/lib/archive/students'

interface UploadDocumentDialogProps {
  open: boolean
  onClose: () => void
  onUploaded: () => void
  studentId?: string
  studentLabel?: string
  defaultType?: string
}

export function UploadDocumentDialog({
  open,
  onClose,
  onUploaded,
  studentId,
  studentLabel,
  defaultType,
}: UploadDocumentDialogProps) {
  const fixedStudent = Boolean(studentId)
  const [student, setStudent] = useState<StudentSearchRow | null>(null)
  const [documentType, setDocumentType] = useState(
    defaultType ?? DOCUMENT_TYPE_OPTIONS[0],
  )
  const [customType, setCustomType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    setDocumentType(defaultType ?? DOCUMENT_TYPE_OPTIONS[0])
    setCustomType('')
    setFile(null)
    setError(null)
    setStudent(null)
  }, [open, defaultType])

  const resolvedType =
    documentType === 'Other' ? customType.trim() : documentType

  const submit = async () => {
    setError(null)
    const targetId = studentId ?? student?.id
    if (!targetId) {
      setError('Select the student record this document belongs to.')
      return
    }
    if (!resolvedType) {
      setError('Enter a document type.')
      return
    }
    if (!file) {
      setError('Choose a PDF, JPG, or PNG file to upload.')
      return
    }

    setUploading(true)
    try {
      await uploadDocument({
        studentId: targetId,
        documentType: resolvedType,
        file,
      })
      toast.success('Document uploaded for review.')
      onUploaded()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'The document could not be uploaded.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Upload a document"
      description="Scans are stored privately. Uploading never makes a file publicly accessible."
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            isLoading={uploading}
            leftIcon={<Upload className="size-4" aria-hidden="true" />}
          >
            Upload document
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <Alert variant="danger" title="Upload not completed">
            {error}
          </Alert>
        ) : null}

        <Alert variant="info" title="Accepted files">
          PDF, JPEG, or PNG up to 25 MB. Files are grouped under the selected
          student and can be verified afterwards.
        </Alert>

        {fixedStudent ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-brand-700 uppercase">
              Student record
            </p>
            <p className="mt-0.5 text-sm font-medium text-brand-950">
              {studentLabel ?? 'Selected student'}
            </p>
          </div>
        ) : (
          <StudentPicker value={student} onChange={setStudent} required />
        )}

        <FormField id="document-type" label="Document type" required>
          <Select
            id="document-type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
          >
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </FormField>

        {documentType === 'Other' ? (
          <FormField id="document-type-custom" label="Custom document type" required>
            <Input
              id="document-type-custom"
              value={customType}
              maxLength={80}
              onChange={(event) => setCustomType(event.target.value)}
              placeholder="For example, Certificate of Enrollment"
            />
          </FormField>
        ) : null}

        <FormField
          id="document-file"
          label="File"
          hint={`Accepted: ${ALLOWED_DOCUMENT_TYPES.join(', ')} · max ${
            MAX_DOCUMENT_BYTES / (1024 * 1024)
          } MB`}
          required
        >
          <Input
            id="document-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              event.target.value = ''
            }}
          />
        </FormField>

        {file ? (
          <p className="flex items-center gap-2 text-xs text-slate-600">
            <FileUp className="size-3.5" aria-hidden="true" />
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
