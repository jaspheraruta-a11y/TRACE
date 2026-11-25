import { Badge } from '@/components/ui/Badge'
import {
  DIGITIZATION_LABELS,
  DIGITIZATION_VARIANTS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_VARIANTS,
  RECORD_STATUS_LABELS,
  RECORD_STATUS_VARIANTS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_VARIANTS,
  REQUEST_VERIFICATION_LABELS,
  REQUEST_VERIFICATION_VARIANTS,
} from '@/lib/archive/labels'
import type {
  DigitizationStatus,
  DocumentVerificationStatus,
  RecordVerificationStatus,
  RequestStatus,
  RequestVerificationStatus,
} from '@/lib/supabase/database.types'

export function RecordStatusBadge({
  status,
}: {
  status: RecordVerificationStatus
}) {
  return (
    <Badge variant={RECORD_STATUS_VARIANTS[status]}>
      {RECORD_STATUS_LABELS[status]}
    </Badge>
  )
}

export function DocumentStatusBadge({
  status,
}: {
  status: DocumentVerificationStatus
}) {
  return (
    <Badge variant={DOCUMENT_STATUS_VARIANTS[status]}>
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  )
}

export function DigitizationBadge({ status }: { status: DigitizationStatus }) {
  return (
    <Badge variant={DIGITIZATION_VARIANTS[status]}>
      {DIGITIZATION_LABELS[status]}
    </Badge>
  )
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge variant={REQUEST_STATUS_VARIANTS[status]}>
      {REQUEST_STATUS_LABELS[status]}
    </Badge>
  )
}

export function RequestVerificationBadge({
  status,
}: {
  status: RequestVerificationStatus
}) {
  return (
    <Badge variant={REQUEST_VERIFICATION_VARIANTS[status]}>
      {REQUEST_VERIFICATION_LABELS[status]}
    </Badge>
  )
}
