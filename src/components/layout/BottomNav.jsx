import { memo } from 'react'
import { LayoutDashboard, ListTodo, CalendarClock, Settings2 } from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import { useTaskStats } from '../../hooks/useFilteredTasks'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'tasks',     label: 'Tasks',    icon: ListTodo        },
  { id: 'today',     label: 'Today',    icon: CalendarClock   },
  { id: 'settings',  label: 'Settings', icon: Settings2       },
]

const BottomNav = memo(function BottomNav() {
  const activePage = useSettingsStore((s) => s.activePage)
  const setPage    = useSettingsStore((s) => s.setPage)
  const { overdue } = useTaskStats()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 safe-bottom"
      style={{
        background: 'rgba(10,0,21,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-stretch h-[60px]">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id
          const showDot = id === 'today' && overdue > 0
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative no-select"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}

              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                {showDot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-black" />
                )}
              </div>

              <span
                className="text-[10px] font-medium leading-none"
                style={isActive ? { color: 'var(--accent)' } : {}}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
})

export default BottomNav
