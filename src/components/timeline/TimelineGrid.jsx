import { memo } from 'react'
import TimelineHeader from './TimelineHeader'
import TimelineRow from './TimelineRow'

const LEFT_COLUMN_WIDTH = 300

const TimelineGrid = memo(function TimelineGrid({
  rows,
  startDate,
  days,
  cellWidth,
  zoom,
  onToggleProject,
  onSelectTask,
  onUpdateTaskSchedule,
  onQuickAddTask,
}) {
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
            onQuickAddTask={onQuickAddTask}
          />
        ))}
      </div>
    </div>
  )
})

export default TimelineGrid
