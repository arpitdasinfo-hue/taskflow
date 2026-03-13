import { memo } from 'react'
import { AlertTriangle, CalendarClock, GitBranch, Link2, X } from 'lucide-react'

const chipStyle = (active, accent) => (active
  ? { background: `${accent}22`, color: accent, border: `1px solid ${accent}60`, boxShadow: `0 8px 24px ${accent}22` }
  : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' })

const TimelineFilterBar = memo(function TimelineFilterBar({
  onlyDelayed,
  onlyCritical,
  onlyDependencyRisk,
  showDependencies,
  onToggleOnlyDelayed,
  onToggleOnlyCritical,
  onToggleOnlyDependencyRisk,
  onToggleShowDependencies,
  onClear,
  onClose,
}) {
  const activeCount =
    Number(onlyDelayed) +
    Number(onlyCritical) +
    Number(onlyDependencyRisk) +
    Number(!showDependencies)

  return (
    <div className="px-4 md:px-6 pb-2.5">
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
              Advanced Filters
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Narrow the chart to delivery risks and dependency relationships without changing the main scope.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {activeCount > 0 && (
              <button
                onClick={onClear}
                className="text-[11px] px-2.5 py-1 rounded-full transition-colors hover:bg-white/8 flex items-center gap-1"
                style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <X size={10} />
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[11px] px-2.5 py-1 rounded-full transition-colors hover:bg-white/8 flex items-center gap-1"
              style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <X size={10} />
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            onClick={onToggleOnlyDelayed}
            className="text-[11px] px-3 py-2 rounded-xl transition-colors flex items-center gap-2 text-left"
            style={chipStyle(onlyDelayed, '#f97316')}
          >
            <CalendarClock size={12} />
            <span>
              <span className="block font-semibold">Delayed items</span>
              <span className="block text-[10px] opacity-80">Show work already slipping past the current plan.</span>
            </span>
          </button>

          <button
            onClick={onToggleOnlyCritical}
            className="text-[11px] px-3 py-2 rounded-xl transition-colors flex items-center gap-2 text-left"
            style={chipStyle(onlyCritical, '#ef4444')}
          >
            <AlertTriangle size={12} />
            <span>
              <span className="block font-semibold">Critical or blocked</span>
              <span className="block text-[10px] opacity-80">Surface the most urgent items first.</span>
            </span>
          </button>

          <button
            onClick={onToggleOnlyDependencyRisk}
            className="text-[11px] px-3 py-2 rounded-xl transition-colors flex items-center gap-2 text-left"
            style={chipStyle(onlyDependencyRisk, '#38bdf8')}
          >
            <Link2 size={12} />
            <span>
              <span className="block font-semibold">Dependency risk</span>
              <span className="block text-[10px] opacity-80">Highlight tasks that rely on incomplete upstream work.</span>
            </span>
          </button>

          <button
            onClick={onToggleShowDependencies}
            className="text-[11px] px-3 py-2 rounded-xl transition-colors flex items-center gap-2 text-left"
            style={chipStyle(showDependencies, '#7dd3fc')}
          >
            <GitBranch size={12} />
            <span>
              <span className="block font-semibold">Dependency lines</span>
              <span className="block text-[10px] opacity-80">Turn relationship arrows on or off for cleaner scanning.</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
})

export default TimelineFilterBar
