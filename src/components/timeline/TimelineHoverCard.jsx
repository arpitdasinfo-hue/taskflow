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
      className={`absolute left-0 bottom-full mb-2 rounded-2xl px-3 py-2 pointer-events-none ${compact ? 'w-52' : 'w-60'}`}
      style={{
        background: 'rgba(6,12,22,0.985)',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 20px 44px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.04)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 60,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#94a3b8' }}>
            {sectionLabel}
          </p>
          <p className="text-xs font-semibold truncate" style={{ color: '#f8fafc' }}>
            {title}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#f8fafc' }}
        >
          {statusLabel}
        </span>
        <span className="text-[10px]" style={{ color: '#cbd5e1' }}>
          {progressLabel}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <p style={{ color: '#94a3b8' }}>Start</p>
          <p style={{ color: '#f8fafc' }}>{startLabel}</p>
        </div>
        <div>
          <p style={{ color: '#94a3b8' }}>Due</p>
          <p style={{ color: '#f8fafc' }}>{dueLabel}</p>
        </div>
      </div>
    </div>
  )
})

export default TimelineHoverCard
