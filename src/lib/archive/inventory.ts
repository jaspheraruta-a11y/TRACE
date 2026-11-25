import { supabase } from '@/lib/supabase/client'
import type {
  ArchiveLocationInsert,
  ArchiveLocationRow,
  ArchiveLocationUpdate,
  Database,
} from '@/lib/supabase/database.types'
import { describeArchiveError } from '@/lib/archive/errors'

export type LocationSummaryRow =
  Database['public']['Functions']['location_summary']['Returns'][number]

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

export async function listLocationSummary(): Promise<LocationSummaryRow[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('location_summary')
  if (error) throw new Error(describeArchiveError(error.message))
  return data ?? []
}

export async function listLocationOptions(): Promise<
  Pick<ArchiveLocationRow, 'id' | 'locator_code' | 'archive_category'>[]
> {
  const client = requireClient()
  const { data, error } = await client
    .from('archive_locations')
    .select('id, locator_code, archive_category')
    .order('locator_code', { ascending: true })

  if (error) throw new Error(describeArchiveError(error.message))
  return data ?? []
}

export async function createLocation(
  input: ArchiveLocationInsert,
): Promise<ArchiveLocationRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('archive_locations')
    .insert(input)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function updateLocation(
  id: string,
  patch: ArchiveLocationUpdate,
): Promise<ArchiveLocationRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('archive_locations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function deleteLocation(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('archive_locations').delete().eq('id', id)
  if (error) throw new Error(describeArchiveError(error.message))
}

export async function assignStudentLocation(
  studentId: string,
  locationId: string | null,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('assign_student_location', {
    p_student_id: studentId,
    p_location_id: locationId,
  })

  if (error) throw new Error(describeArchiveError(error.message))
}

export async function getStudentLocation(
  locationId: string,
): Promise<Pick<ArchiveLocationRow, 'id' | 'locator_code' | 'archive_category'> | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('archive_locations')
    .select('id, locator_code, archive_category')
    .eq('id', locationId)
    .maybeSingle()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}
