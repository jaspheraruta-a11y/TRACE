import { clsx, type ClassValue } from 'clsx'
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()

  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

function toDate(value: string | Date): Date | null {
  const date = typeof value === 'string' ? parseISO(value) : value
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  return date ? format(date, 'd MMM yyyy') : '—'
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  return date ? format(date, 'd MMM yyyy, h:mm a') : '—'
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  if (!date) return '—'
  return `${formatDistanceToNowStrict(date)} ago`
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'An unexpected error occurred. Please try again.'
}
