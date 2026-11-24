import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  BarChart3,
  ClipboardList,
  FileSearch,
  FileText,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react'
import type { AppRole } from '@/lib/supabase/database.types'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  roles?: AppRole[]
  keywords?: string[]
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        keywords: ['home', 'overview', 'status'],
      },
    ],
  },
  {
    id: 'archive',
    label: 'Archive',
    items: [
      {
        label: 'Student Archive',
        to: '/students',
        icon: Archive,
        keywords: ['students', 'records', 'masterlist', 'encode'],
      },
      {
        label: 'Smart Search',
        to: '/search',
        icon: FileSearch,
        keywords: ['search', 'find', 'fuzzy', 'lookup'],
      },
      {
        label: 'Digital Documents',
        to: '/documents',
        icon: FileText,
        keywords: ['documents', 'scans', 'pdf', 'upload'],
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        label: 'Archive Inventory',
        to: '/inventory',
        icon: MapPin,
        keywords: ['boxes', 'cabinets', 'locator', 'qr', 'shelves'],
      },
      {
        label: 'Retrieval Requests',
        to: '/requests',
        icon: ClipboardList,
        keywords: ['requests', 'release', 'alumni', 'retrieval'],
      },
      {
        label: 'Reports',
        to: '/reports',
        icon: BarChart3,
        keywords: ['reports', 'export', 'csv', 'progress'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        label: 'Staff Accounts',
        to: '/admin/users',
        icon: Users,
        roles: ['administrator'],
        keywords: ['users', 'roles', 'accounts', 'permissions'],
      },
      {
        label: 'Audit Trail',
        to: '/admin/audit',
        icon: ScrollText,
        roles: ['administrator'],
        keywords: ['audit', 'activity', 'logs', 'security'],
      },
      {
        label: 'System Settings',
        to: '/admin/settings',
        icon: Settings,
        roles: ['administrator'],
        keywords: ['settings', 'configuration', 'security'],
      },
    ],
  },
]

export const ACCOUNT_NAV_ITEM: NavItem = {
  label: 'My Account',
  to: '/account',
  icon: Users,
  keywords: ['profile', 'account', 'session', 'role'],
}

export function canAccessNavItem(
  item: NavItem,
  role: AppRole | null | undefined,
): boolean {
  if (!item.roles || item.roles.length === 0) return true
  return Boolean(role && item.roles.includes(role))
}

export function findNavItem(pathname: string): NavItem | undefined {
  const items = NAV_SECTIONS.flatMap((section) => section.items)
  return items.find(
    (item) =>
      pathname === item.to ||
      (item.to !== '/dashboard' && pathname.startsWith(`${item.to}/`)),
  )
}

export function getBreadcrumb(pathname: string): {
  section: string
  item: string
} {
  if (pathname === '/account') return { section: 'My Account', item: 'Profile' }
  for (const section of NAV_SECTIONS) {
    const item = section.items.find(
      (entry) =>
        pathname === entry.to ||
        (entry.to !== '/dashboard' && pathname.startsWith(`${entry.to}/`)),
    )
    if (item) return { section: section.label, item: item.label }
  }
  return { section: 'TRACE', item: 'Registrar Archive' }
}
