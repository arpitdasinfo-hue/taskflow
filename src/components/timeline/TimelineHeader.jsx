import { memo, useMemo } from 'react'
import { addDays, startOfDay } from './timelineUtils'

const TimelineHeader = memo(function TimelineHeader({ startDate, days, cellWidth, leftColumnWidth, zoom }) {
  const columns = useMemo(() =>
    Array.from({ length: days }, (_, index) => addDays(startDate, index)),
  [startDate, days])

  const monthSegments = useMemo(() => {
    const groups = []
    columns.forEach((date) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.span += 1
      } else {
        groups.push({ key, label, span: 1 })
      }
    })
    return groups
  }, [columns])

  const today = startOfDay(new Date())

  return (
    <div className="sticky top-0 z-20">
      <div className="flex" style={{ background: 'rgba(7,18,31,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex-shrink-0 border-r px-3 py-1.5" style={{ width: leftColumnWidth, borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
              Workstream
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {zoom === 'week' ? 'Day view' : zoom === 'month' ? 'Delivery view' : 'Roadmap view'}
            </span>
          </div>
        </div>
        <div className="flex">
          {monthSegments.map((segment) => (
            <div
              key={segment.key}
              className="text-[10px] font-semibold px-2 py-1 border-r"
              style={{
                width: segment.span * cellWidth,
                borderColor: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              {segment.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex" style={{ background: 'rgba(8,20,35,0.94)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex-shrink-0 border-r px-3 py-1.5" style={{ width: leftColumnWidth, borderColor: 'rgba(255,255,255,0.08)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Timeline
          </span>
        </div>
        <div className="flex">
          {columns.map((date, index) => {
            const isToday = date.getTime() === today.getTime()
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const showLabel = zoom === 'week'
              || (zoom === 'month' && (date.getDate() % 7 === 0 || date.getDate() === 1))
              || (zoom === 'quarter' && (date.getDate() === 1 || date.getDate() % 14 === 0))

            return (
              <div
                key={index}
                className="text-[9px] text-center border-r py-1 relative font-medium"
                style={{
                  width: cellWidth,
                  borderColor: 'rgba(255,255,255,0.04)',
                  color: isToday ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isToday
                    ? 'rgba(var(--accent-rgb),0.14)'
                    : isWeekend ? 'rgba(255,255,255,0.03)' : 'transparent',
                }}
              >
                {showLabel ? date.toLocaleDateString('en-US', zoom === 'week'
                  ? { weekday: 'short', day: 'numeric' }
                  : { day: 'numeric' }) : ''}
                {isToday && (
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-1"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default TimelineHeader
