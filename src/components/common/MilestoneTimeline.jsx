import { memo, useMemo } from 'react'
import { addDays, differenceInCalendarDays, endOfMonth, format, isSameMonth, startOfMonth, subDays } from 'date-fns'

const laneGap = 52
const DEFAULT_COLOR = '#38bdf8'

const assignLanes = (items, totalDays) => {
  const laneEnds = []

  return items.map((item) => {
    const pct = totalDays > 0 ? differenceInCalendarDays(item.date, item.rangeStart) / totalDays : 0
    let lane = laneEnds.findIndex((value) => pct - value > 0.12)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(-1)
    }
    laneEnds[lane] = pct
    return { ...item, pct, lane }
  })
}

const MilestoneTimeline = memo(function MilestoneTimeline({
  milestones,
  emptyLabel = 'No milestone dates available yet.',
  compact = false,
}) {
  const timeline = useMemo(() => {
    const validMilestones = (milestones ?? [])
      .filter((milestone) => milestone?.dueDate)
      .map((milestone) => ({
        ...milestone,
        date: new Date(milestone.dueDate),
      }))
      .filter((milestone) => !Number.isNaN(milestone.date.getTime()))
      .sort((left, right) => left.date - right.date)

    if (!validMilestones.length) return null

    const firstDate = validMilestones[0].date
    const lastDate = validMilestones[validMilestones.length - 1].date
    const rangeStart = startOfMonth(subDays(firstDate, 12))
    const rangeEnd = endOfMonth(addDays(lastDate, 18))
    const totalDays = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart))

    const monthMarkers = []
    let cursor = new Date(rangeStart)
    while (cursor <= rangeEnd) {
      monthMarkers.push(new Date(cursor))
      cursor = startOfMonth(addDays(endOfMonth(cursor), 1))
    }

    const lanes = assignLanes(
      validMilestones.map((milestone) => ({ ...milestone, rangeStart })),
      totalDays
    )

    return {
      rangeStart,
      rangeEnd,
      totalDays,
      monthMarkers,
      lanes,
      laneCount: Math.max(1, ...lanes.map((item) => item.lane + 1)),
    }
  }, [milestones])

  if (!timeline) {
    return (
      <div
        className="rounded-2xl px-4 py-4 text-xs"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
      >
        {emptyLabel}
      </div>
    )
  }

  const chartHeight = compact ? 132 + timeline.laneCount * 20 : 152 + timeline.laneCount * 24
  const baselineOffset = compact ? 32 : 40

  return (
    <div
      className="rounded-2xl px-4 py-4 overflow-x-auto"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="min-w-[720px]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
              Milestone Timeline
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {format(timeline.rangeStart, 'MMM d, yyyy')} to {format(timeline.rangeEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
            {timeline.lanes.length} milestone{timeline.lanes.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="relative" style={{ height: chartHeight }}>
          {timeline.monthMarkers.map((month) => {
            const left = `${(differenceInCalendarDays(month, timeline.rangeStart) / timeline.totalDays) * 100}%`
            return (
              <div key={month.toISOString()} className="absolute top-0" style={{ left }}>
                <div className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {format(month, isSameMonth(month, timeline.rangeStart) ? 'MMM yyyy' : 'MMM')}
                </div>
              </div>
            )
          })}

          <div
            className="absolute left-0 right-0"
            style={{
              bottom: baselineOffset,
              height: 2,
              background: 'linear-gradient(90deg, rgba(var(--accent-rgb),0.2), rgba(255,255,255,0.08), rgba(var(--accent-rgb),0.2))',
            }}
          />

          {timeline.lanes.map((milestone) => {
            const bottom = baselineOffset + 18 + milestone.lane * laneGap
            const left = `${milestone.pct * 100}%`
            const color = milestone.completed ? '#10b981' : (milestone.color?.startsWith?.('#') ? milestone.color : DEFAULT_COLOR)

            return (
              <div key={milestone.id} className="absolute" style={{ left, bottom }}>
                <div className="absolute left-1/2 bottom-[-18px] -translate-x-1/2 w-px h-[18px]" style={{ background: `${color}80` }} />
                <div
                  className="absolute left-1/2 -translate-x-1/2 -bottom-[24px] w-3 h-3 rounded-full border-2"
                  style={{ background: color, borderColor: 'rgba(10,16,28,0.9)', boxShadow: `0 0 16px ${color}55` }}
                />

                <div
                  className="absolute left-1/2 -translate-x-1/2 min-w-[132px] max-w-[168px] rounded-2xl px-3 py-2"
                  style={{
                    bottom: 0,
                    background: 'rgba(7,22,42,0.9)',
                    border: `1px solid ${color}30`,
                    boxShadow: '0 14px 34px rgba(2,6,23,0.3)',
                  }}
                >
                  <p className="text-[11px] font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {milestone.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {milestone.context || 'Milestone'}
                    </span>
                    <span className="text-[10px] whitespace-nowrap" style={{ color }}>
                      {format(milestone.date, 'MMM d')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default MilestoneTimeline
