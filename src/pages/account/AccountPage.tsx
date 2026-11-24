import { useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ROLE_DESCRIPTIONS, ROLE_SCOPE, roleLabel } from '@/lib/roles'
import { formatDate, formatDateTime } from '@/lib/utils'

export function AccountPage() {
  useDocumentTitle('My account')
  const { profile, session, signOut } = useAuth()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const sessionExpiry = session?.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : null

  async function handleCopyId() {
    if (!profile?.id) return
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(profile.id)
      toast.success('Staff ID copied to the clipboard.')
    } catch {
      toast.error('The browser blocked clipboard access.')
    } finally {
      setIsCopying(false)
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
      toast.success('You have been signed out.')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to sign out.',
      )
      setIsSigningOut(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account & access"
        title="My account"
        description="Your TRACE identity, role, and current authenticated session."
        actions={
          <Button
            variant="secondary"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            leftIcon={<LogOut className="size-4" />}
          >
            Sign out
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Staff profile</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Identity and role stored in the TRACE database.
                </p>
              </div>
              <RoleBadge role={profile?.role} />
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Full name
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {profile?.full_name ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Email address
                  </dt>
                  <dd className="mt-1 break-all text-sm text-slate-800">
                    {profile?.email ?? session?.user.email ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Role
                  </dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {roleLabel(profile?.role)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Account status
                  </dt>
                  <dd className="mt-1">
                    <Badge variant={profile?.is_active ? 'success' : 'warning'}>
                      {profile?.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Profile created
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm text-slate-800">
                    <CalendarDays
                      className="size-3.5 text-slate-400"
                      aria-hidden="true"
                    />
                    {formatDate(profile?.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                    Last updated
                  </dt>
                  <dd className="mt-1 text-sm text-slate-800">
                    {formatDateTime(profile?.updated_at)}
                  </dd>
                </div>
              </dl>

              <Alert variant="info" className="mt-6">
                Profile details and role assignments are managed by a TRACE
                administrator. Contact the Registrar administrator if any
                detail is incorrect.
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access scope</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                What your role is permitted to do once archive modules are
                active.
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-600">
                {profile ? ROLE_DESCRIPTIONS[profile.role] : '—'}
              </p>
              <ul className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                {(profile ? ROLE_SCOPE[profile.role] : []).map((capability) => (
                  <li
                    key={capability}
                    className="flex gap-2.5 text-sm text-slate-600"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    {capability}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-slate-500">
                Permissions are enforced by PostgreSQL row-level security in
                Supabase. Hiding a screen in the browser is never the only
                control.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current session</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Issued by Supabase Authentication.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <KeyRound
                  className="mt-0.5 size-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {session ? 'Authenticated session' : 'No session'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Last sign-in {formatDateTime(session?.user.last_sign_in_at)}
                  </p>
                  {sessionExpiry ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Token expires {formatDateTime(sessionExpiry)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                  Staff ID
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-700">
                    {profile?.id ?? '—'}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    disabled={!profile?.id || isCopying}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50"
                    aria-label="Copy staff ID"
                  >
                    <Copy className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleSignOut}
                isLoading={isSigningOut}
                leftIcon={<LogOut className="size-4" />}
              >
                Sign out of TRACE
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <p className="text-xs leading-relaxed text-slate-600">
                  Sign-ins and privileged actions are recorded in the audit
                  log with the authenticated actor.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <UserRound
                  className="mt-0.5 size-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <p className="text-xs leading-relaxed text-slate-600">
                  Never share credentials. Accounts are individual and role
                  changes are made by an administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
