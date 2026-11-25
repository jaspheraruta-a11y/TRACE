import { useState } from 'react'
import {
  FileCheck2,
  FileText,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { DocumentTable } from '@/components/archive/DocumentTable'
import { MetricCard } from '@/components/archive/MetricCard'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import { listDocuments } from '@/lib/archive/documents'
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/archive/labels'
import { getArchiveReport } from '@/lib/archive/reports'
import type { DocumentVerificationStatus } from '@/lib/supabase/database.types'
import { UploadDocumentDialog } from '@/pages/documents/UploadDocumentDialog'

export function DocumentsPage() {
  useDocumentTitle('Digital documents')
  const { hasRole } = useAuth()
  const canVerify = hasRole('administrator', 'registrar')
  const canDelete = hasRole('administrator', 'registrar')

  const [documentType, setDocumentType] = useState('')
  const [status, setStatus] = useState('')
  const [currentOnly, setCurrentOnly] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  const documents = useAsyncData(
    () =>
      listDocuments({
        documentType: documentType || undefined,
        verificationStatus:
          (status as DocumentVerificationStatus) || undefined,
        currentOnly,
        limit: 200,
      }),
    [documentType, status, currentOnly],
  )

  const report = useAsyncData(() => getArchiveReport(), [])
  const rows = documents.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archive · Module F"
        title="Digital documents"
        description="Private scans attached to student records. Files are never public; staff open them through short-lived signed links that are logged in the audit trail."
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setUploadOpen(true)}
              leftIcon={<Upload className="size-4" aria-hidden="true" />}
            >
              Upload document
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                documents.reload()
                report.reload()
              }}
              disabled={documents.loading}
              leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {report.error ? (
        <Alert variant="warning" title="Document summary unavailable">
          {report.error} The document list below still uses live records.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current documents"
          value={(report.data?.documents.current ?? 0).toLocaleString()}
          hint="Attached to records"
          icon={FileText}
          loading={report.loading}
        />
        <MetricCard
          label="Verified"
          value={(report.data?.documents.verified ?? 0).toLocaleString()}
          hint="Checked by Registrar staff"
          icon={ShieldCheck}
          loading={report.loading}
        />
        <MetricCard
          label="Pending review"
          value={(report.data?.documents.pending ?? 0).toLocaleString()}
          hint="Awaiting verification"
          icon={FileCheck2}
          loading={report.loading}
        />
        <MetricCard
          label="Students with a scan"
          value={(
            report.data?.documents.students_with_current_document ?? 0
          ).toLocaleString()}
          hint="At least one current document"
          icon={FileText}
          loading={report.loading}
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Document register</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {documents.loading
                  ? 'Loading documents…'
                  : `${rows.length.toLocaleString()} document${
                      rows.length === 1 ? '' : 's'
                    } shown`}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              aria-label="Filter by document type"
            >
              <option value="">All document types</option>
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by verification status"
            >
              <option value="">All verification states</option>
              <option value="pending">Pending review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </Select>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={currentOnly}
                onChange={(event) => setCurrentOnly(event.target.checked)}
                className="size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              />
              Current documents only
            </label>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {documents.error ? (
            <Alert variant="danger" title="Documents unavailable">
              {documents.error}
            </Alert>
          ) : documents.loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-slate-100 pb-3"
                >
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <DocumentTable
              documents={rows}
              showStudent
              canVerify={canVerify}
              canDelete={canDelete}
              onChanged={() => {
                documents.reload()
                report.reload()
              }}
              emptyTitle="No matching documents"
              emptyDescription="Upload a scan or adjust the filters. Only current documents are shown by default."
            />
          )}
        </CardContent>
      </Card>

      {uploadOpen ? (
        <UploadDocumentDialog
          open
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            documents.reload()
            report.reload()
          }}
        />
      ) : null}
    </div>
  )
}
