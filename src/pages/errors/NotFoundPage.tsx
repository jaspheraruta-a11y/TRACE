import { ArrowLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md animate-rise rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-panel">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
          <SearchX className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-5 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
          404 · Not found
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          This page does not exist
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          The address may be incorrect, or the page may not be part of this
          phase of TRACE.
        </p>
        <Link
          to="/dashboard"
          className={buttonStyles({ className: 'mt-6 w-full' })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return to dashboard
        </Link>
      </div>
    </div>
  )
}
