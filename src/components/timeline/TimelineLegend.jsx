import { memo } from 'react'
import { STATUS_COLOR } from './timelineConfig'

const TimelineLegend = memo(function TimelineLegend() {
  const entries = [
    ['todo', 'To Do'],
    ['in-progress', 'In Progress'],
    ['review', 'Review'],
    ['done', 'Done'],
    ['blocked', 'Blocked'],
  ]

  return (
    <div className="px-4 md:px-6 pb-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Status
        </span>
        {entries.map(([id, label]) => (
          <span
            key={id}
            className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: `${STATUS_COLOR[id]}22`, color: STATUS_COLOR[id], border: `1px solid ${STATUS_COLOR[id]}55` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[id] }} />
            {label}
          </span>
        ))}
        <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
          <span>◆</span>
          Milestone
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
          Drag bars to move. Drag edges to resize.
        </span>
      </div>
    </div>
  )
})

export default TimelineLegend
