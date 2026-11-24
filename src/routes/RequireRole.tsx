import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { AppRole } from '@/lib/supabase/database.types'

/**
 * Hides administrator-only screens from other roles. The same restriction
 * must exist in RLS; this component is navigation hygiene, not security.
 */
export function RequireRole({ roles }: { roles: AppRole[] }) {
  const { profile } = useAuth()

  if (!profile || !profile.is_active || !roles.includes(profile.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
