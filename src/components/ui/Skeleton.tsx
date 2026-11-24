import { cn } from '@/lib/utils'

/**
 * Rendered as a block-level <span> so it stays valid inside text elements
 * such as <p> as well as inside layout containers.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'block animate-pulse rounded-md bg-slate-200/80',
        className,
      )}
      aria-hidden="true"
    />
  )
}
