import type { BadgeVariant } from '@/components/ui/Badge'
import type {
  DigitizationStatus,
  DocumentVerificationStatus,
  RecordVerificationStatus,
  RequestStatus,
  RequestVerificationStatus,
} from '@/lib/supabase/database.types'

export const RECORD_STATUS_LABELS: Record<RecordVerificationStatus, string> = {
  unverified: 'Unverified',
  needs_review: 'Needs review',
  verified: 'Verified',
}

export const RECORD_STATUS_VARIANTS: Record<
  RecordVerificationStatus,
  BadgeVariant
> = {
  unverified: 'warning',
  needs_review: 'danger',
  verified: 'success',
}

export const DOCUMENT_STATUS_LABELS: Record<
  DocumentVerificationStatus,
  string
> = {
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
}

export const DOCUMENT_STATUS_VARIANTS: Record<
  DocumentVerificationStatus,
  BadgeVariant
> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
}

export const DIGITIZATION_LABELS: Record<DigitizationStatus, string> = {
  not_started: 'Not started',
  partial: 'Partial',
  complete: 'Complete',
}

export const DIGITIZATION_VARIANTS: Record<DigitizationStatus, BadgeVariant> = {
  not_started: 'neutral',
  partial: 'warning',
  complete: 'success',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  searching: 'Searching',
  record_found: 'Record found',
  verification_required: 'Verification required',
  ready_for_release: 'Ready for release',
  released: 'Released',
  completed: 'Completed',
  unavailable: 'Unavailable',
  cancelled: 'Cancelled',
}

export const REQUEST_STATUS_VARIANTS: Record<RequestStatus, BadgeVariant> = {
  pending: 'neutral',
  searching: 'brand',
  record_found: 'brand',
  verification_required: 'warning',
  ready_for_release: 'warning',
  released: 'success',
  completed: 'success',
  unavailable: 'danger',
  cancelled: 'neutral',
}

export const REQUEST_VERIFICATION_LABELS: Record<
  RequestVerificationStatus,
  string
> = {
  unverified: 'Unverified',
  verified: 'Verified',
  rejected: 'Rejected',
}

export const REQUEST_VERIFICATION_VARIANTS: Record<
  RequestVerificationStatus,
  BadgeVariant
> = {
  unverified: 'warning',
  verified: 'success',
  rejected: 'danger',
}

export const REQUEST_WORKFLOW_ORDER: RequestStatus[] = [
  'pending',
  'searching',
  'record_found',
  'verification_required',
  'ready_for_release',
  'released',
  'completed',
]

export const REQUEST_TERMINAL_STATUSES: RequestStatus[] = [
  'completed',
  'cancelled',
  'unavailable',
]

export const REQUEST_TYPE_OPTIONS = [
  'Student',
  'Alumni',
  'Parent or Guardian',
  'Authorized Representative',
  'School Personnel',
  'Other',
] as const

export const DOCUMENT_TYPE_OPTIONS = [
  'Form 137',
  'Form 138',
  'Report Card',
  'Certificate of Good Moral Character',
  'Birth Certificate',
  'Transfer Credentials',
  'Diploma',
  'Other',
] as const

export const ARCHIVE_CATEGORY_OPTIONS = [
  'Student Record',
  'Academic Record',
  'Registrar Correspondence',
  'Legal Document',
  'Other',
] as const
