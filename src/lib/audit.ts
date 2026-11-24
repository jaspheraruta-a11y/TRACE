const ACTION_LABELS: Record<string, string> = {
  'auth.sign_in': 'Signed in to TRACE',
  'student.create': 'Created a student record',
  'student.update': 'Updated a student record',
  'student.archive': 'Archived a student record',
  'student.restore': 'Restored a student record',
  'document.upload': 'Uploaded a document',
  'document.replace': 'Replaced a document',
  'document.verify': 'Verified a document',
  'document.view': 'Viewed a document',
  'request.create': 'Created a retrieval request',
  'request.update': 'Updated a retrieval request',
  'request.release': 'Released a record',
  'location.update': 'Updated a storage location',
  'user.update': 'Updated a staff account',
}

export function describeAuditAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  return action
    .replace(/[._]/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase())
}
