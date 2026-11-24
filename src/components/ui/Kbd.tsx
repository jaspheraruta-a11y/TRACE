import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Kbd({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 font-sans text-[10px] font-semibold text-slate-500',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
