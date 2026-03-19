import { memo } from 'react'
import { LayoutDashboard, ListTodo, CalendarClock, Settings2, FolderKanban, BarChart3, GanttChart, Trash2 } from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import { useTaskStats } from '../../hooks/useFilteredTasks'

const NAV_ITEMS = [
  { id: 'dashboard',         label: 'Home',      icon: LayoutDashboard },
  { id: 'tasks',             label: 'Tasks',     icon: ListTodo        },
  { id: 'today',             label: 'Planner',   icon: CalendarClock   },
  { id: 'projects',          label: 'Programs',  icon: FolderKanban    },
  { id: 'program-dashboard', label: 'Analytics', icon: BarChart3       },
  { id: 'timeline',          label: 'Gantt',     icon: GanttChart      },
  { id: 'trash',             label: 'Trash',     icon: Trash2          },
  { id: 'settings',          label: 'Settings',  icon: Settings2       },
]

const BottomNav = memo(function BottomNav() {
  const activePage = useSettingsStore((s) => s.activePage)
  const setPage    = useSettingsStore((s) => s.setPage)
  const setActiveProject = useSettingsStore((s) => s.setActiveProject)
  const setActiveProgram = useSettingsStore((s) => s.setActiveProgram)
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
      <div className="flex items-stretch h-[60px] overflow-x-auto no-scrollbar px-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = id === 'projects'
            ? activePage === 'projects'
            : activePage === id
          const showDot = id === 'today' && overdue > 0
          return (
            <button
              key={id}
              onClick={() => {
                setPage(id)
                if (id === 'projects') {
                  setActiveProject(null)
                  setActiveProgram(null)
                }
              }}
              className="min-w-[76px] flex-1 shrink-0 flex flex-col items-center justify-center gap-0.5 relative no-select"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}

              <div className="relative">
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
                {showDot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-red-900" />
                )}
              </div>

              <span
                className="text-[9px] font-medium leading-none"
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
