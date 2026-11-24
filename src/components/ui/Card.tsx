import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-panel',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('px-5 pt-5 sm:px-6 sm:pt-6', className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      className={cn(
        'text-base font-semibold tracking-tight text-slate-900',
        className,
      )}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<'p'>) {
  return (
    <p className={cn('mt-1 text-sm text-slate-500', className)} {...props} />
  )
}

export function CardContent({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />
}

export function CardFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-t border-slate-200 px-5 py-3.5 sm:px-6',
        className,
      )}
      {...props}
    />
  )
}
