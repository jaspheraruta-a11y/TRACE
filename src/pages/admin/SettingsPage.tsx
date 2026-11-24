import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Database,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  getSupabaseProjectHost,
  supabase,
  supabaseConfig,
} from '@/lib/supabase/client'
import type { Json, SystemSettingRow } from '@/lib/supabase/database.types'
import { formatDateTime } from '@/lib/utils'

function readSchemaVersion(settings: SystemSettingRow[]): string | null {
  const row = settings.find((entry) => entry.key === 'schema_version')
  if (!row) return null
  const value: Json = row.value
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const version = value.version
    if (typeof version === 'string') return version
  }
  return null
}

export function SettingsPage() {
  useDocumentTitle('System settings')
  const [settings, setSettings] = useState<SystemSettingRow[]>([])
  const [adminCount, setAdminCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const projectHost = getSupabaseProjectHost()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setError('Supabase is not configured.')
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    void Promise.all([
      supabase
        .from('system_settings')
        .select('*')
        .order('key', { ascending: true }),
      supabase
        .from('profiles')
        .select('id')
        .eq('role', 'administrator')
        .eq('is_active', true),
    ]).then(([settingsResult, adminResult]) => {
      if (!active) return

      if (settingsResult.error) {
        setError(settingsResult.error.message)
        setLoading(false)
        return
      }

      setSettings(settingsResult.data ?? [])
      setAdminCount(adminResult.error ? null : (adminResult.data ?? []).length)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [reloadToken])

  const schemaVersion = useMemo(() => readSchemaVersion(settings), [settings])

  const checklist = [
    {
      label: 'Environment variables',
      detail: supabaseConfig.isConfigured
        ? 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present at build time.'
        : 'Missing Supabase environment variables.',
      ready: supabaseConfig.isConfigured,
    },
    {
      label: 'Foundation migration',
      detail: schemaVersion
        ? `system_settings reports schema ${schemaVersion}.`
        : 'Apply the Phase 1 migration to create profiles, audit logs, and settings.',
      ready: Boolean(schemaVersion),
    },
    {
      label: 'Seed data',
      detail:
        settings.length > 0
          ? `${settings.length} system setting${settings.length === 1 ? '' : 's'} present.`
          : 'Run supabase/seed.sql after the migration.',
      ready: settings.length > 0,
    },
    {
      label: 'Administrator account',
      detail:
        adminCount === null
          ? 'Administrator count could not be read.'
          : adminCount > 0
            ? `${adminCount} active administrator${adminCount === 1 ? '' : 's'}.`
            : 'Provision the first administrator using the README bootstrap snippet.',
      ready: Boolean(adminCount && adminCount > 0),
    },
    {
      label: 'RLS verification',
      detail:
        'Policies are defined in the migration. Verify them with a non-admin test account before deployment.',
      ready: false,
    },
    {
      label: 'Private document storage',
      detail: 'Bucket and signed-URL policies arrive with Phase 7.',
      ready: false,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration · System"
        title="System settings"
        description="Verified configuration and deployment posture for this TRACE environment."
        badge={<Badge variant="outline">Read-only</Badge>}
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

      <Alert variant="info" title="Configuration visibility only">
        Phase 1 exposes the real environment and schema state. Editable school
        identity and archive defaults are introduced with the settings module
        after their validation and audit requirements are implemented.
      </Alert>

      {error ? (
        <Alert variant="danger" title="Settings could not be loaded">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200">
              <ServerCog className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Environment</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Client-side configuration. No secret values are displayed.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Supabase project
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {projectHost ?? 'Not configured'}
                </p>
              </div>
              <Badge variant={projectHost ? 'success' : 'danger'}>
                {projectHost ? 'Connected' : 'Missing'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Public anon key
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Publishable key loaded from the environment.
                </p>
              </div>
              <Badge
                variant={supabaseConfig.isConfigured ? 'success' : 'danger'}
              >
                {supabaseConfig.isConfigured ? 'Loaded' : 'Missing'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Service-role key in browser
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Must never be prefixed with VITE_ or shipped to the client.
                </p>
              </div>
              <Badge variant="success">Not used</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Private document bucket
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Scans will use private storage and short-lived signed URLs.
                </p>
              </div>
              <Badge variant="warning">Phase 7</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200">
              <Database className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Deployment checklist</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Checks derived from the connected project.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklist.map((item) => (
              <div key={item.label} className="flex gap-3">
                {item.ready ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="mt-0.5 size-4 shrink-0 text-amber-400"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>System settings records</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Read from{' '}
              <code className="font-mono text-xs">public.system_settings</code>.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : settings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
                No settings found. Apply the seed file to record the schema
                version and archive defaults.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                      <th scope="col" className="py-3 pr-4 font-semibold">
                        Key
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Value
                      </th>
                      <th scope="col" className="py-3 pl-4 text-right font-semibold">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {settings.map((row) => (
                      <tr key={row.key}>
                        <td className="py-3 pr-4 align-top">
                          <p className="font-mono text-xs text-slate-800">
                            {row.key}
                          </p>
                          {row.description ? (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {row.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <code className="block max-w-md overflow-x-auto font-mono text-[11px] text-slate-600">
                            {JSON.stringify(row.value)}
                          </code>
                        </td>
                        <td className="py-3 pl-4 text-right align-top text-[11px] text-slate-500">
                          {formatDateTime(row.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security posture</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3.5 text-xs leading-relaxed text-slate-600">
              <li className="flex gap-2.5">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                Row-level security is enabled on profiles, audit logs, and
                system settings in the Phase 1 migration.
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                Administrator checks require an active profile and are resolved
                server-side, never from client-supplied role claims.
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                Audit inserts go through a controlled function; staff have no
                update or delete privilege on the log.
              </li>
              <li className="flex gap-2.5">
                <Circle
                  className="mt-0.5 size-4 shrink-0 text-amber-400"
                  aria-hidden="true"
                />
                Policies must be verified against the live project with a
                non-admin account before deployment.
              </li>
            </ul>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                Migration
              </p>
              <code className="mt-1.5 block break-all font-mono text-[11px] text-slate-600">
                supabase/migrations/20261124090000_phase1_foundation.sql
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
