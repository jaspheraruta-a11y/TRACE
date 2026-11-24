import { ArrowLeft, RotateCw, TriangleAlert } from 'lucide-react'
import {
  isRouteErrorResponse,
  Link,
  useRouteError,
} from 'react-router-dom'
import { buttonStyles } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function RouteErrorPage() {
  useDocumentTitle('Something went wrong')
  const error = useRouteError()

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg animate-rise rounded-2xl border border-slate-200 bg-white p-8 shadow-panel">
        <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          TRACE encountered an error
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          The page could not be displayed. Reload the application or return to
          the dashboard. If the problem continues, report the message below to
          the system administrator.
        </p>

        <details className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-600">
            Technical detail
          </summary>
          <code className="mt-2 block break-words font-mono text-[11px] leading-relaxed text-slate-600">
            {detail}
          </code>
        </details>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonStyles({ className: 'flex-1' })}
          >
            <RotateCw className="size-4" aria-hidden="true" />
            Reload application
          </button>
          <Link
            to="/dashboard"
            className={buttonStyles({
              variant: 'secondary',
              className: 'flex-1',
            })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
