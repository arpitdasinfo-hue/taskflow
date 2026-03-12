import { memo } from 'react'
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Target } from 'lucide-react'
import { ZOOM_CONFIGS } from './timelineConfig'

const quickFilterStyle = (active, accent) => (active
  ? { background: `${accent}24`, color: accent, border: `1px solid ${accent}55` }
  : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' })

const TimelineToolbar = memo(function TimelineToolbar({
  zoom,
  rangeLabel,
  stats,
  onlyDelayed,
  onlyCritical,
  onChangeZoom,
  onShiftRange,
  onResetToToday,
  onToggleOnlyDelayed,
  onToggleOnlyCritical,
}) {
  return (
    <div className="px-4 md:px-6 pb-2.5">
      <div
        className="rounded-2xl p-2.5 flex flex-wrap items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-0.5 rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {Object.values(ZOOM_CONFIGS).map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => onChangeZoom(cfg.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={zoom === cfg.id ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-secondary)' }}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onShiftRange(-1)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Previous range"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={onResetToToday}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
            style={{ color: 'var(--accent)' }}
          >
            <Target size={12} />
            Today
          </button>
          <button
            onClick={() => onShiftRange(1)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Next range"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
          {rangeLabel}
        </div>

        <button
          onClick={onToggleOnlyDelayed}
          className="text-[11px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
          style={quickFilterStyle(onlyDelayed, '#f97316')}
        >
          <CalendarClock size={11} />
          Only delayed
        </button>

        <button
          onClick={onToggleOnlyCritical}
          className="text-[11px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
          style={quickFilterStyle(onlyCritical, '#ef4444')}
        >
          <AlertTriangle size={11} />
          Only critical
        </button>

        <div className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {stats.scheduledCount} scheduled
          </span>
          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>
            {stats.delayedCount} delayed
          </span>
          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            {stats.criticalCount} critical
          </span>
        </div>
      </div>
    </div>
  )
})

export default TimelineToolbar
