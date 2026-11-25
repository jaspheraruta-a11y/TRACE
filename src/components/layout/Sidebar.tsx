import { Archive, ShieldCheck, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { canAccessNavItem, NAV_SECTIONS } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggleCollapse: () => void
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  const { profile } = useAuth()

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        />
      ) : null}

      <aside
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-brand-950 text-slate-300 transition-[width,transform] duration-200 ease-out',
          collapsed ? 'lg:w-[88px]' : 'lg:w-[272px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-brand-300"
            aria-label="TRACE dashboard"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-100 ring-1 ring-white/15">
              <Archive className="size-[18px]" aria-hidden="true" />
            </span>
            <span
              className={cn(
                'min-w-0 leading-tight',
                collapsed && 'lg:sr-only',
              )}
            >
              <span className="block text-[15px] font-semibold tracking-[0.22em] text-white">
                TRACE
              </span>
              <span className="block text-[10px] font-medium tracking-wide text-slate-400">
                Registrar Archive
              </span>
            </span>
          </NavLink>

          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="scrollbar-dark flex-1 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section, index) => {
            const items = section.items.filter((item) =>
              canAccessNavItem(item, profile?.role),
            )
            if (items.length === 0) return null

            return (
              <div
                key={section.id}
                className={cn(index > 0 && 'mt-6 border-t border-white/5 pt-5')}
              >
                <p
                  className={cn(
                    'mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase',
                    collapsed && 'lg:sr-only',
                  )}
                >
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={onCloseMobile}
                          title={collapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            cn(
                              'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                              collapsed && 'lg:justify-center lg:px-0',
                              isActive
                                ? 'bg-white/10 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive ? (
                                <span
                                  className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-300"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <Icon
                                className={cn(
                                  'size-[18px] shrink-0 transition-colors',
                                  isActive
                                    ? 'text-brand-200'
                                    : 'text-slate-500 group-hover:text-slate-300',
                                )}
                                aria-hidden="true"
                              />
                              <span
                                className={cn(
                                  'truncate',
                                  collapsed && 'lg:sr-only',
                                )}
                              >
                                {item.label}
                              </span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div
          className={cn(
            'shrink-0 border-t border-white/10 p-3',
            collapsed && 'lg:px-2',
          )}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'hidden w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 lg:flex',
              collapsed && 'lg:justify-center lg:px-0',
            )}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
          >
            <ShieldCheck className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span className={cn('min-w-0', collapsed && 'lg:sr-only')}>
              <span className="block font-medium text-slate-300">
                Internal use only
              </span>
              <span className="block text-[10px] text-slate-500">
                Archive system · v1.0.0
              </span>
            </span>
          </button>

          <div
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] text-slate-500 lg:hidden',
            )}
          >
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Internal use only · Archive system · v1.0.0
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
