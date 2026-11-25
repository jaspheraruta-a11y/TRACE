/**
 * Turns PostgreSQL and Supabase errors into concise staff-facing messages.
 * The original text is preserved when no specific guidance applies.
 */
export function describeArchiveError(message: string): string {
  const text = message.trim()
  const normalized = text.toLowerCase()

  if (
    normalized.includes('active staff profile') ||
    normalized.includes('authentication required')
  ) {
    return 'Your staff session is no longer active. Sign in again or ask an administrator to activate your account.'
  }

  if (
    normalized.includes('row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('42501')
  ) {
    return 'Your role does not permit this action.'
  }

  if (
    normalized.includes('duplicate key') ||
    normalized.includes('already exists') ||
    normalized.includes('unique constraint')
  ) {
    return 'That value is already in use. Check the archive ID, locator code, or request code.'
  }

  if (normalized.includes('jwt') || normalized.includes('session')) {
    return 'Your session has expired. Sign in again to continue.'
  }

  if (normalized.includes('violates foreign key constraint')) {
    return 'The selected related record no longer exists. Refresh the page and try again.'
  }

  return text || 'The request could not be completed. Please try again.'
}

export function archiveErrorMessage(error: unknown): string {
  if (error instanceof Error) return describeArchiveError(error.message)
  if (typeof error === 'string') return describeArchiveError(error)
  return 'The request could not be completed. Please try again.'
}
