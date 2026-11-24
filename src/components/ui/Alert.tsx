import type { ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

const STYLES: Record<
  AlertVariant,
  { wrapper: string; icon: typeof Info; title: string }
> = {
  info: {
    wrapper: 'border-brand-200 bg-brand-50 text-brand-900',
    icon: Info,
    title: 'text-brand-900',
  },
  success: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: CheckCircle2,
    title: 'text-emerald-900',
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: TriangleAlert,
    title: 'text-amber-900',
  },
  danger: {
    wrapper: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: AlertCircle,
    title: 'text-rose-900',
  },
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  className?: string
  icon?: boolean
}

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  icon = true,
}: AlertProps) {
  const style = STYLES[variant]
  const Icon = variant === 'danger' ? ShieldAlert : style.icon

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3 text-sm',
        style.wrapper,
        className,
      )}
    >
      {icon ? (
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : null}
      <div className="min-w-0 space-y-1">
        {title ? (
          <p className={cn('font-semibold', style.title)}>{title}</p>
        ) : null}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
