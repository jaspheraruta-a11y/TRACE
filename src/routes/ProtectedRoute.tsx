import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AccessBlocked } from '@/components/auth/AccessBlocked'
import { FullPageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'

/**
 * Gate for every internal route. It waits for the session and the staff
 * profile, redirects unauthenticated visitors, and refuses access for
 * accounts that are unprovisioned or inactive.
 *
 * This is a usability boundary. The authoritative controls are the
 * PostgreSQL row-level security policies in the Supabase project.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'unconfigured' || status === 'signed_out') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (status === 'initializing' || status === 'loading_profile') {
    return <FullPageLoader />
  }

  if (
    status === 'unprovisioned' ||
    status === 'inactive' ||
    status === 'error'
  ) {
    return <AccessBlocked />
  }

  return <Outlet />
}
