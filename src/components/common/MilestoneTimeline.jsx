import { memo, useMemo } from 'react'
import { format } from 'date-fns'

const DEFAULT_COLOR = '#38bdf8'

const MilestoneTimeline = memo(function MilestoneTimeline({
  milestones,
  emptyLabel = 'No milestone dates available yet.',
  compact = false,
}) {
  const items = useMemo(
    () => (milestones ?? [])
      .filter((milestone) => milestone?.dueDate)
      .map((milestone) => ({
        ...milestone,
        date: new Date(milestone.dueDate),
      }))
      .filter((milestone) => !Number.isNaN(milestone.date.getTime()))
      .sort((left, right) => left.date - right.date),
    [milestones]
  )

  if (!items.length) {
    return (
      <div
        className="rounded-2xl px-4 py-4 text-xs"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
      >
        {emptyLabel}
      </div>
    )
  }

  const cardWidthClass = compact ? 'min-w-[190px] max-w-[220px]' : 'min-w-[220px] max-w-[240px]'
  const surfacePadding = compact ? 'px-3 py-3' : 'px-4 py-4'

  return (
    <div
      className={`rounded-2xl overflow-x-auto ${surfacePadding}`}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
            Milestone Sequence
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Chronological launch checkpoints with the due date visible on each item.
          </p>
        </div>
        <div className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
          {items.length} milestone{items.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex items-stretch gap-2 min-w-max">
        {items.map((milestone, index) => {
          const color = milestone.completed
            ? '#10b981'
            : milestone.color?.startsWith?.('#')
              ? milestone.color
              : DEFAULT_COLOR

          return (
            <div key={milestone.id} className="flex items-center gap-2">
              <div
                className={`rounded-2xl ${cardWidthClass} ${compact ? 'px-3 py-3' : 'px-4 py-4'}`}
                style={{
                  background: 'rgba(7,22,42,0.78)',
                  border: `1px solid ${color}30`,
                  boxShadow: '0 14px 34px rgba(2,6,23,0.22)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] px-2 py-1 rounded-full"
                    style={{ background: `${color}18`, color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    {format(milestone.date, 'MMM d')}
                  </span>
                  <span className="text-[10px]" style={{ color: milestone.completed ? '#10b981' : 'var(--text-secondary)' }}>
                    {milestone.completed ? 'Done' : format(milestone.date, 'EEE')}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                  {milestone.name}
                </p>
                <p className="mt-1 text-[11px] line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {milestone.context || 'Milestone'}
                </p>
                <div className="mt-3 text-[10px]" style={{ color }}>
                  Due {format(milestone.date, 'MMM d, yyyy')}
                </div>
              </div>

              {index < items.length - 1 && (
                <div className="flex items-center gap-1 px-1.5">
                  <div className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.4)' }} />
                  <div className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default MilestoneTimeline
