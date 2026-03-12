import { memo, useMemo } from 'react'
import TimelineHeader from './TimelineHeader'
import TimelineRow from './TimelineRow'
import { ROW_HEIGHT } from './timelineConfig'
import { clamp, diffDays, toDisplayDate } from './timelineUtils'

const LEFT_COLUMN_WIDTH = 300

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
  onQuickAddTask,
  showDependencies,
  onlyDependencyRisk,
}) {
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
        const stroke = blocked ? 'rgba(248,113,113,0.72)' : 'rgba(125,211,252,0.48)'

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

  return (
    <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
      <div style={{ minWidth: LEFT_COLUMN_WIDTH + days * cellWidth }}>
        <TimelineHeader
          startDate={startDate}
          days={days}
          cellWidth={cellWidth}
          leftColumnWidth={LEFT_COLUMN_WIDTH}
          zoom={zoom}
        />

        <div className="relative">
          {dependencyLayer.links.length > 0 && (
            <svg
              className="absolute pointer-events-none z-[1]"
              style={{
                left: LEFT_COLUMN_WIDTH,
                top: 0,
                width: days * cellWidth,
                height: dependencyLayer.totalHeight,
                overflow: 'visible',
              }}
              aria-hidden="true"
            >
              {dependencyLayer.links.map((link) => (
                <g key={link.id}>
                  <path
                    d={link.path}
                    fill="none"
                    stroke={link.stroke}
                    strokeWidth={link.blocked ? 1.8 : 1.4}
                    strokeDasharray={link.blocked ? '4 4' : undefined}
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
              leftColumnWidth={LEFT_COLUMN_WIDTH}
              onToggleProject={onToggleProject}
              onSelectTask={onSelectTask}
              onUpdateTaskSchedule={onUpdateTaskSchedule}
              onUpdateProjectSchedule={onUpdateProjectSchedule}
              onQuickAddTask={onQuickAddTask}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

export default TimelineGrid
