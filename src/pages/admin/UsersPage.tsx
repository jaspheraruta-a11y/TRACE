import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { StaffProfile } from '@/lib/roles'
import { ROLE_LABELS } from '@/lib/roles'
import { supabase } from '@/lib/supabase/client'
import { formatDate, getInitials } from '@/lib/utils'

export function UsersPage() {
  useDocumentTitle('Staff accounts')
  const [rows, setRows] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

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

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.is_active).length,
      administrators: rows.filter((row) => row.role === 'administrator').length,
    }),
    [rows],
  )

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration · Module K"
        title="Staff accounts"
        description="The live directory of TRACE staff profiles and their assigned roles."
        badge={<Badge variant="success">Foundation active</Badge>}
        actions={
          <Button
            variant="secondary"
            onClick={() => setReloadToken((token) => token + 1)}
            leftIcon={<RefreshCw className="size-4" />}
          >
            Refresh
          </Button>
        }
      />

      <Alert variant="info" title="Read-only in Phase 1">
        Account provisioning, activation, and role assignment are completed in
        Phase 2 together with their database policies. This directory reflects
        the real <code className="font-mono text-xs">profiles</code> table and is
        restricted to administrators by row-level security.
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
              description="Provision the first administrator in Supabase, then create staff profiles for the Registrar team."
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
                      <th scope="col" className="py-3 pl-4 text-right font-semibold">
                        Profile created
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
                        <td className="py-3.5 pl-4 text-right text-xs text-slate-500">
                          {formatDate(row.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {filtered.map((row) => (
                  <li key={row.id} className="flex items-start gap-3 py-4">
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
        Role information is read from the database on every request. The
        interface never trusts a role supplied by the browser, and non-admin
        staff cannot read this directory.
      </div>
    </div>
  )
}
