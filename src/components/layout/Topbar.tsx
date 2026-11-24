import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeft,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Kbd } from '@/components/ui/Kbd'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { useAuth } from '@/context/AuthContext'
import { getBreadcrumb } from '@/lib/navigation'
import { roleLabel } from '@/lib/roles'
import { getInitials } from '@/lib/utils'

interface TopbarProps {
  collapsed: boolean
  onOpenMobileNav: () => void
  onToggleCollapse: () => void
  onOpenPalette: () => void
}

export function Topbar({
  collapsed,
  onOpenMobileNav,
  onToggleCollapse,
  onOpenPalette,
}: TopbarProps) {
  const { profile, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const breadcrumb = getBreadcrumb(location.pathname)
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
      toast.success('You have been signed out.')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to sign out.',
      )
      setIsSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:flex"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
        >
          <PanelLeft className="size-[18px]" aria-hidden="true" />
        </button>

        <div className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
          <span className="truncate text-slate-400">{breadcrumb.section}</span>
          <ChevronRight
            className="size-3.5 shrink-0 text-slate-300"
            aria-hidden="true"
          />
          <span className="truncate font-medium text-slate-700">
            {breadcrumb.item}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenPalette}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-600 md:w-64"
            aria-label="Search TRACE — open command palette"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden flex-1 text-left md:inline">
              Search TRACE…
            </span>
            <span className="hidden items-center gap-0.5 md:flex">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 items-center gap-2 rounded-lg py-1 pr-1 pl-1 transition-colors hover:bg-slate-100 sm:pr-2"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open account menu"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-900 ring-1 ring-brand-200">
                {getInitials(profile?.full_name ?? 'Staff')}
              </span>
              <span className="hidden min-w-0 text-left lg:block">
                <span className="block max-w-[150px] truncate text-xs font-semibold text-slate-800">
                  {profile?.full_name}
                </span>
                <span className="block text-[10px] text-slate-500">
                  {roleLabel(profile?.role)}
                </span>
              </span>
              <ChevronDown
                className="size-3.5 text-slate-400"
                aria-hidden="true"
              />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute top-full right-0 z-50 mt-2 w-72 origin-top-right animate-rise rounded-xl border border-slate-200 bg-white p-1.5 shadow-raised"
              >
                <div className="border-b border-slate-100 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {profile?.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {profile?.email}
                      </p>
                    </div>
                    <RoleBadge role={profile?.role} />
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/account"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserRound
                      className="size-4 text-slate-400"
                      aria-hidden="true"
                    />
                    My account
                  </Link>
                  {isAdmin ? (
                    <Link
                      to="/admin/settings"
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings
                        className="size-4 text-slate-400"
                        aria-hidden="true"
                      />
                      System settings
                    </Link>
                  ) : null}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    {isSigningOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
