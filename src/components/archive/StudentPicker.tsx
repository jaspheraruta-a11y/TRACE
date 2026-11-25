import { useEffect, useId, useState } from 'react'
import { Search, UserRound, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { searchStudents, type StudentSearchRow } from '@/lib/archive/students'

export interface PickedStudent {
  id: string
  full_name: string
  archive_id: string
  physical_locator_code?: string | null
  school_years?: string | null
}

interface StudentPickerProps {
  value: PickedStudent | null
  onChange: (student: StudentSearchRow | null) => void
  label?: string
  hint?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

export function StudentPicker({
  value,
  onChange,
  label = 'Student record',
  hint = 'Search by name, archive ID, guardian, school, or locator.',
  disabled = false,
  required = false,
  id,
}: StudentPickerProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StudentSearchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    void searchStudents({ query: term, limit: 8 })
      .then((response) => {
        if (!active) return
        setResults(response.rows)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Search failed.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [query])

  if (value) {
    return (
      <FormField id={fieldId} label={label} required={required} hint={hint}>
        <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 ring-1 ring-brand-200">
            <UserRound className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-brand-950">
              {value.full_name}
            </p>
            <p className="mt-0.5 text-xs text-brand-800">
              {value.archive_id}
              {value.physical_locator_code
                ? ` · ${value.physical_locator_code}`
                : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-mt-1 -mr-1 text-brand-800"
            onClick={() => {
              onChange(null)
              setQuery('')
              setResults([])
            }}
            aria-label="Clear selected student"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </FormField>
    )
  }

  return (
    <FormField id={fieldId} label={label} required={required} hint={hint}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          id={fieldId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the student archive…"
          className="pl-9"
          disabled={disabled}
          autoComplete="off"
        />
        {loading ? (
          <span className="absolute top-1/2 right-3 -translate-y-1/2">
            <Spinner label="Searching students" />
          </span>
        ) : null}
      </div>

      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}

      {query.trim().length >= 2 && !loading && results.length === 0 && !error ? (
        <p className="mt-1.5 text-xs text-slate-500">
          No matching student records. Check the spelling or search by archive ID.
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-panel">
          {results.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
                onClick={() => {
                  onChange(student)
                  setQuery('')
                  setResults([])
                }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <UserRound className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {student.full_name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {student.archive_id}
                    {student.school_years ? ` · ${student.school_years}` : ''}
                    {student.physical_locator_code
                      ? ` · ${student.physical_locator_code}`
                      : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </FormField>
  )
}
