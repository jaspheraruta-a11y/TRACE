import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface MetricCardProps {
  label: string
  value: number | string
  hint?: string
  icon?: LucideIcon
  loading?: boolean
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
            {label}
          </p>
          {Icon ? (
            <Icon className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
          ) : null}
        </div>
        <p className="mt-1.5 text-2xl font-semibold text-slate-900">
          {loading ? <Skeleton className="h-7 w-14" /> : value}
        </p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
