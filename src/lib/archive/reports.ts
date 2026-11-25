import { supabase } from '@/lib/supabase/client'
import type { Database, Json } from '@/lib/supabase/database.types'
import { describeArchiveError } from '@/lib/archive/errors'

export interface ArchiveReport {
  generated_at: string
  students: {
    total: number
    active: number
    archived: number
    verified: number
    needs_review: number
    unverified: number
  }
  documents: {
    total: number
    current: number
    verified: number
    pending: number
    rejected: number
    students_with_current_document: number
    storage_bytes: number
  }
  locations: {
    total: number
    students_with_location: number
    students_without_location: number
    digitization_not_started: number
    digitization_partial: number
    digitization_complete: number
  }
  requests: {
    total: number
    open: number
    released_last_30_days: number
    by_status: Record<string, number>
  }
  academic: {
    school_year_entries: number
    subject_entries: number
    students_with_history: number
  }
  coverage: {
    document_coverage_percent: number
    locator_coverage_percent: number
  }
}

export type StudentExportRow =
  Database['public']['Functions']['export_students']['Returns'][number]
export type RequestExportRow =
  Database['public']['Functions']['export_requests']['Returns'][number]
export type GapReportRow =
  Database['public']['Functions']['report_gaps']['Returns'][number]

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

function asNumber(value: Json | undefined): number {
  return typeof value === 'number' ? value : 0
}

function asObject(value: Json | undefined): Record<string, Json | undefined> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  return {}
}

/**
 * The SQL function returns a JSON object. This parser validates the expected
 * shape and supplies zeroes for an empty archive, never invented figures.
 */
export function parseArchiveReport(value: Json): ArchiveReport {
  const root = asObject(value)
  const students = asObject(root.students)
  const documents = asObject(root.documents)
  const locations = asObject(root.locations)
  const requests = asObject(root.requests)
  const academic = asObject(root.academic)
  const coverage = asObject(root.coverage)
  const byStatus: Record<string, number> = {}
  const rawStatuses = asObject(requests.by_status)
  for (const [status, total] of Object.entries(rawStatuses)) {
    byStatus[status] = asNumber(total)
  }

  return {
    generated_at:
      typeof root.generated_at === 'string'
        ? root.generated_at
        : new Date().toISOString(),
    students: {
      total: asNumber(students.total),
      active: asNumber(students.active),
      archived: asNumber(students.archived),
      verified: asNumber(students.verified),
      needs_review: asNumber(students.needs_review),
      unverified: asNumber(students.unverified),
    },
    documents: {
      total: asNumber(documents.total),
      current: asNumber(documents.current),
      verified: asNumber(documents.verified),
      pending: asNumber(documents.pending),
      rejected: asNumber(documents.rejected),
      students_with_current_document: asNumber(
        documents.students_with_current_document,
      ),
      storage_bytes: asNumber(documents.storage_bytes),
    },
    locations: {
      total: asNumber(locations.total),
      students_with_location: asNumber(locations.students_with_location),
      students_without_location: asNumber(locations.students_without_location),
      digitization_not_started: asNumber(locations.digitization_not_started),
      digitization_partial: asNumber(locations.digitization_partial),
      digitization_complete: asNumber(locations.digitization_complete),
    },
    requests: {
      total: asNumber(requests.total),
      open: asNumber(requests.open),
      released_last_30_days: asNumber(requests.released_last_30_days),
      by_status: byStatus,
    },
    academic: {
      school_year_entries: asNumber(academic.school_year_entries),
      subject_entries: asNumber(academic.subject_entries),
      students_with_history: asNumber(academic.students_with_history),
    },
    coverage: {
      document_coverage_percent: asNumber(coverage.document_coverage_percent),
      locator_coverage_percent: asNumber(coverage.locator_coverage_percent),
    },
  }
}

export async function getArchiveReport(): Promise<ArchiveReport> {
  const client = requireClient()
  const { data, error } = await client.rpc('archive_report')
  if (error) throw new Error(describeArchiveError(error.message))
  return parseArchiveReport(data)
}

export async function exportStudents(
  includeArchived = true,
): Promise<StudentExportRow[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('export_students', {
    p_include_archived: includeArchived,
    p_limit: 20000,
  })
  if (error) throw new Error(describeArchiveError(error.message))
  return data ?? []
}

export async function exportRequests(): Promise<RequestExportRow[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('export_requests', {
    p_limit: 20000,
  })
  if (error) throw new Error(describeArchiveError(error.message))
  return data ?? []
}

export async function getReportGaps(): Promise<GapReportRow[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('report_gaps', { p_limit: 5000 })
  if (error) throw new Error(describeArchiveError(error.message))
  return data ?? []
}
