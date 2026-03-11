import { memo } from 'react'
import { X } from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import useProjectStore from '../../store/useProjectStore'

const STATUSES   = ['todo', 'in-progress', 'review', 'done', 'blocked']
const PRIORITIES = ['critical', 'high', 'medium', 'low']

const STATUS_LABELS = {
  'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done', 'blocked': 'Blocked'
}

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22d3ee' }

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'dueDate',   label: 'Due Date'      },
  { value: 'priority',  label: 'Priority'      },
]

const FilterBar = memo(function FilterBar({ onClose }) {
  const filters          = useSettingsStore((s) => s.filters)
  const sortBy           = useSettingsStore((s) => s.sortBy)
  const activeProgramId  = useSettingsStore((s) => s.activeProgramId)
  const toggleFilter     = useSettingsStore((s) => s.toggleFilter)
  const clearFilters     = useSettingsStore((s) => s.clearFilters)
  const setSortBy        = useSettingsStore((s) => s.setSortBy)
  const setActiveProgram = useSettingsStore((s) => s.setActiveProgram)
  const programs         = useProjectStore((s) => s.programs)

  const hasActive = filters.status.length + filters.priority.length > 0 || !!activeProgramId

  const handleClearAll = () => { clearFilters(); setActiveProgram(null) }

  return (
    <div
      className="rounded-2xl p-4 anim-slide-down"
      style={{ background: 'rgba(18,8,30,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Filter & Sort
        </span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button onClick={handleClearAll} className="text-xs px-2 py-1 rounded-lg"
              style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
              Clear all
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Program filter */}
      {programs.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
            Program
          </p>
          <div className="flex flex-wrap gap-1.5">
            {programs.map((prog) => {
              const active = activeProgramId === prog.id
              return (
                <button key={prog.id}
                  onClick={() => setActiveProgram(active ? null : prog.id)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                  style={active
                    ? { background: `${prog.color}20`, borderColor: prog.color, color: prog.color }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }
                  }>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? prog.color : 'currentColor' }} />
                  {prog.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
          Status
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = filters.status.includes(s)
            return (
              <button key={s} onClick={() => toggleFilter('status', s)}
                className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                style={active
                  ? { background: 'rgba(var(--accent-rgb),0.2)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }
                }>
                {STATUS_LABELS[s]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Priority */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
          Priority
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((p) => {
            const active = filters.priority.includes(p)
            const color  = PRIORITY_COLORS[p]
            return (
              <button key={p} onClick={() => toggleFilter('priority', p)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all capitalize"
                style={active
                  ? { background: `${color}20`, borderColor: color, color }
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }
                }>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? color : 'currentColor' }} />
                {p}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sort */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
          Sort By
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map(({ value, label }) => {
            const active = sortBy === value
            return (
              <button key={value} onClick={() => setSortBy(value)}
                className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                style={active
                  ? { background: 'rgba(var(--accent-rgb),0.2)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                  : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }
                }>
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default FilterBar
