import { supabase } from '@/lib/supabase/client'
import type {
  SchoolYearInsert,
  SchoolYearRow,
  SchoolYearUpdate,
  SubjectInsert,
  SubjectRow,
  SubjectUpdate,
} from '@/lib/supabase/database.types'
import { describeArchiveError } from '@/lib/archive/errors'

export interface SchoolYearWithSubjects extends SchoolYearRow {
  subjects: SubjectRow[]
}

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

export async function listSchoolYears(
  studentId: string,
): Promise<SchoolYearWithSubjects[]> {
  const client = requireClient()
  const { data: years, error: yearsError } = await client
    .from('student_school_years')
    .select('*')
    .eq('student_id', studentId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (yearsError) throw new Error(describeArchiveError(yearsError.message))
  if (!years || years.length === 0) return []

  const { data: subjects, error: subjectsError } = await client
    .from('student_subjects')
    .select('*')
    .in(
      'school_year_id',
      years.map((year) => year.id),
    )
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (subjectsError) throw new Error(describeArchiveError(subjectsError.message))

  const grouped = new Map<string, SubjectRow[]>()
  for (const subject of subjects ?? []) {
    const list = grouped.get(subject.school_year_id) ?? []
    list.push(subject)
    grouped.set(subject.school_year_id, list)
  }

  return years.map((year) => ({
    ...year,
    subjects: grouped.get(year.id) ?? [],
  }))
}

export async function createSchoolYear(
  input: SchoolYearInsert,
): Promise<SchoolYearRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('student_school_years')
    .insert(input)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function updateSchoolYear(
  id: string,
  patch: SchoolYearUpdate,
): Promise<SchoolYearRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('student_school_years')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function deleteSchoolYear(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('student_school_years')
    .delete()
    .eq('id', id)

  if (error) throw new Error(describeArchiveError(error.message))
}

export async function createSubject(input: SubjectInsert): Promise<SubjectRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('student_subjects')
    .insert(input)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function updateSubject(
  id: string,
  patch: SubjectUpdate,
): Promise<SubjectRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('student_subjects')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function deleteSubject(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('student_subjects').delete().eq('id', id)

  if (error) throw new Error(describeArchiveError(error.message))
}
