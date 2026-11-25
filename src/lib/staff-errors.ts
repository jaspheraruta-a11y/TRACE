const MESSAGES: Array<{ match: RegExp; message: string }> = [
  {
    match: /already exists/i,
    message: 'An account with this email address already exists.',
  },
  {
    match: /at least one active administrator/i,
    message: 'At least one active administrator must remain.',
  },
  {
    match: /own account/i,
    message: 'You cannot change the role or status of your own account.',
  },
  {
    match: /already (?:active|inactive|has this role)/i,
    message: 'That change has already been applied. Refresh the directory.',
  },
  {
    match: /administrator access required|active staff profile/i,
    message: 'Administrator access is required for this action.',
  },
  {
    match: /authentication required|jwt/i,
    message: 'Your session expired. Sign in again and retry.',
  },
  {
    match: /valid staff email/i,
    message: 'Enter a valid staff email address.',
  },
  {
    match: /temporary password/i,
    message: 'The temporary password must be between 8 and 128 characters.',
  },
  {
    match: /full name/i,
    message: 'Full name must be between 2 and 160 characters.',
  },
  {
    match: /not found/i,
    message: 'That staff account no longer exists. Refresh the directory.',
  },
]

export function describeStaffError(message: string | undefined): string {
  if (!message) return 'Unable to update the staff account. Please try again.'
  const match = MESSAGES.find((entry) => entry.match.test(message))
  return match?.message ?? message
}
