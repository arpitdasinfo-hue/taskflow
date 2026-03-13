import { memo } from 'react'
import { STATUS_COLOR } from './timelineConfig'

const TimelineLegend = memo(function TimelineLegend({ readOnly = false }) {
  const entries = [
    ['todo', 'To Do'],
    ['in-progress', 'In Progress'],
    ['done', 'Done'],
    ['blocked', 'Blocked'],
  ]

  return (
    <div className="px-4 md:px-6 pb-2">
      <div
        className="flex items-center gap-2 flex-wrap rounded-2xl px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Chart Key
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
          Program
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
          Project
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
          Task
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
        <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(56,189,248,0.16)', color: '#7dd3fc' }}>
          <span>⛓</span>
          Dependency risk
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>
          Late
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.14)', color: '#f87171' }}>
          Blocked stripes
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
          {readOnly
            ? 'Read-only timeline'
            : 'Drag bars or edges to reschedule'}
        </span>
      </div>
    </div>
  )
})

export default TimelineLegend
