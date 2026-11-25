import { supabase } from '@/lib/supabase/client'
import type {
  Database,
  RequestEventRow,
  RequestStatus,
  RequestVerificationStatus,
  RetrievalRequestRow,
  StudentRow,
} from '@/lib/supabase/database.types'
import { describeArchiveError } from '@/lib/archive/errors'

export type ActiveStaffOption =
  Database['public']['Functions']['list_active_staff']['Returns'][number]

export interface RequestWithRelations extends RetrievalRequestRow {
  student: Pick<StudentRow, 'id' | 'archive_id' | 'full_name'> | null
  assignee: Pick<ActiveStaffOption, 'id' | 'full_name'> | null
}

export interface RequestFilters {
  status?: RequestStatus
  verificationStatus?: RequestVerificationStatus
  query?: string
  studentId?: string
  limit?: number
}

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

export async function listActiveStaff(): Promise<ActiveStaffOption[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('list_active_staff')
  if (error) throw new Error(describeArchiveError(error.message))
  return data ?? []
}

async function attachRelations(
  requests: RetrievalRequestRow[],
): Promise<RequestWithRelations[]> {
  if (requests.length === 0) return []

  const client = requireClient()
  const studentIds = [
    ...new Set(
      requests
        .map((request) => request.student_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const studentsPromise = studentIds.length
    ? client
        .from('students')
        .select('id, archive_id, full_name')
        .in('id', studentIds)
    : Promise.resolve({ data: [], error: null })

  const [studentsResult, staff] = await Promise.all([
    studentsPromise,
    listActiveStaff().catch(() => [] as ActiveStaffOption[]),
  ])

  if (studentsResult.error) {
    throw new Error(describeArchiveError(studentsResult.error.message))
  }

  const students = new Map(
    (studentsResult.data ?? []).map((student) => [student.id, student]),
  )
  const staffMap = new Map(staff.map((member) => [member.id, member]))

  return requests.map((request) => ({
    ...request,
    student: request.student_id
      ? (students.get(request.student_id) ?? null)
      : null,
    assignee: request.assigned_to
      ? (staffMap.get(request.assigned_to) ?? null)
      : null,
  }))
}

export async function listRequests(
  filters: RequestFilters = {},
): Promise<RequestWithRelations[]> {
  const client = requireClient()
  let query = client
    .from('retrieval_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.verificationStatus) {
    query = query.eq('verification_status', filters.verificationStatus)
  }
  if (filters.studentId) query = query.eq('student_id', filters.studentId)

  const term = filters.query?.trim().replace(/[%,]/g, '') ?? ''
  if (term) {
    query = query.or(
      `requester_name.ilike.%${term}%,request_code.ilike.%${term}%,contact_info.ilike.%${term}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(describeArchiveError(error.message))
  return attachRelations(data ?? [])
}

export async function getRequest(
  id: string,
): Promise<RequestWithRelations | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('retrieval_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(describeArchiveError(error.message))
  if (!data) return null

  const [withRelations] = await attachRelations([data])
  return withRelations ?? null
}

export async function listRequestEvents(
  requestId: string,
): Promise<RequestEventRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('request_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(describeArchiveError(error.message))
  return data ?? []
}

export interface CreateRequestInput {
  requesterName: string
  requesterType: string
  studentId?: string | null
  relationship?: string | null
  contactInfo?: string | null
  purpose?: string | null
  assignedTo?: string | null
}

export async function createRequest(input: CreateRequestInput): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('create_retrieval_request', {
    p_requester_name: input.requesterName.trim(),
    p_requester_type: input.requesterType.trim(),
    p_student_id: input.studentId || null,
    p_relationship: input.relationship?.trim() || null,
    p_contact_info: input.contactInfo?.trim() || null,
    p_purpose: input.purpose?.trim() || null,
    p_assigned_to: input.assignedTo || null,
  })

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export interface UpdateRequestInput extends CreateRequestInput {
  requestId: string
  remarks?: string | null
}

export async function updateRequest(input: UpdateRequestInput): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('update_retrieval_request', {
    p_request_id: input.requestId,
    p_requester_name: input.requesterName.trim(),
    p_requester_type: input.requesterType.trim(),
    p_student_id: input.studentId || null,
    p_relationship: input.relationship?.trim() || null,
    p_contact_info: input.contactInfo?.trim() || null,
    p_purpose: input.purpose?.trim() || null,
    p_assigned_to: input.assignedTo || null,
    p_remarks: input.remarks?.trim() || null,
  })

  if (error) throw new Error(describeArchiveError(error.message))
}

export async function setRequestStatus(
  requestId: string,
  status: RequestStatus,
  note?: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('set_request_status', {
    p_request_id: requestId,
    p_status: status,
    p_note: note?.trim() || null,
  })

  if (error) throw new Error(describeArchiveError(error.message))
}

export async function setRequestVerification(
  requestId: string,
  status: RequestVerificationStatus,
  note?: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('set_request_verification', {
    p_request_id: requestId,
    p_status: status,
    p_note: note?.trim() || null,
  })

  if (error) throw new Error(describeArchiveError(error.message))
}
