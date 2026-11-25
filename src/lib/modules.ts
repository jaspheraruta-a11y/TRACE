import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  BarChart3,
  ClipboardList,
  FileSearch,
  FileText,
  MapPin,
  ScrollText,
  Users,
} from 'lucide-react'
import type { AppRole } from '@/lib/supabase/database.types'

export type ModuleState = 'active'

export interface ArchiveModule {
  id: string
  code: string
  name: string
  shortName: string
  path: string
  phase: number
  state: ModuleState
  summary: string
  purpose: string
  capabilities: string[]
  availableNow: string[]
  icon: LucideIcon
  roles?: AppRole[]
}

/**
 * Single source of truth for module status shown across the shell, the
 * command palette, and any module guide. Nothing here represents stored
 * data — it is application build state.
 */
export const ARCHIVE_MODULES: ArchiveModule[] = [
  {
    id: 'students',
    code: 'B',
    name: 'Student Archive',
    shortName: 'Students',
    path: '/students',
    phase: 3,
    state: 'active',
    summary: 'The masterlist of historical student records.',
    purpose:
      'Create and maintain archival student profiles with incomplete historical details, duplicate detection, CSV import, and archive/restore controls.',
    capabilities: [
      'Archive IDs, names, and optional historical identifiers',
      'Date and place of birth, parents, and elementary completion',
      'Duplicate detection before a record is committed',
      'CSV import with validation and preview',
      'Archive and restore instead of permanent deletion',
    ],
    availableNow: [
      'Live student masterlist with filters and pagination',
      'Create, edit, archive, and restore with audit events',
      'CSV import with row validation and preview',
      'Full record view with academic history and documents',
    ],
    icon: Archive,
  },
  {
    id: 'search',
    code: 'D',
    name: 'Smart Search',
    shortName: 'Search',
    path: '/search',
    phase: 6,
    state: 'active',
    summary: 'Find records from partial or imperfect details.',
    purpose:
      'Rank results using PostgreSQL full-text and trigram similarity so staff can locate a record from a misspelled name, an approximate school year, a subject, or a physical locator.',
    capabilities: [
      'Partial and fuzzy name matching with ranking',
      'Combined filters for school year, school, and year level',
      'Search by subject, locator code, and authorized details',
      'Paginated results designed for thousands of records',
      'Access-aware result fields and document availability',
    ],
    availableNow: [
      'Ranked search across names, archive IDs, guardians, and locators',
      'Structured filters for school year, school, year level, and subject',
      'Document counts and locator codes in every result',
      'Active-staff-only access enforced by the database',
    ],
    icon: FileSearch,
  },
  {
    id: 'documents',
    code: 'F',
    name: 'Document Digitization',
    shortName: 'Documents',
    path: '/documents',
    phase: 7,
    state: 'active',
    summary: 'Private scans tied to the right student record.',
    purpose:
      'Upload and verify PDF, JPG, and PNG scans in a private bucket, then preview or download them only through short-lived signed URLs issued to authorized staff.',
    capabilities: [
      'Private Supabase Storage bucket — never public URLs',
      'Document type, uploader, timestamp, and verification metadata',
      'Secure in-browser PDF and image preview',
      'Replacements that retain an auditable history',
      'Short-expiry signed downloads restricted by role',
    ],
    availableNow: [
      'Upload PDF, JPEG, and PNG scans up to 25 MB',
      'Private signed links with an access audit event',
      'Verification and rejection restricted to Registrar and Administrator',
      'Document register with filters and per-student views',
    ],
    icon: FileText,
  },
  {
    id: 'inventory',
    code: 'G / I',
    name: 'Physical Archive & Inventory',
    shortName: 'Inventory',
    path: '/inventory',
    phase: 8,
    state: 'active',
    summary: 'Know exactly where every original is stored.',
    purpose:
      'Model storage rooms, cabinets, shelves, boxes, and folders, then generate consistent locator codes, printable labels, and QR codes for physical retrieval.',
    capabilities: [
      'Structured storage hierarchy and locator codes',
      'Assign students to boxes and folders',
      'Box-level digitization status and condition notes',
      'Locator label printing and QR generation',
      'Gap reports for missing locators and scans',
    ],
    availableNow: [
      'Unique locator codes with room, cabinet, shelf, box, and folder',
      'Student assignment through a server-checked function',
      'Printable labels with a QR code',
      'Live student and document counts per location',
    ],
    icon: MapPin,
  },
  {
    id: 'requests',
    code: 'H',
    name: 'Retrieval Requests',
    shortName: 'Requests',
    path: '/requests',
    phase: 9,
    state: 'active',
    summary: 'Track every request from intake to release.',
    purpose:
      'Record who requested a record, verify their authority, follow the retrieval workflow, and log the final release decision made by the Registrar.',
    capabilities: [
      'Requester identity, relationship, and purpose',
      'Verification status before any release',
      'Pending through released request workflow',
      'Staff assignment, remarks, and release details',
      'Per-request event history and audit trail',
    ],
    availableNow: [
      'Request intake with student and staff assignment',
      'Workflow RPCs for status, verification, and release',
      'Release blocked until the requester is verified',
      'Append-only per-request event history',
    ],
    icon: ClipboardList,
  },
  {
    id: 'reports',
    code: 'L',
    name: 'Reports',
    shortName: 'Reports',
    path: '/reports',
    phase: 10,
    state: 'active',
    summary: 'Operational reporting from real archive data.',
    purpose:
      'Produce digitization, locator coverage, inventory, and retrieval reports from live database records, with CSV export limited to authorized staff.',
    capabilities: [
      'Digitization progress and missing-scan reports',
      'Records by school year, curriculum, and year level',
      'Retrieval volume and status reporting',
      'Archive inventory distribution',
      'Authorized CSV export with no fabricated figures',
    ],
    availableNow: [
      'Live coverage, verification, and retrieval aggregates',
      'Gap report for missing locators, scans, and verifications',
      'CSV export of students and retrieval requests',
      'Figures recalculated from the database on each visit',
    ],
    icon: BarChart3,
  },
  {
    id: 'audit',
    code: 'J',
    name: 'Audit Trail',
    shortName: 'Audit',
    path: '/admin/audit',
    phase: 11,
    state: 'active',
    summary: 'Accountability for sensitive archival actions.',
    purpose:
      'A tamper-resistant activity record covering sign-ins, record changes, document access, releases, and account administration. Entries are written through a controlled function and are not editable by staff.',
    capabilities: [
      'Sign-in and privileged action events',
      'Actor, action, related record, and timestamp',
      'Administrator-only review with filters',
      'No client-side insert, update, or delete access',
      'Minimal metadata — no unnecessary sensitive content',
    ],
    availableNow: [
      'Append-only audit log with administrator-only reads',
      'Triggers for students, academic history, documents, locations, and requests',
      'Security-definer writer with the actor derived from the session',
      'Entity lookup index for record-level accountability',
    ],
    icon: ScrollText,
    roles: ['administrator'],
  },
  {
    id: 'users',
    code: 'K',
    name: 'Staff Accounts',
    shortName: 'Staff',
    path: '/admin/users',
    phase: 2,
    state: 'active',
    summary: 'Role-based access for Registrar personnel.',
    purpose:
      'Provision staff accounts, assign Administrator, Registrar, or Digitization Staff roles, and deactivate access without deleting archival history.',
    capabilities: [
      'Create staff accounts with a temporary password',
      'Role assignment with least-privilege defaults',
      'Activate or suspend staff access',
      'Self-change and last-administrator protections',
      'Audited role and status changes',
    ],
    availableNow: [
      'Staff directory with live profile and role data',
      'Create, activate, suspend, and re-role accounts',
      'Administrator-only access enforced by RLS',
      'Audit trail for every account change',
    ],
    icon: Users,
    roles: ['administrator'],
  },
]

export const MODULE_BY_PATH = new Map(
  ARCHIVE_MODULES.map((module) => [module.path, module]),
)

export function getModuleByPath(path: string): ArchiveModule | undefined {
  return MODULE_BY_PATH.get(path)
}
