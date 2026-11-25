import { supabase } from '@/lib/supabase/client'
import type {
  DocumentRow,
  DocumentVerificationStatus,
  StudentRow,
} from '@/lib/supabase/database.types'
import { describeArchiveError } from '@/lib/archive/errors'

export const DOCUMENT_BUCKET = 'student-documents'
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const

export interface DocumentWithStudent extends DocumentRow {
  student: Pick<StudentRow, 'id' | 'archive_id' | 'full_name'> | null
}

export interface DocumentFilters {
  studentId?: string
  documentType?: string
  verificationStatus?: DocumentVerificationStatus
  currentOnly?: boolean
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

async function attachStudents(
  documents: DocumentRow[],
): Promise<DocumentWithStudent[]> {
  if (documents.length === 0) return []

  const client = requireClient()
  const studentIds = [...new Set(documents.map((document) => document.student_id))]
  const { data, error } = await client
    .from('students')
    .select('id, archive_id, full_name')
    .in('id', studentIds)

  if (error) throw new Error(describeArchiveError(error.message))

  const students = new Map((data ?? []).map((student) => [student.id, student]))
  return documents.map((document) => ({
    ...document,
    student: students.get(document.student_id) ?? null,
  }))
}

export async function listDocuments(
  filters: DocumentFilters = {},
): Promise<DocumentWithStudent[]> {
  const client = requireClient()
  let query = client
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(filters.limit ?? 100)

  if (filters.studentId) query = query.eq('student_id', filters.studentId)
  if (filters.documentType) query = query.eq('document_type', filters.documentType)
  if (filters.verificationStatus) {
    query = query.eq('verification_status', filters.verificationStatus)
  }
  if (filters.currentOnly) query = query.eq('is_current', true)

  const { data, error } = await query
  if (error) throw new Error(describeArchiveError(error.message))
  return attachStudents(data ?? [])
}

export async function listStudentDocuments(
  studentId: string,
): Promise<DocumentWithStudent[]> {
  return listDocuments({ studentId, limit: 200 })
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export interface UploadDocumentInput {
  studentId: string
  documentType: string
  file: File
  replacesDocumentId?: string | null
}

export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<DocumentRow> {
  const client = requireClient()
  const file = input.file

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    throw new Error('Upload a PDF, JPG, or PNG file.')
  }

  if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('The file must be between 1 byte and 25 MB.')
  }

  const extension =
    file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    (file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg')
  const storagePath = `${input.studentId}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await client.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw new Error(describeArchiveError(uploadError.message))

  let previous: DocumentRow | null = null
  if (input.replacesDocumentId) {
    previous = await getDocument(input.replacesDocumentId)
    if (!previous || previous.student_id !== input.studentId) {
      await client.storage.from(DOCUMENT_BUCKET).remove([storagePath])
      throw new Error('The document being replaced is no longer available.')
    }

    const { error: supersedeError } = await client
      .from('documents')
      .update({ is_current: false })
      .eq('id', previous.id)

    if (supersedeError) {
      await client.storage.from(DOCUMENT_BUCKET).remove([storagePath])
      throw new Error(describeArchiveError(supersedeError.message))
    }
  }

  const { data, error } = await client
    .from('documents')
    .insert({
      student_id: input.studentId,
      document_type: input.documentType.trim(),
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      is_current: true,
      replaces_document_id: input.replacesDocumentId ?? null,
    })
    .select('*')
    .single()

  if (error) {
    await client.storage.from(DOCUMENT_BUCKET).remove([storagePath])
    if (previous) {
      await client
        .from('documents')
        .update({ is_current: true })
        .eq('id', previous.id)
    }
    throw new Error(describeArchiveError(error.message))
  }

  return data
}

export async function getSignedDocumentUrl(
  document: Pick<DocumentRow, 'id' | 'storage_path'>,
  expiresInSeconds = 600,
): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(
      describeArchiveError(
        error?.message ?? 'A private document link could not be created.',
      ),
    )
  }

  const { error: logError } = await client.rpc('log_document_access', {
    p_document_id: document.id,
  })
  if (logError) {
    console.error('Unable to record document access:', logError.message)
  }

  return data.signedUrl
}

export async function verifyDocument(
  id: string,
  status: DocumentVerificationStatus,
): Promise<DocumentRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('documents')
    .update({ verification_status: status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(describeArchiveError(error.message))
  return data
}

export async function deleteDocument(document: DocumentRow): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('documents').delete().eq('id', document.id)
  if (error) throw new Error(describeArchiveError(error.message))

  const { error: storageError } = await client.storage
    .from(DOCUMENT_BUCKET)
    .remove([document.storage_path])

  if (storageError) {
    console.error('Unable to remove the stored document file:', storageError.message)
  }
}
