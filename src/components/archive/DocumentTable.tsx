import { useState } from 'react'
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DocumentStatusBadge } from '@/components/archive/StatusBadges'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  deleteDocument,
  getSignedDocumentUrl,
  verifyDocument,
  type DocumentWithStudent,
} from '@/lib/archive/documents'
import { formatDateTime } from '@/lib/utils'

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentTableProps {
  documents: DocumentWithStudent[]
  showStudent?: boolean
  canVerify?: boolean
  canDelete?: boolean
  onChanged: () => void
  emptyTitle?: string
  emptyDescription?: string
}

export function DocumentTable({
  documents,
  showStudent = false,
  canVerify = false,
  canDelete = false,
  onChanged,
  emptyTitle = 'No documents yet',
  emptyDescription = 'Upload a PDF, JPG, or PNG scan to attach it to this record.',
}: DocumentTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentWithStudent | null>(
    null,
  )

  const openDocument = async (document: DocumentWithStudent) => {
    setBusyId(document.id)
    try {
      const url = await getSignedDocumentUrl(document)
      const link = window.document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      window.document.body.append(link)
      link.click()
      link.remove()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The document could not be opened.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const setStatus = async (
    document: DocumentWithStudent,
    status: 'verified' | 'rejected',
  ) => {
    setBusyId(document.id)
    try {
      await verifyDocument(document.id, status)
      toast.success(
        status === 'verified'
          ? 'Document marked as verified.'
          : 'Document marked as rejected.',
      )
      onChanged()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The document could not be updated.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setBusyId(target.id)
    try {
      await deleteDocument(target)
      toast.success('Document removed from the archive.')
      setDeleteTarget(null)
      onChanged()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'The document could not be removed.',
      )
    } finally {
      setBusyId(null)
    }
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
              <th className="py-3 pr-4 font-semibold">Document</th>
              {showStudent ? (
                <th className="px-4 py-3 font-semibold">Student</th>
              ) : null}
              <th className="px-4 py-3 font-semibold">Uploaded</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="py-3 pl-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => {
              const isImage = document.mime_type?.startsWith('image/')
              return (
                <tr key={document.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        {isImage ? (
                          <ImageIcon className="size-4" aria-hidden="true" />
                        ) : (
                          <FileText className="size-4" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">
                          {document.document_type}
                        </span>
                        <span className="block max-w-64 truncate text-xs text-slate-500">
                          {document.file_name}
                        </span>
                      </span>
                    </div>
                  </td>
                  {showStudent ? (
                    <td className="px-4 py-3.5">
                      {document.student ? (
                        <Link
                          to={`/students/${document.student.id}`}
                          className="block max-w-52 truncate text-xs font-medium text-brand-700 hover:underline"
                        >
                          {document.student.full_name}
                          <span className="block font-mono text-[10px] text-slate-500">
                            {document.student.archive_id}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    {formatDateTime(document.uploaded_at)}
                    {!document.is_current ? (
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        Superseded
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    {formatBytes(document.file_size)}
                  </td>
                  <td className="px-4 py-3.5">
                    <DocumentStatusBadge status={document.verification_status} />
                  </td>
                  <td className="py-3.5 pl-4">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === document.id}
                        onClick={() => void openDocument(document)}
                        leftIcon={<Eye className="size-3.5" aria-hidden="true" />}
                      >
                        Open
                      </Button>
                      {canVerify && document.verification_status !== 'verified' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === document.id}
                          onClick={() => void setStatus(document, 'verified')}
                          leftIcon={
                            <CheckCircle2
                              className="size-3.5 text-emerald-600"
                              aria-hidden="true"
                            />
                          }
                        >
                          Verify
                        </Button>
                      ) : null}
                      {canVerify && document.verification_status !== 'rejected' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === document.id}
                          onClick={() => void setStatus(document, 'rejected')}
                          leftIcon={
                            <XCircle
                              className="size-3.5 text-rose-600"
                              aria-hidden="true"
                            />
                          }
                        >
                          Reject
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          disabled={busyId === document.id}
                          onClick={() => setDeleteTarget(document)}
                          leftIcon={
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          }
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Download className="size-3" aria-hidden="true" />
        Files open through a short-lived private link. Every access is recorded in
        the audit trail.
      </p>

      {deleteTarget ? (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          title="Delete document"
          description={
            <>
              <strong>{deleteTarget.document_type}</strong> (
              {deleteTarget.file_name}) will be removed from the archive and its
              private file will be deleted. The audit trail keeps a record of the
              deletion.
            </>
          }
          confirmLabel="Delete document"
          tone="danger"
          isLoading={busyId === deleteTarget.id}
        />
      ) : null}
    </>
  )
}
