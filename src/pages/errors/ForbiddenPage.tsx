import { ArrowLeft, ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function ForbiddenPage() {
  useDocumentTitle('Access restricted')

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md animate-rise rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-panel">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
          <ShieldX className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          Access restricted
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Your staff role does not include this area. If you believe this is an
          error, contact the Registrar administrator.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/dashboard" className={buttonStyles()}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to dashboard
          </Link>
          <Link
            to="/account"
            className={buttonStyles({ variant: 'secondary' })}
          >
            Review my access
          </Link>
        </div>
        <p className="mt-6 border-t border-slate-100 pt-5 text-[11px] text-slate-400">
          Authorization is enforced by database policies as well as the
          interface.
        </p>
      </div>
    </div>
  )
}
