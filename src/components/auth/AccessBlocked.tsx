import { useState } from 'react'
import { LogOut, RefreshCw, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function AccessBlocked() {
  useDocumentTitle('Access unavailable')
  const { status, session, profileError, refreshProfile, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const email = session?.user.email ?? 'your account'

  const copy =
    status === 'unprovisioned'
      ? {
          title: 'No staff profile found',
          description: `TRACE authenticated ${email}, but there is no staff profile linked to this account. An administrator must provision your profile before you can access archival records.`,
        }
      : status === 'inactive'
        ? {
            title: 'Account not activated',
            description: `The staff profile for ${email} exists but is inactive. Contact the Registrar administrator to restore access.`,
          }
        : {
            title: 'Access could not be verified',
            description:
              'TRACE could not load your staff profile. This usually means the database migration has not been applied, or the connection was interrupted.',
          }

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to sign out.',
      )
      setIsSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg animate-rise">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-950 text-white">
            <ShieldAlert className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-[0.2em] text-brand-950">
            TRACE
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {copy.description}
          </p>

          {status === 'error' && profileError ? (
            <Alert variant="danger" title="Database response" className="mt-5">
              <code className="block break-words text-xs leading-relaxed">
                {profileError}
              </code>
            </Alert>
          ) : null}

          <div className="mt-6 space-y-3">
            {status === 'error' ? (
              <Button
                onClick={refreshProfile}
                leftIcon={<RefreshCw className="size-4" />}
                className="w-full"
              >
                Retry verification
              </Button>
            ) : null}

            <Button
              variant={status === 'error' ? 'secondary' : 'primary'}
              onClick={handleSignOut}
              isLoading={isSigningOut}
              leftIcon={<LogOut className="size-4" />}
              className="w-full"
            >
              Sign out
            </Button>
          </div>

          <p className="mt-6 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
            Account provisioning and role assignment are performed by an
            authorized TRACE administrator. Access to student records is
            logged and limited to Registrar personnel.
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Junior High School Registrar&apos;s Office · Internal system
        </p>
      </div>
    </div>
  )
}
