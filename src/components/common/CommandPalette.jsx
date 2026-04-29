import { memo, useEffect, useRef, useState } from 'react'
import {
  Search, ArrowRight, CheckSquare, Folder,
} from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore from '../../store/useProjectStore'
import { NAV_ITEMS } from '../layout/navigationConfig'

const STATUS_SHORT = {
  'todo': 'todo',
  'in-progress': 'in-prog',
  'review': 'review',
  'done': 'done',
  'blocked': 'blocked',
}

function matchQuery(str, query) {
  return str.toLowerCase().includes(query.toLowerCase())
}

const CommandPalette = memo(function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const setPage    = useSettingsStore((s) => s.setPage)
  const selectTask = useSettingsStore((s) => s.selectTask)
  const tasks      = useTaskStore((s) => s.tasks)
  const projects   = useProjectStore((s) => s.projects)
  const programs   = useProjectStore((s) => s.programs)

  // Build result groups
  const results = (() => {
    const groups = []
    const q = query.trim()

    // Pages
    const pages = (q ? NAV_ITEMS.filter((n) => matchQuery(n.label, q)) : NAV_ITEMS).slice(0, 4)
    if (pages.length) groups.push({ type: 'pages', items: pages })

    if (q) {
      // Tasks
      const matchedTasks = tasks
        .filter((t) => matchQuery(t.title, q))
        .slice(0, 3)
        .map((t) => ({ ...t, _type: 'task' }))
      if (matchedTasks.length) groups.push({ type: 'tasks', items: matchedTasks })

      // Projects
      const matchedProjects = projects
        .filter((p) => matchQuery(p.name, q))
        .slice(0, 3)
        .map((p) => ({ ...p, _type: 'project' }))
      if (matchedProjects.length) groups.push({ type: 'projects', items: matchedProjects })

      // Programs
      const matchedPrograms = programs
        .filter((p) => matchQuery(p.name, q))
        .slice(0, 2)
        .map((p) => ({ ...p, _type: 'program' }))
      if (matchedPrograms.length) groups.push({ type: 'programs', items: matchedPrograms })
    }

    return groups
  })()

  const flatItems = results.flatMap((g) => g.items)
  const clampedIndex = Math.min(activeIndex, flatItems.length - 1)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleSelect = (item) => {
    if (item._type === 'task') {
      selectTask(item.id)
    } else if (item._type === 'project') {
      setPage('projects')
    } else if (item._type === 'program') {
      setPage('projects')
    } else {
      // Nav item
      setPage(item.id)
    }
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (flatItems[clampedIndex]) handleSelect(flatItems[clampedIndex])
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [clampedIndex])

  if (!open) return null

  let flatIdx = 0

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="fixed z-[70] top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-[560px] mx-4 rounded-2xl overflow-hidden anim-slide-up"
        style={{
          background: 'rgba(12,6,24,0.98)',
          border: '1px solid rgba(var(--accent-rgb),0.25)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, pages, projects…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-2" style={{ scrollbarWidth: 'thin' }}>
          {flatItems.length === 0 && (
            <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              No results
            </p>
          )}

          {results.map((group) => (
            <div key={group.type} className="mb-1">
              <p
                className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {group.type}
              </p>

              {group.items.map((item) => {
                const isActive = flatIdx === clampedIndex
                const currentIdx = flatIdx
                flatIdx++

                const Icon = item.icon ?? (item._type === 'task' ? CheckSquare : item._type === 'project' ? Folder : FolderKanban)
                const subtitle = item._type === 'task'
                  ? STATUS_SHORT[item.status] ?? item.status
                  : item._type === 'project'
                    ? 'Project'
                    : item._type === 'program'
                      ? 'Program'
                      : 'Go to page'

                return (
                  <button
                    key={item.id ?? item.label ?? currentIdx}
                    data-active={isActive}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(currentIdx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: isActive ? 'rgba(var(--accent-rgb),0.12)' : 'transparent' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isActive ? 'rgba(var(--accent-rgb),0.2)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Icon size={13} style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.title ?? item.name ?? item.label}
                      </p>
                    </div>
                    <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      {subtitle}
                    </span>
                    {isActive && <ArrowRight size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-3 px-4 py-2 text-[11px]"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
        >
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </div>
    </>
  )
})

export default CommandPalette
