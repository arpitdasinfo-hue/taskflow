import { memo } from 'react'

const TimelineHoverCard = memo(function TimelineHoverCard({
  title,
  sectionLabel,
  statusLabel,
  startLabel,
  dueLabel,
  progressLabel,
  color,
  compact = false,
}) {
  return (
    <div
      className={`absolute left-0 bottom-full mb-2 rounded-2xl px-3 py-2 pointer-events-none ${compact ? 'w-48' : 'w-56'}`}
      style={{
        background: 'rgba(7,14,24,0.96)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 18px 36px rgba(0,0,0,0.36)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 30,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
            {sectionLabel}
          </p>
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {title}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }}
        >
          {statusLabel}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {progressLabel}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <p style={{ color: 'var(--text-secondary)' }}>Start</p>
          <p style={{ color: 'var(--text-primary)' }}>{startLabel}</p>
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)' }}>Due</p>
          <p style={{ color: 'var(--text-primary)' }}>{dueLabel}</p>
        </div>
      </div>
    </div>
  )
})

export default TimelineHoverCard
