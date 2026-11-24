import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CornerDownLeft,
  LogOut,
  Search,
  SearchX,
  UserRound,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Kbd } from '@/components/ui/Kbd'
import { useAuth } from '@/context/AuthContext'
import { getModuleByPath } from '@/lib/modules'
import {
  ACCOUNT_NAV_ITEM,
  canAccessNavItem,
  NAV_SECTIONS,
} from '@/lib/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface PaletteEntry {
  id: string
  label: string
  section: string
  icon: LucideIcon
  keywords: string[]
  to?: string
  action?: 'sign_out'
  meta: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const entries = useMemo<PaletteEntry[]>(() => {
    const items: PaletteEntry[] = NAV_SECTIONS.flatMap((section) =>
      section.items
        .filter((item) => canAccessNavItem(item, profile?.role))
        .map((item) => {
          const module = getModuleByPath(item.to)
          return {
            id: item.to,
            label: item.label,
            section: section.label,
            icon: item.icon,
            keywords: item.keywords ?? [],
            to: item.to,
            meta: module ? `Phase ${module.phase}` : 'Module',
          }
        }),
    )

    items.push({
      id: ACCOUNT_NAV_ITEM.to,
      label: ACCOUNT_NAV_ITEM.label,
      section: 'Account',
      icon: UserRound,
      keywords: ACCOUNT_NAV_ITEM.keywords ?? [],
      to: ACCOUNT_NAV_ITEM.to,
      meta: 'Profile',
    })

    items.push({
      id: 'sign-out',
      label: 'Sign out of TRACE',
      section: 'Session',
      icon: LogOut,
      keywords: ['logout', 'exit', 'sign out'],
      action: 'sign_out',
      meta: 'Security',
    })

    return items
  }, [profile?.role])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return entries
    return entries.filter((entry) =>
      [entry.label, entry.section, entry.meta, ...entry.keywords]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [entries, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const element = document.getElementById(`palette-option-${activeIndex}`)
    element?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  async function selectEntry(entry: PaletteEntry | undefined) {
    if (!entry) return

    if (entry.action === 'sign_out') {
      setIsSigningOut(true)
      try {
        await signOut()
        toast.success('You have been signed out.')
        onClose()
        navigate('/login', { replace: true })
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Unable to sign out.',
        )
        setIsSigningOut(false)
      }
      return
    }

    if (entry.to) {
      navigate(entry.to)
      onClose()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filtered.length === 0) return
      setActiveIndex((index) => (index + 1) % filtered.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filtered.length === 0) return
      setActiveIndex(
        (index) => (index - 1 + filtered.length) % filtered.length,
      )
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (!isSigningOut) void selectEntry(filtered[activeIndex])
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 pt-[10vh] pb-8 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="TRACE command palette"
        className="w-full max-w-xl animate-rise overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-autocomplete="list"
            aria-activedescendant={
              filtered.length > 0
                ? `palette-option-${activeIndex}`
                : undefined
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to a module, page, or action…"
            aria-label="Search TRACE destinations"
            className="h-14 w-full border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div
          id="palette-results"
          role="listbox"
          aria-label="TRACE destinations"
          className="scrollbar-slim max-h-[52vh] overflow-y-auto p-2"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <SearchX
                className="mb-3 size-6 text-slate-300"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-slate-700">
                No matching destination
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try a module name such as “students”, “inventory”, or “audit”.
              </p>
            </div>
          ) : (
            filtered.map((entry, index) => {
              const Icon = entry.icon
              const isActive = index === activeIndex
              return (
                <button
                  key={entry.id}
                  id={`palette-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    if (!isSigningOut) void selectEntry(entry)
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-slate-100' : 'bg-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                      entry.action === 'sign_out'
                        ? 'bg-rose-50 text-rose-600 ring-rose-100'
                        : 'bg-white text-slate-500 ring-slate-200',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {entry.label}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {entry.section}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                    {entry.meta}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>
                <CornerDownLeft className="size-2.5" aria-hidden="true" />
              </Kbd>
              <span>open</span>
            </span>
          </span>
          <span className="hidden sm:inline">
            Archive pages activate as their phases are completed
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
