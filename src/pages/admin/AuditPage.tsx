import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  RefreshCw,
  ScrollText,
  Search,
  SearchX,
  ShieldCheck,
} from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { describeAuditAction } from '@/lib/audit'
import { supabase } from '@/lib/supabase/client'
import type { AuditLogRow } from '@/lib/supabase/database.types'
import { formatDateTime, formatRelative } from '@/lib/utils'

export function AuditPage() {
  useDocumentTitle('Audit trail')
  const [rows, setRows] = useState<AuditLogRow[]>([])
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
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
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
    const actors = new Set(
      rows.map((row) => row.actor_email).filter(Boolean) as string[],
    )
    return {
      events: rows.length,
      actors: actors.size,
      latest: rows[0]?.created_at ?? null,
    }
  }, [rows])

  const filtered = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      [
        describeAuditAction(row.action),
        row.action,
        row.actor_email ?? '',
        row.entity_type,
        row.entity_id ?? '',
        row.summary ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [rows, deferredQuery])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration · Module J"
        title="Audit trail"
        description="Append-only accountability for sign-ins and privileged archival activity."
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

      <Alert variant="info" title="Append-only by design">
        Audit entries are inserted through a security-definer database function
        that derives the actor from the authenticated session. No update or
        delete policy exists for staff roles, and the table is readable only by
        administrators.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Events loaded
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-900">
              {loading ? <Skeleton className="h-7 w-10" /> : stats.events}
            </p>
            <p className="mt-1 text-xs text-slate-500">Most recent 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Distinct actors
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-900">
              {loading ? <Skeleton className="h-7 w-10" /> : stats.actors}
            </p>
            <p className="mt-1 text-xs text-slate-500">Staff accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Latest event
            </p>
            <p className="mt-1.5 text-sm font-semibold text-slate-900">
              {loading ? (
                <Skeleton className="h-5 w-24" />
              ) : stats.latest ? (
                formatRelative(stats.latest)
              ) : (
                'No events yet'
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {stats.latest ? formatDateTime(stats.latest) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Activity log</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading events…'
                : `${filtered.length} of ${stats.events} events shown`}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by action, actor, or record…"
              className="pl-9"
              aria-label="Filter audit events"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {error ? (
            <Alert variant="danger" title="Audit trail unavailable">
              {error}
            </Alert>
          ) : loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-slate-100 pb-3"
                >
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No audit events recorded"
              description="Sign-in events are written after a successful authentication. Record, document, and release events will appear as their modules are activated."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matching events"
              description="Try a different action, staff email, or record identifier."
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                      <th scope="col" className="py-3 pr-4 font-semibold">
                        Event
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Actor
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Related record
                      </th>
                      <th scope="col" className="py-3 pl-4 text-right font-semibold">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 pr-4">
                          <p className="font-medium text-slate-900">
                            {describeAuditAction(row.action)}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                            {row.action}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {row.actor_email ?? 'System'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          <span className="font-medium text-slate-700">
                            {row.entity_type}
                          </span>
                          {row.entity_id ? (
                            <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                              {row.entity_id.length > 18
                                ? `${row.entity_id.slice(0, 18)}…`
                                : row.entity_id}
                            </span>
                          ) : null}
                          {row.summary ? (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {row.summary}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <p className="text-xs text-slate-700">
                            {formatDateTime(row.created_at)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatRelative(row.created_at)}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 lg:hidden">
                {filtered.map((row) => (
                  <li key={row.id} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {describeAuditAction(row.action)}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                          {row.action}
                        </p>
                      </div>
                      <time
                        dateTime={row.created_at}
                        className="shrink-0 text-[10px] text-slate-400"
                      >
                        {formatRelative(row.created_at)}
                      </time>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      {row.actor_email ?? 'System'} · {row.entity_type}
                      {row.entity_id ? ` · ${row.entity_id.slice(0, 12)}…` : ''}
                    </p>
                    {row.summary ? (
                      <p className="mt-1 text-xs text-slate-500">{row.summary}</p>
                    ) : null}
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
        Audit metadata is deliberately limited. Do not place passwords,
        document contents, or unnecessary personal information in audit
        summaries.
      </div>
    </div>
  )
}
