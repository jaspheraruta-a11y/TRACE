const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials':
    'The email or password is incorrect. Check your credentials and try again.',
  'Email not confirmed':
    'This account has not been confirmed yet. Contact the system administrator.',
  'User not found': 'No TRACE account exists for this email address.',
  'Too many requests':
    'Too many sign-in attempts. Wait a few minutes before trying again.',
  'Failed to fetch':
    'TRACE could not reach the authentication service. Check your network connection.',
}

export function describeAuthError(message: string | undefined): string {
  if (!message) return 'Sign-in failed. Please try again.'
  return AUTH_ERROR_MESSAGES[message] ?? message
}
