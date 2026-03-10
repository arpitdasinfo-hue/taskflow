import { memo } from 'react'

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', dotClass: 'priority-dot-critical', bgClass: 'priority-bg-critical' },
  high:     { label: 'High',     dotClass: 'priority-dot-high',     bgClass: 'priority-bg-high'     },
  medium:   { label: 'Medium',   dotClass: 'priority-dot-medium',   bgClass: 'priority-bg-medium'   },
  low:      { label: 'Low',      dotClass: 'priority-dot-low',      bgClass: 'priority-bg-low'      },
}

const STATUS_CONFIG = {
  'todo':        { label: 'To Do',       icon: '○', bgClass: 'status-bg-todo'        },
  'in-progress': { label: 'In Progress', icon: '◑', bgClass: 'status-bg-in-progress' },
  'review':      { label: 'In Review',   icon: '◕', bgClass: 'status-bg-review'      },
  'done':        { label: 'Done',        icon: '●', bgClass: 'status-bg-done'        },
  'blocked':     { label: 'Blocked',     icon: '✕', bgClass: 'status-bg-blocked'     },
}

export const PriorityBadge = memo(function PriorityBadge({ priority, showDot = true, size = 'sm' }) {
  const cfg = PRIORITY_CONFIG[priority]
  if (!cfg) return null
  const text = size === 'xs' ? 'text-[10px]' : 'text-xs'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${text} ${cfg.bgClass}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />}
      {cfg.label}
    </span>
  )
})

export const StatusBadge = memo(function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null
  const text = size === 'xs' ? 'text-[10px]' : 'text-xs'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${text} ${cfg.bgClass}`}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
})

export const TagBadge = memo(function TagBadge({ tag, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(var(--accent-rgb),0.12)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--accent)' }}
    >
      {tag}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(tag) }}
          className="hover:opacity-70 ml-0.5 leading-none"
          aria-label={`Remove tag ${tag}`}
        >×</button>
      )}
    </span>
  )
})

export { PRIORITY_CONFIG, STATUS_CONFIG }
