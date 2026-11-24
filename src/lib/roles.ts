import type { AppRole, StaffProfileRow } from '@/lib/supabase/database.types'

export type StaffProfile = StaffProfileRow

export const APP_ROLES: readonly AppRole[] = [
  'administrator',
  'registrar',
  'digitization_staff',
] as const

export const ROLE_LABELS: Record<AppRole, string> = {
  administrator: 'Administrator',
  registrar: 'Registrar',
  digitization_staff: 'Digitization Staff',
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  administrator:
    'Manages staff accounts, permissions, archive settings, and audit oversight.',
  registrar:
    'Handles archival records, documents, physical locators, and retrieval requests.',
  digitization_staff:
    'Encodes historical records, uploads scans, and updates digitization progress.',
}

export const ROLE_SCOPE: Record<AppRole, string[]> = {
  administrator: [
    'Manage staff accounts and role assignments',
    'Configure archive and system settings',
    'Review audit logs and retrieval reports',
    'Full archival record and document oversight',
  ],
  registrar: [
    'Search and maintain student archive records',
    'Manage high school academic history',
    'Upload, verify, and release documents',
    'Manage physical locators and retrieval requests',
  ],
  digitization_staff: [
    'Encode student archival information',
    'Upload scanned historical documents',
    'Add school-year and subject entries',
    'Update digitization status and permitted locators',
  ],
}

export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === 'string' &&
    (APP_ROLES as readonly string[]).includes(value)
  )
}

export function roleLabel(role: AppRole | null | undefined): string {
  return role ? ROLE_LABELS[role] : 'No role'
}
