import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { cn } from '@/lib/utils'

const SIDEBAR_STORAGE_KEY = 'trace:nav-collapsed'

function readCollapsedPreference(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // A blocked storage API must not break navigation.
    }
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-svh bg-slate-100">
      <a
        href="#main-content"
        className="sr-only z-[110] rounded-lg bg-brand-950 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      <div
        className={cn(
          'flex min-h-svh flex-col transition-[padding] duration-200 ease-out',
          collapsed ? 'lg:pl-[88px]' : 'lg:pl-[272px]',
        )}
      >
        <Topbar
          collapsed={collapsed}
          onOpenMobileNav={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>

        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              TRACE · Transcript and Record Archival and Cataloguing Engine
            </p>
            <p className="flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              Internal system · Authorized Registrar personnel only
            </p>
          </div>
        </footer>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  )
}
