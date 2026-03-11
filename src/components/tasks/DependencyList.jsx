import { memo, useState, useMemo } from 'react'
import { X, Search, Link2, AlertTriangle } from 'lucide-react'
import useTaskStore from '../../store/useTaskStore'
import { StatusBadge } from '../common/Badge'

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' }

const DependencyList = memo(function DependencyList({ taskId }) {
  const tasks          = useTaskStore((s) => s.tasks)
  const addDependency  = useTaskStore((s) => s.addDependency)
  const removeDependency = useTaskStore((s) => s.removeDependency)

  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const task = tasks.find((t) => t.id === taskId)
  const dependsOn = task?.dependsOn ?? []

  // Tasks this task depends on
  const depTasks = useMemo(
    () => dependsOn.map((id) => tasks.find((t) => t.id === id)).filter(Boolean),
    [dependsOn, tasks]
  )

  // Available tasks to add as dependencies (exclude self, existing deps)
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return tasks
      .filter((t) =>
        t.id !== taskId &&
        !dependsOn.includes(t.id) &&
        (t.title.toLowerCase().includes(q) || t.tags?.some((tag) => tag.includes(q)))
      )
      .slice(0, 8)
  }, [search, tasks, taskId, dependsOn])

  const handleAdd = (depId) => {
    addDependency(taskId, depId)
    setSearch('')
    setShowPicker(false)
  }

  return (
    <div className="space-y-3">
      {/* Warning if this task has incomplete dependencies */}
      {depTasks.some((t) => t.status !== 'done') && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
        >
          <AlertTriangle size={13} />
          This task has incomplete dependencies
        </div>
      )}

      {/* Existing dependencies */}
      {depTasks.length > 0 ? (
        <div className="space-y-1.5">
          {depTasks.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl group"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Link2 size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: PRIORITY_COLOR[dep.priority] }} />
              <span className="flex-1 text-xs truncate"
                style={{ color: dep.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)',
                         textDecoration: dep.status === 'done' ? 'line-through' : 'none' }}>
                {dep.title}
              </span>
              <StatusBadge status={dep.status} size="xs" />
              <button
                onClick={() => removeDependency(taskId, dep.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: '#ef4444' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-center py-3" style={{ color: 'var(--text-secondary)' }}>
          No dependencies set
        </p>
      )}

      {/* Add dependency */}
      {showPicker ? (
        <div>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks to block on…"
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="rounded-xl overflow-hidden"
              style={{ background: '#1a1025', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
              {searchResults.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleAdd(t.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: PRIORITY_COLOR[t.priority] }} />
                  <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                  <StatusBadge status={t.status} size="xs" />
                </button>
              ))}
            </div>
          )}
          {search && searchResults.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)' }}>
              No matching tasks
            </p>
          )}
          <button
            onClick={() => { setShowPicker(false); setSearch('') }}
            className="mt-2 w-full text-xs py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-colors"
          style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--accent)', border: '1px dashed rgba(var(--accent-rgb),0.3)' }}
        >
          <Link2 size={12} />
          Add dependency
        </button>
      )}
    </div>
  )
})

export default DependencyList
