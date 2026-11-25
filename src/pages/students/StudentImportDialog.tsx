import { useMemo, useState } from 'react'
import { FileUp, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { parseCsv } from '@/lib/archive/csv'
import { createStudent } from '@/lib/archive/students'
import type { StudentInsert } from '@/lib/supabase/database.types'

interface StudentImportDialogProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

const REQUIRED_HEADERS = ['last_name', 'first_name'] as const

interface ImportRow {
  line: number
  payload: StudentInsert
}

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

function optionalNumber(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function StudentImportDialog({
  open,
  onClose,
  onImported,
}: StudentImportDialogProps) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    created: number
    failed: number
    messages: string[]
  } | null>(null)

  const preview = useMemo(() => rows.slice(0, 5), [rows])

  const reset = () => {
    setFileName('')
    setRows([])
    setErrors([])
    setResult(null)
  }

  const handleFile = async (file: File | undefined) => {
    reset()
    if (!file) return

    setFileName(file.name)
    const text = await file.text()
    const table = parseCsv(text)

    if (table.length < 2) {
      setErrors(['The CSV file must contain a header row and at least one record.'])
      return
    }

    const headers = table[0]!.map((header) => header.trim().toLowerCase())
    const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
    if (missing.length > 0) {
      setErrors([
        `Missing required column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`,
      ])
      return
    }

    const index = new Map(headers.map((header, position) => [header, position]))
    const cell = (row: string[], header: string) =>
      row[index.get(header) ?? -1] ?? ''

    const parsed: ImportRow[] = []
    const rowErrors: string[] = []

    table.slice(1).forEach((row, offset) => {
      const line = offset + 2
      const lastName = cell(row, 'last_name').trim()
      const firstName = cell(row, 'first_name').trim()

      if (!lastName || !firstName) {
        rowErrors.push(`Line ${line}: last_name and first_name are required.`)
        return
      }

      parsed.push({
        line,
        payload: {
          last_name: lastName,
          first_name: firstName,
          middle_name: optional(cell(row, 'middle_name')),
          extension_name: optional(cell(row, 'extension_name')),
          date_of_birth: optional(cell(row, 'date_of_birth')),
          birth_province: optional(cell(row, 'birth_province')),
          birth_town: optional(cell(row, 'birth_town')),
          birth_barangay: optional(cell(row, 'birth_barangay')),
          parent_guardian_name: optional(cell(row, 'parent_guardian_name')),
          parent_guardian_occupation: optional(
            cell(row, 'parent_guardian_occupation'),
          ),
          parent_guardian_address: optional(cell(row, 'parent_guardian_address')),
          intermediate_school: optional(cell(row, 'intermediate_school')),
          intermediate_year_completed: optionalNumber(
            cell(row, 'intermediate_year_completed'),
          ),
          intermediate_general_average: optionalNumber(
            cell(row, 'intermediate_general_average'),
          ),
          elementary_years: optionalNumber(cell(row, 'elementary_years')),
          remarks: optional(cell(row, 'remarks')),
        },
      })
    })

    setRows(parsed)
    setErrors(rowErrors)
  }

  const runImport = async () => {
    if (rows.length === 0) return
    setImporting(true)
    let created = 0
    const messages: string[] = []

    for (const row of rows) {
      try {
        await createStudent(row.payload)
        created += 1
      } catch (cause) {
        messages.push(
          `Line ${row.line}: ${cause instanceof Error ? cause.message : 'Import failed.'}`,
        )
      }
    }

    setImporting(false)
    setResult({ created, failed: messages.length, messages })
    if (created > 0) {
      toast.success(
        `${created} student record${created === 1 ? '' : 's'} imported.`,
      )
      onImported()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Import student records"
      description="Upload a CSV with last_name and first_name columns. Other historical columns are optional."
      className="max-w-2xl"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset()
              onClose()
            }}
            disabled={importing}
          >
            Close
          </Button>
          <Button
            onClick={() => void runImport()}
            disabled={rows.length === 0 || importing}
            isLoading={importing}
            leftIcon={<Upload className="size-4" aria-hidden="true" />}
          >
            Import {rows.length > 0 ? `${rows.length} records` : 'records'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert variant="info" title="Review before importing">
          Archive IDs are generated automatically. The import does not overwrite
          existing records, and duplicate checking is a manual review step after
          the batch.
        </Alert>

        <FormField
          id="student-csv"
          label="CSV file"
          hint="UTF-8 or plain text CSV. A header row is required."
        >
          <Input
            id="student-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              void handleFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </FormField>

        {fileName ? (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <FileUp className="size-3.5" aria-hidden="true" />
            {fileName}
          </p>
        ) : null}

        {errors.length > 0 ? (
          <Alert variant="warning" title="Rows needing attention">
            <ul className="list-disc space-y-1 pl-4">
              {errors.slice(0, 12).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
            {errors.length > 12 ? (
              <p className="mt-2">…and {errors.length - 12} more.</p>
            ) : null}
          </Alert>
        ) : null}

        {preview.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-800">
              Preview ({rows.length} valid row{rows.length === 1 ? '' : 's'})
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Line</th>
                    <th className="px-3 py-2">Last name</th>
                    <th className="px-3 py-2">First name</th>
                    <th className="px-3 py-2">Birth date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row) => (
                    <tr key={row.line}>
                      <td className="px-3 py-2 text-slate-500">{row.line}</td>
                      <td className="px-3 py-2 text-slate-800">
                        {row.payload.last_name}
                      </td>
                      <td className="px-3 py-2 text-slate-800">
                        {row.payload.first_name}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.payload.date_of_birth ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {result ? (
          <Alert
            variant={result.failed > 0 ? 'warning' : 'success'}
            title={`${result.created} imported, ${result.failed} failed`}
          >
            {result.messages.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4">
                {result.messages.slice(0, 10).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : (
              'Every valid row was imported.'
            )}
          </Alert>
        ) : null}
      </div>
    </Dialog>
  )
}
