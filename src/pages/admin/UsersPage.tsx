import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Check,
  KeyRound,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ChangeRoleDialog } from '@/components/admin/ChangeRoleDialog'
import { CreateStaffDialog } from '@/components/admin/CreateStaffDialog'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { StaffProfile } from '@/lib/roles'
import { ROLE_LABELS } from '@/lib/roles'
import { describeStaffError } from '@/lib/staff-errors'
import type { AppRole } from '@/lib/supabase/database.types'
import { supabase } from '@/lib/supabase/client'
import { formatDate, getInitials } from '@/lib/utils'

type StatusAction = {
  type: 'activate' | 'deactivate'
  row: StaffProfile
}

export function UsersPage() {
  useDocumentTitle('Staff accounts')
  const { profile: currentProfile } = useAuth()

  const [rows, setRows] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [createOpen, setCreateOpen] = useState(false)
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null)
  const [roleTarget, setRoleTarget] = useState<StaffProfile | null>(null)
  const [repairTarget, setRepairTarget] = useState<StaffProfile | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setError('Supabase is not configured.')
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    void supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) {
          setError(queryError.message)
          setLoading(false)
          return
        }
        setRows(data ?? [])
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reloadToken])

  const stats = useMemo(() => {
    const activeAdministrators = rows.filter(
      (row) => row.is_active && row.role === 'administrator',
    ).length
    return {
      total: rows.length,
      active: rows.filter((row) => row.is_active).length,
      administrators: rows.filter((row) => row.role === 'administrator').length,
      activeAdministrators,
    }
  }, [rows])

  const filtered = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      [row.full_name, row.email, ROLE_LABELS[row.role]]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [rows, deferredQuery])

  const refresh = () => setReloadToken((token) => token + 1)

  const handleStatusChange = async () => {
    if (!supabase || !statusAction) return
    const { row, type } = statusAction
    const nextActive = type === 'activate'

    setBusyId(row.id)
    const { error: rpcError } = await supabase.rpc('set_staff_active', {
      p_user_id: row.id,
      p_is_active: nextActive,
    })
    setBusyId(null)

    if (rpcError) {
      toast.error(describeStaffError(rpcError.message))
      return
    }

    toast.success(
      nextActive
        ? `${row.full_name} can now sign in to TRACE.`
        : `${row.full_name} has been suspended.`,
    )
    setStatusAction(null)
    refresh()
  }

  const handleRoleChange = async (role: AppRole) => {
    if (!supabase || !roleTarget) return
    const target = roleTarget

    setBusyId(target.id)
    const { error: rpcError } = await supabase.rpc('set_staff_role', {
      p_user_id: target.id,
      p_role: role,
    })
    setBusyId(null)

    if (rpcError) {
      toast.error(describeStaffError(rpcError.message))
      return
    }

    toast.success(`${target.full_name} is now ${ROLE_LABELS[role]}.`)
    setRoleTarget(null)
    refresh()
  }

  const handleRepairAuth = async () => {
    if (!supabase || !repairTarget) return
    const target = repairTarget

    setBusyId(target.id)
    const { error: rpcError } = await supabase.rpc('repair_staff_auth_role', {
      p_user_id: target.id,
    })
    setBusyId(null)

    if (rpcError) {
      toast.error(describeStaffError(rpcError.message))
      return
    }

    toast.success(`Supabase sign-in metadata has been restored for ${target.full_name}.`)
    setRepairTarget(null)
  }

  const isSelf = (row: StaffProfile) => row.id === currentProfile?.id
  const isLastAdmin = (row: StaffProfile) =>
    row.role === 'administrator' &&
    row.is_active &&
    stats.activeAdministrators === 1

  const actionControls = (row: StaffProfile) => {
    const lockedBySelf = isSelf(row)
    const lockedByLastAdmin = isLastAdmin(row)
    const disabled = lockedBySelf || busyId === row.id
    const lockTitle = lockedBySelf
      ? 'You cannot change your own account'
      : lockedByLastAdmin
        ? 'At least one active administrator must remain'
        : undefined

    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {!row.is_active ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            title={lockTitle}
            onClick={() => setStatusAction({ type: 'activate', row })}
            leftIcon={<Check className="size-3.5" aria-hidden="true" />}
          >
            Activate
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || lockedByLastAdmin}
            title={lockTitle}
            onClick={() => setStatusAction({ type: 'deactivate', row })}
            leftIcon={<X className="size-3.5" aria-hidden="true" />}
          >
            Suspend
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          title="Restore standard Supabase sign-in metadata"
          onClick={() => setRepairTarget(row)}
          leftIcon={<KeyRound className="size-3.5" aria-hidden="true" />}
        >
          Fix login
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || lockedByLastAdmin}
          title={lockTitle}
          onClick={() => setRoleTarget(row)}
          leftIcon={<ShieldCheck className="size-3.5" aria-hidden="true" />}
        >
          Role
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration · Module K"
        title="Staff accounts"
        description="Provision TRACE staff, assign roles, and suspend access without deleting archival history."
        badge={<Badge variant="success">Management active</Badge>}
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setCreateOpen(true)}
              leftIcon={<UserPlus className="size-4" aria-hidden="true" />}
            >
              Add staff
            </Button>
            <Button
              variant="secondary"
              onClick={refresh}
              disabled={loading}
              leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      <Alert variant="info" title="Server-enforced provisioning">
        New accounts start <strong>inactive</strong> and must be activated after
        identity verification. You cannot change your own role or status, and
        TRACE will not remove its last active administrator. TRACE roles belong
        in this directory; if Supabase Auth metadata was edited or created
        manually, use <strong>Fix login</strong> to restore standard sign-in.
        Every change is written to the audit trail.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Staff profiles
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-900">
              {loading ? <Skeleton className="h-7 w-10" /> : stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Active accounts
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-900">
              {loading ? <Skeleton className="h-7 w-10" /> : stats.active}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Administrators
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-900">
              {loading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                stats.administrators
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Staff directory</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading profiles…'
                : `${filtered.length} of ${stats.total} profiles shown`}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name, email, or role…"
              className="pl-9"
              aria-label="Filter staff accounts"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {error ? (
            <Alert variant="danger" title="Staff directory unavailable">
              {error}
            </Alert>
          ) : loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-slate-100 pb-3"
                >
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff profiles yet"
              description="Add the first staff account here after the administrator bootstrap is complete."
              action={
                <Button
                  variant="primary"
                  onClick={() => setCreateOpen(true)}
                  leftIcon={<UserPlus className="size-4" aria-hidden="true" />}
                >
                  Add staff
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matching staff profiles"
              description="Try a different name, email address, or role."
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                      <th scope="col" className="py-3 pr-4 font-semibold">
                        Staff member
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Role
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Profile created
                      </th>
                      <th scope="col" className="py-3 pl-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                              {getInitials(row.full_name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {row.full_name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {row.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <RoleBadge role={row.role} />
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={row.is_active ? 'success' : 'warning'}>
                            {row.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="py-3.5 pl-4">{actionControls(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {filtered.map((row) => (
                  <li key={row.id} className="py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                        {getInitials(row.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{row.full_name}</p>
                        <p className="truncate text-xs text-slate-500">{row.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <RoleBadge role={row.role} />
                          <Badge variant={row.is_active ? 'success' : 'warning'}>
                            {row.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pl-12">{actionControls(row)}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs leading-relaxed text-slate-500 shadow-panel">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        Authorization is resolved from the database on every request. The UI
        never supplies a trusted role, and non-admin staff cannot read or modify
        this directory.
      </div>

      {createOpen ? (
        <CreateStaffDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            refresh()
          }}
        />
      ) : null}

      {statusAction ? (
        <ConfirmDialog
          open
          onClose={() => setStatusAction(null)}
          onConfirm={() => {
            void handleStatusChange()
          }}
          title={
            statusAction.type === 'activate'
              ? 'Activate staff account'
              : 'Suspend staff account'
          }
          description={
            statusAction.type === 'activate' ? (
              <>
                <strong>{statusAction.row.full_name}</strong> will be able to
                sign in to TRACE with the assigned role. Confirm that their
                identity has been verified.
              </>
            ) : (
              <>
                <strong>{statusAction.row.full_name}</strong> will immediately
                lose access to TRACE. No archival data is deleted.
              </>
            )
          }
          confirmLabel={statusAction.type === 'activate' ? 'Activate' : 'Suspend'}
          tone={statusAction.type === 'activate' ? 'primary' : 'danger'}
          isLoading={busyId === statusAction.row.id}
        />
      ) : null}

      {roleTarget ? (
        <ChangeRoleDialog
          key={roleTarget.id}
          open
          onClose={() => setRoleTarget(null)}
          onConfirm={(role) => {
            void handleRoleChange(role)
          }}
          staffName={roleTarget.full_name}
          currentRole={roleTarget.role}
          isLoading={busyId === roleTarget.id}
        />
      ) : null}

      {repairTarget ? (
        <ConfirmDialog
          open
          onClose={() => setRepairTarget(null)}
          onConfirm={() => {
            void handleRepairAuth()
          }}
          title="Restore staff sign-in"
          description={
            <>
              Reset <strong>{repairTarget.full_name}</strong>&apos;s Supabase
              authentication role to the standard value. Their TRACE role,
              active status, and archival data are unchanged.
            </>
          }
          confirmLabel="Restore sign-in"
          tone="primary"
          isLoading={busyId === repairTarget.id}
        />
      ) : null}
    </div>
  )
}
