import { memo } from 'react'
import { LayoutList, Kanban, SlidersHorizontal, Table2 } from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'

const PAGE_TITLES = {
  dashboard:           'Dashboard',
  tasks:               'All Tasks',
  trash:               'Trash',
  today:               'Planner',
  projects:            'Programs',
  settings:            'Settings',
  'program-dashboard': 'Program Overview',
  timeline:            'Gantt Chart',
}

const Header = memo(function Header({ showViewToggle = false, showFilter = false, onFilter }) {
  const activePage = useSettingsStore((s) => s.activePage)
  const view       = useSettingsStore((s) => s.view)
  const setView    = useSettingsStore((s) => s.setView)
  const filters    = useSettingsStore((s) => s.filters)

  const hasActiveFilters =
    filters.status.length + filters.priority.length + filters.tags.length > 0

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 flex-shrink-0">
      <div>
        {activePage === 'dashboard' ? (
          <>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>
              {greeting}
            </p>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {PAGE_TITLES[activePage]}
            </h1>
          </>
        ) : (
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {PAGE_TITLES[activePage]}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Filter button */}
        {showFilter && (
          <button
            onClick={onFilter}
            className="relative glass rounded-xl p-2.5 transition-colors"
            style={hasActiveFilters
              ? { color: 'var(--accent)', borderColor: 'rgba(var(--accent-rgb),0.4)' }
              : { color: 'var(--text-secondary)' }
            }
            aria-label="Filter tasks"
          >
            <SlidersHorizontal size={16} />
            {hasActiveFilters && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </button>
        )}

        {/* View toggle */}
        {showViewToggle && (
          <div
            className="glass rounded-xl p-1 flex gap-0.5"
          >
            <button
              onClick={() => view !== 'list' && setView('list')}
              className="p-1.5 rounded-lg transition-colors"
              style={view === 'list'
                ? { background: 'var(--accent)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
              }
              aria-label="List view"
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => view !== 'table' && setView('table')}
              className="p-1.5 rounded-lg transition-colors"
              style={view === 'table'
                ? { background: 'var(--accent)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
              }
              aria-label="Table view"
            >
              <Table2 size={15} />
            </button>
            <button
              onClick={() => view !== 'board' && setView('board')}
              className="p-1.5 rounded-lg transition-colors"
              style={view === 'board'
                ? { background: 'var(--accent)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
              }
              aria-label="Board view"
            >
              <Kanban size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
})

export default Header
