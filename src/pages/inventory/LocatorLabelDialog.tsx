import { QRCodeSVG } from 'qrcode.react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import type { LocationSummaryRow } from '@/lib/archive/inventory'

interface LocatorLabelDialogProps {
  open: boolean
  location: LocationSummaryRow
  onClose: () => void
}

export function LocatorLabelDialog({
  open,
  location,
  onClose,
}: LocatorLabelDialogProps) {
  const print = () => {
    document.body.classList.add('trace-printing-label')
    const cleanup = () => {
      document.body.classList.remove('trace-printing-label')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
    window.setTimeout(cleanup, 1500)
  }

  const parts = [
    location.room ? `Room ${location.room}` : null,
    location.cabinet ? `Cabinet ${location.cabinet}` : null,
    location.shelf ? `Shelf ${location.shelf}` : null,
    location.box_code ? `Box ${location.box_code}` : null,
    location.folder_code ? `Folder ${location.folder_code}` : null,
  ].filter(Boolean)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Locator label"
      description="Print this label and attach it to the physical box or folder."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={print}
            leftIcon={<Printer className="size-4" aria-hidden="true" />}
          >
            Print label
          </Button>
        </>
      }
    >
      <div
        id="trace-locator-label"
        className="mx-auto max-w-sm rounded-xl border-2 border-slate-900 bg-white p-5 text-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase">
              TRACE · Registrar Archive
            </p>
            <p className="mt-2 font-mono text-lg font-bold break-all">
              {location.locator_code}
            </p>
            <p className="mt-1 text-[11px] font-medium">
              {location.archive_category}
            </p>
          </div>
          <QRCodeSVG
            value={`TRACE:${location.locator_code}`}
            size={84}
            level="M"
            marginSize={1}
            aria-label={`QR code for ${location.locator_code}`}
          />
        </div>
        {parts.length > 0 ? (
          <p className="mt-3 border-t border-slate-300 pt-2 text-[10px]">
            {parts.join(' · ')}
          </p>
        ) : null}
        <p className="mt-1 text-[10px] text-slate-600">
          {location.student_count} student record
          {location.student_count === 1 ? '' : 's'} · {location.document_count}{' '}
          document{location.document_count === 1 ? '' : 's'}
        </p>
      </div>
    </Dialog>
  )
}
