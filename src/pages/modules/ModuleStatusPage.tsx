import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { buttonStyles } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ARCHIVE_MODULES } from '@/lib/modules'

export function ModuleStatusPage({ moduleId }: { moduleId: string }) {
  const module = ARCHIVE_MODULES.find((entry) => entry.id === moduleId)

  if (!module) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Module not found"
          description="This module is not part of the TRACE roadmap."
        />
        <Link to="/dashboard" className={buttonStyles({ variant: 'secondary' })}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return to dashboard
        </Link>
      </div>
    )
  }

  const Icon = module.icon
  const isFoundation = module.state === 'foundation'
  const phase = String(module.phase).padStart(2, '0')

  return <ModuleContent key={module.id} module={module} Icon={Icon} isFoundation={isFoundation} phase={phase} />
}

function ModuleContent({
  module,
  Icon,
  isFoundation,
  phase,
}: {
  module: (typeof ARCHIVE_MODULES)[number]
  Icon: (typeof ARCHIVE_MODULES)[number]['icon']
  isFoundation: boolean
  phase: string
}) {
  useDocumentTitle(module.name)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Module ${module.code} · ${isFoundation ? 'Foundation active' : 'Planned'}`}
        title={module.name}
        description={module.summary}
        badge={
          <Badge variant={isFoundation ? 'success' : 'warning'}>
            {isFoundation ? 'Foundation active' : `Phase ${module.phase}`}
          </Badge>
        }
        actions={
          <Link
            to="/dashboard"
            className={buttonStyles({ variant: 'secondary' })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Dashboard
          </Link>
        }
      />

      <Alert
        variant={isFoundation ? 'success' : 'info'}
        title={
          isFoundation
            ? 'Foundation capabilities are active'
            : `Scheduled for Phase ${module.phase}`
        }
      >
        {isFoundation
          ? 'The foundation for this module is installed. Full management workflows are completed in a later phase.'
          : 'This module is not installed yet. No sample records or inactive controls are shown — the screen becomes functional only when its schema, policies, and workflows are complete and tested.'}
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>What this module will do</CardTitle>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {module.purpose}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
              Planned capabilities
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {module.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm text-slate-600"
                >
                  <Circle
                    className="mt-1 size-3 shrink-0 text-brand-400"
                    aria-hidden="true"
                  />
                  <span className="leading-relaxed">{capability}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-lg border border-slate-200 px-4 py-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Security comes with the module
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Each module ships with its tables, row-level security
                    policies, validation, and permission tests. A screen is
                    never enabled against unprotected data.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-brand-900 bg-brand-950 text-white shadow-raised">
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-brand-300 uppercase">
                    Implementation phase
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                    {phase}
                    <span className="ml-1 text-sm font-normal text-slate-400">
                      / 12
                    </span>
                  </p>
                </div>
                <Layers className="size-5 text-brand-300" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                {module.name} is delivered after the modules it depends on, so
                that records, permissions, and audit coverage are already in
                place.
              </p>
              <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-slate-400">
                <p className="flex items-center gap-2">
                  <CheckCircle2
                    className="size-3.5 text-emerald-400"
                    aria-hidden="true"
                  />
                  Phase 1 foundation is complete
                </p>
                <p className="flex items-center gap-2">
                  <Circle
                    className="size-3.5 text-slate-500"
                    aria-hidden="true"
                  />
                  Module delivery scheduled for Phase {module.phase}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available today</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Foundation capabilities already protecting this module.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {module.availableNow.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-slate-600">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Link
            to="/account"
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-panel transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Review your access scope
            <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
