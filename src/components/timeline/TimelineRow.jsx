import { memo } from 'react'
import { ChevronDown, ChevronRight, GitBranch, Link2 } from 'lucide-react'
import { ROW_HEIGHT, STATUS_COLOR } from './timelineConfig'
import { clamp, diffDays, startOfDay, toDisplayDate } from './timelineUtils'
import TimelineProjectBar from './TimelineProjectBar'
import TimelineTaskBar from './TimelineTaskBar'

const getItemRange = (item) => {
  const start = toDisplayDate(item.startDate) || toDisplayDate(item.dueDate)
  const end = toDisplayDate(item.dueDate) || toDisplayDate(item.startDate)
  return { start, end }
}

const getItemProgress = (item) => {
  if (typeof item.progress === 'number') return clamp(item.progress, 0, 1)
  if (item.status === 'done') return 1
  if (item.status === 'in-progress') return 0.5
  return 0
}

const TimelineRow = memo(function TimelineRow({
  row,
  startDate,
  days,
  cellWidth,
  leftColumnWidth,
  onToggleProject,
  onSelectTask,
  onUpdateTaskSchedule,
  onUpdateProjectSchedule,
  readOnly = false,
}) {
  const height = ROW_HEIGHT[row.type] ?? 36
  const todayOffset = diffDays(startDate, startOfDay(new Date()))
  const isProject = row.type === 'project'
  const isTask = row.type === 'task'

  return (
    <div className="flex" style={{ minHeight: height, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div
        className="flex-shrink-0 sticky left-0 z-10 border-r px-3 flex items-center gap-2"
        style={{
          width: leftColumnWidth,
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(8,20,35,0.92)',
          paddingLeft: `${12 + row.depth * 14}px`,
        }}
      >
        {isProject && row.expandable ? (
          <button
            onClick={() => onToggleProject(row.projectId)}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title={row.expanded ? 'Collapse tasks' : 'Expand tasks'}
          >
            {row.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        {isTask ? <GitBranch size={10} style={{ color: 'var(--text-secondary)' }} /> : null}
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />

        <div className="min-w-0 flex-1">
          <p className={`truncate ${isTask ? 'text-[11px]' : 'text-xs font-semibold'}`} style={{ color: 'var(--text-primary)' }}>
            {row.label}
          </p>
          {row.subtitle ? (
            <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {row.subtitle}
            </p>
          ) : null}
        </div>

        {isProject && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {row.unscheduledCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
              >
                {row.unscheduledCount} unscheduled
              </span>
            )}
            {row.delayedCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(249,115,22,0.2)', color: '#fb923c' }}
              >
                {row.delayedCount} late
              </span>
            )}
            {row.criticalCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
              >
                {row.criticalCount} critical
              </span>
            )}
            {row.dependencyRiskCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(56,189,248,0.16)', color: '#7dd3fc' }}
              >
                <Link2 size={9} />
                {row.dependencyRiskCount}
              </span>
            )}
          </div>
        )}

      </div>

      <div className="relative flex-1" style={{ minWidth: days * cellWidth, height }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent ${cellWidth}px)`,
          }}
        />

        {todayOffset >= 0 && todayOffset < days && (
          <div
            className="absolute top-0 bottom-0 z-[2]"
            style={{
              left: todayOffset * cellWidth + cellWidth / 2,
              width: 1,
              background: 'rgba(var(--accent-rgb),0.45)',
            }}
          />
        )}

        {(row.bars ?? []).map((item) => {
          if (isTask && row.taskId) {
            return (
              <TimelineTaskBar
                key={`${row.id}-${item.id}`}
                taskId={row.taskId}
                item={item}
                rowColor={row.color}
                startDate={startDate}
                days={days}
                cellWidth={cellWidth}
              onSelectTask={onSelectTask}
              onUpdateTaskSchedule={onUpdateTaskSchedule}
              readOnly={readOnly}
            />
          )
        }

          if (isProject && row.projectId) {
            return (
              <TimelineProjectBar
                key={`${row.id}-${item.id}`}
                projectId={row.projectId}
                item={item}
                rowColor={row.color}
                startDate={startDate}
                days={days}
              cellWidth={cellWidth}
              onUpdateProjectSchedule={onUpdateProjectSchedule}
              readOnly={readOnly}
            />
          )
        }

          const { start, end } = getItemRange(item)
          if (!start || !end) return null

          const from = diffDays(startDate, start)
          const to = diffDays(startDate, end)
          if (to < 0 || from >= days) return null

          const clampedStart = clamp(from, 0, days - 1)
          const clampedEnd = clamp(to, 0, days - 1)
          const left = clampedStart * cellWidth + 1
          const width = Math.max(8, (clampedEnd - clampedStart + 1) * cellWidth - 2)
          const color = item.color || STATUS_COLOR[item.status] || row.color || 'var(--accent)'
          const progress = getItemProgress(item)

          return (
            <button
              key={`${row.id}-${item.id}`}
              onClick={() => row.taskId && onSelectTask?.(row.taskId)}
              disabled={!row.taskId}
              className="absolute rounded-full overflow-hidden"
              style={{
                left,
                top: '50%',
                transform: 'translateY(-50%)',
                width,
                height: isTask ? 18 : 16,
                background: `${color}30`,
                border: `1px solid ${color}66`,
                cursor: row.taskId ? 'pointer' : 'default',
              }}
              title={item.title || row.label}
            >
              <div
                className="absolute top-0 bottom-0 left-0 rounded-full"
                style={{ width: `${progress * 100}%`, background: `${color}55` }}
              />
              {width > 56 && (
                <span
                  className="relative z-[2] px-2 text-[9px] font-medium truncate block text-left"
                  style={{ color }}
                >
                  {item.title || row.label}
                </span>
              )}
            </button>
          )
        })}

        {isTask && row.unscheduled && (
          <div
            className="absolute text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
            style={{
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#cbd5e1',
              background: 'rgba(255,255,255,0.05)',
              border: '1px dashed rgba(255,255,255,0.18)',
              zIndex: 3,
            }}
          >
            No dates yet
            {!readOnly && (
              <button
                onClick={() => onSelectTask?.(row.taskId)}
                className="underline hover:opacity-80"
                style={{ color: 'var(--accent)' }}
              >
                schedule
              </button>
            )}
          </div>
        )}

        {(row.milestones ?? []).map((milestone) => {
          const due = toDisplayDate(milestone.dueDate)
          if (!due) return null
          const offset = diffDays(startDate, due)
          if (offset < 0 || offset >= days) return null

          const color = milestone.status === 'completed' ? '#10b981' : row.color
          return (
            <span
              key={`${row.id}-milestone-${milestone.id}`}
              className="absolute text-[11px]"
              style={{
                left: offset * cellWidth + cellWidth / 2 - 5,
                top: '50%',
                transform: 'translateY(-50%)',
                color,
                zIndex: 3,
              }}
              title={milestone.name}
            >
              ◆
            </span>
          )
        })}
      </div>
    </div>
  )
})

export default TimelineRow
