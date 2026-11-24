import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({
  className,
  label = 'Loading',
}: {
  className?: string
  label?: string
}) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <Loader2
        className={cn('size-4 animate-spin text-brand-600', className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function FullPageLoader({ label = 'Loading TRACE' }: { label?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-100">
      <div className="flex size-12 items-center justify-center rounded-xl bg-brand-950 text-white shadow-raised">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  )
}
