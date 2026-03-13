import { memo, useMemo } from 'react'
import TimelineHeader from './TimelineHeader'
import TimelineRow from './TimelineRow'
import { ROW_HEIGHT } from './timelineConfig'
import { addDays, clamp, diffDays, startOfDay, toDisplayDate } from './timelineUtils'

const LEFT_COLUMN_WIDTH = 280

const getItemRange = (item) => {
  const start = toDisplayDate(item.startDate) || toDisplayDate(item.dueDate)
  const end = toDisplayDate(item.dueDate) || toDisplayDate(item.startDate)
  return { start, end }
}

const TimelineGrid = memo(function TimelineGrid({
  rows,
  startDate,
  days,
  cellWidth,
  zoom,
  onToggleProject,
  onSelectTask,
  onUpdateTaskSchedule,
  onUpdateProjectSchedule,
  onCreateTaskInRange,
  showDependencies,
  onlyDependencyRisk,
  readOnly = false,
  compact = false,
}) {
  const leftColumnWidth = compact ? 220 : LEFT_COLUMN_WIDTH
  const dependencyLayer = useMemo(() => {
    const rowOffsets = new Map()
    let totalHeight = 0

    rows.forEach((row) => {
      rowOffsets.set(row.id, totalHeight)
      totalHeight += ROW_HEIGHT[row.type] ?? 36
    })

    if (!showDependencies) return { links: [], totalHeight }

    const taskAnchors = new Map()
    rows.forEach((row) => {
      if (row.type !== 'task' || !row.taskId) return

      const item = row.bars?.[0]
      if (!item) return

      const { start, end } = getItemRange(item)
      if (!start || !end) return

      const from = diffDays(startDate, start)
      const to = diffDays(startDate, end)
      if (to < 0 || from >= days) return

      const clampedStart = clamp(from, 0, days - 1)
      const clampedEnd = clamp(to, 0, days - 1)
      const left = clampedStart * cellWidth + 1
      const width = Math.max(10, (clampedEnd - clampedStart + 1) * cellWidth - 2)
      const rowTop = rowOffsets.get(row.id) ?? 0
      const rowHeight = ROW_HEIGHT[row.type] ?? 36

      taskAnchors.set(row.taskId, {
        xStart: left,
        xEnd: left + width,
        y: rowTop + rowHeight / 2,
        status: item.status,
      })
    })

    const links = []
    rows.forEach((row) => {
      if (row.type !== 'task' || !row.taskId) return

      const item = row.bars?.[0]
      if (!item) return

      const destination = taskAnchors.get(row.taskId)
      if (!destination) return

      const dependencies = item.dependsOn ?? []
      dependencies.forEach((dependencyId) => {
        const source = taskAnchors.get(dependencyId)
        if (!source) return

        const blocked = source.status !== 'done'
        if (onlyDependencyRisk && !blocked) return

        const controlDelta = Math.max(18, (destination.xStart - source.xEnd) / 2)
        const c1x = source.xEnd + controlDelta
        const c2x = destination.xStart - controlDelta
        const stroke = blocked ? 'rgba(248,113,113,0.86)' : 'rgba(125,211,252,0.62)'

        links.push({
          id: `dep-${dependencyId}-${row.taskId}`,
          path: `M ${source.xEnd} ${source.y} C ${c1x} ${source.y}, ${c2x} ${destination.y}, ${destination.xStart} ${destination.y}`,
          stroke,
          toX: destination.xStart,
          toY: destination.y,
          blocked,
        })
      })
    })

    return { links, totalHeight }
  }, [rows, startDate, days, cellWidth, showDependencies, onlyDependencyRisk])

  const calendarLayer = useMemo(() => {
    const today = startOfDay(new Date())

    return Array.from({ length: days }, (_, index) => {
      const date = addDays(startDate, index)
      return {
        key: date.toISOString(),
        left: index * cellWidth,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isToday: date.getTime() === today.getTime(),
      }
    })
  }, [days, startDate, cellWidth])

  return (
    <div className="overflow-x-auto overflow-y-visible min-h-[360px]" style={{ scrollbarWidth: 'thin' }}>
      <div style={{ minWidth: leftColumnWidth + days * cellWidth }}>
        <TimelineHeader
          startDate={startDate}
          days={days}
          cellWidth={cellWidth}
          leftColumnWidth={leftColumnWidth}
          zoom={zoom}
        />

        <div className="relative">
          <div
            className="absolute pointer-events-none z-0"
            style={{ left: leftColumnWidth, top: 0, width: days * cellWidth, height: dependencyLayer.totalHeight }}
          >
            {calendarLayer.map((column) => (
              <div
                key={column.key}
                className="absolute top-0 bottom-0"
                style={{
                  left: column.left,
                  width: cellWidth,
                  background: column.isToday
                    ? 'linear-gradient(180deg, rgba(var(--accent-rgb),0.16), rgba(var(--accent-rgb),0.06))'
                    : column.isWeekend
                      ? 'rgba(255,255,255,0.025)'
                      : 'transparent',
                }}
              />
            ))}
            {calendarLayer.filter((column) => column.isToday).map((column) => (
              <div
                key={`${column.key}-today-line`}
                className="absolute top-0 bottom-0"
                style={{
                  left: column.left + cellWidth / 2 - 1,
                  width: 2,
                  background: 'rgba(var(--accent-rgb),0.72)',
                  boxShadow: '0 0 18px rgba(var(--accent-rgb),0.35)',
                }}
              />
            ))}
          </div>

          {dependencyLayer.links.length > 0 && (
            <svg
              className="absolute pointer-events-none z-[1]"
              style={{
                left: leftColumnWidth,
                top: 0,
                width: days * cellWidth,
                height: dependencyLayer.totalHeight,
                overflow: 'visible',
              }}
              aria-hidden="true"
            >
              <defs>
                <marker id="timeline-arrow-risk" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(248,113,113,0.86)" />
                </marker>
                <marker id="timeline-arrow-normal" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(125,211,252,0.62)" />
                </marker>
              </defs>
              {dependencyLayer.links.map((link) => (
                <g key={link.id}>
                  <path
                    d={link.path}
                    fill="none"
                    stroke={link.stroke}
                    strokeWidth={link.blocked ? 2.2 : 1.6}
                    strokeDasharray={link.blocked ? '4 4' : undefined}
                    markerEnd={`url(#${link.blocked ? 'timeline-arrow-risk' : 'timeline-arrow-normal'})`}
                  />
                  <circle cx={link.toX} cy={link.toY} r={2} fill={link.stroke} />
                </g>
              ))}
            </svg>
          )}

          {rows.map((row) => (
            <TimelineRow
              key={row.id}
              row={row}
              startDate={startDate}
              days={days}
              cellWidth={cellWidth}
              leftColumnWidth={leftColumnWidth}
              onToggleProject={onToggleProject}
              onSelectTask={onSelectTask}
              onUpdateTaskSchedule={onUpdateTaskSchedule}
              onUpdateProjectSchedule={onUpdateProjectSchedule}
              onCreateTaskInRange={onCreateTaskInRange}
              readOnly={readOnly}
              compact={compact}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

export default TimelineGrid
