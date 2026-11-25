const ACTION_LABELS: Record<string, string> = {
  'auth.sign_in': 'Signed in to TRACE',
  'student.create': 'Created a student record',
  'student.update': 'Updated a student record',
  'student.archive': 'Archived a student record',
  'student.restore': 'Restored a student record',
  'academic.create': 'Added a high school year',
  'academic.update': 'Updated a high school year',
  'academic.delete': 'Removed a high school year',
  'subject.create': 'Added a subject',
  'subject.update': 'Updated a subject',
  'subject.delete': 'Removed a subject',
  'document.upload': 'Uploaded a document',
  'document.replace': 'Replaced a document',
  'document.verify': 'Verified a document',
  'document.reject': 'Rejected a document',
  'document.reopen': 'Reopened a document for review',
  'document.update': 'Updated document metadata',
  'document.delete': 'Deleted a document',
  'document.view': 'Viewed a private document',
  'location.create': 'Created a storage location',
  'location.update': 'Updated a storage location',
  'location.delete': 'Deleted a storage location',
  'location.assign': 'Changed a physical locator',
  'request.create': 'Created a retrieval request',
  'request.update': 'Updated a retrieval request',
  'request.status_change': 'Changed a request status',
  'request.verification': 'Changed requester verification',
  'request.assign': 'Assigned a retrieval request',
  'request.release': 'Released a record',
  'request.delete': 'Deleted a retrieval request',
  'user.update': 'Updated a staff account',
  'staff.create': 'Created a staff account',
  'staff.activate': 'Activated a staff account',
  'staff.deactivate': 'Suspended a staff account',
  'staff.role_change': 'Changed a staff role',
}

export function describeAuditAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  return action
    .replace(/[._]/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase())
}
