import { supabase } from '@/lib/supabase/client'
import type {
  Database,
  StudentInsert,
  StudentRow,
  StudentUpdate,
} from '@/lib/supabase/database.types'
import { describeArchiveError } from '@/lib/archive/errors'

export type StudentSearchRow =
  Database['public']['Functions']['search_students']['Returns'][number]

export type DuplicateCandidate =
  Database['public']['Functions']['find_student_duplicates']['Returns'][number]

export interface StudentSearchFilters {
  query?: string
  schoolYear?: string
  school?: string
  yearLevel?: string
  subject?: string
  locator?: string
  includeArchived?: boolean
  limit?: number
  offset?: number
}

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

export async function searchStudents(
  filters: StudentSearchFilters = {},
): Promise<{ rows: StudentSearchRow[]; total: number }> {
  const client = requireClient()
  const { data, error } = await client.rpc('search_students', {
    p_query: filters.query?.trim() ?? '',
    p_school_year: filters.schoolYear?.trim() || null,
    p_school: filters.school?.trim() || null,
    p_year_level: filters.yearLevel?.trim() || null,
    p_subject: filters.subject?.trim() || null,
    p_locator: filters.locator?.trim() || null,
    p_include_archived: filters.includeArchived ?? false,
    p_limit: filters.limit ?? 25,
    p_offset: filters.offset ?? 0,
  })

  if (error) throw new Error(describeArchiveError(error.message))

  const rows = data ?? []
  return { rows, total: rows[0]?.total_count ?? 0 }
}

export async function getStudent(id: string): Promise<StudentRow | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function createStudent(input: StudentInsert): Promise<StudentRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('students')
    .insert(input)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function updateStudent(
  id: string,
  patch: StudentUpdate,
): Promise<StudentRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('students')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function setStudentArchived(
  id: string,
  isArchived: boolean,
): Promise<StudentRow> {
  return updateStudent(id, { is_archived: isArchived })
}

export async function findStudentDuplicates(input: {
  lastName: string
  firstName: string
  dateOfBirth?: string | null
  excludeId?: string | null
}): Promise<DuplicateCandidate[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('find_student_duplicates', {
    p_last_name: input.lastName.trim(),
    p_first_name: input.firstName.trim(),
    p_date_of_birth: input.dateOfBirth || null,
    p_exclude_id: input.excludeId || null,
  })

  if (error) throw new Error(describeArchiveError(error.message))
  return data ?? []
}

export async function getStudentOptions(
  query: string,
): Promise<StudentSearchRow[]> {
  const { rows } = await searchStudents({ query, limit: 10 })
  return rows
}
