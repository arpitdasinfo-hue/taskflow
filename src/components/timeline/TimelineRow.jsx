import { memo, useMemo, useRef, useState } from 'react'
import { CheckSquare2, ChevronDown, ChevronRight, FolderKanban, Layers3 } from 'lucide-react'
import { ROW_HEIGHT, STATUS_COLOR } from './timelineConfig'
import { addDays, clamp, diffDays, startOfDay, toDisplayDate } from './timelineUtils'
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

const getRowIcon = (type) => {
  if (type === 'program') return Layers3
  if (type === 'project') return FolderKanban
  return CheckSquare2
}

const getSummaryLine = (row) => {
  if (row.type === 'task') return row.subtitle || 'Task'

  const pieces = [row.type === 'program' ? 'Program' : 'Project']

  if (row.type === 'program' && typeof row.projectCount === 'number' && row.projectCount > 0) {
    pieces.push(`${row.projectCount} projects`)
  }

  if (row.type === 'project' && typeof row.childProjectCount === 'number' && row.childProjectCount > 0) {
    pieces.push(`${row.childProjectCount} sub-projects`)
  }

  if (typeof row.totalCount === 'number' && row.totalCount > 0) {
    pieces.push(`${row.totalCount} tasks`)
  }

  return pieces.join(' • ')
}

const getStatusPills = (row, compact) => {
  if (row.type === 'task') return []

  const pills = []

  if (typeof row.doneCount === 'number' && row.doneCount > 0) {
    pills.push({ label: `${row.doneCount} done`, tone: 'success' })
  }

  if (row.criticalCount > 0) pills.push({ label: `${row.criticalCount} critical`, tone: 'danger' })
  else if (row.delayedCount > 0) pills.push({ label: `${row.delayedCount} late`, tone: 'warning' })
  else if (row.dependencyRiskCount > 0) pills.push({ label: `${row.dependencyRiskCount} at risk`, tone: 'risk' })
  else if (row.unscheduledCount > 0) pills.push({ label: `${row.unscheduledCount} unscheduled`, tone: 'muted' })
  else pills.push({ label: 'On track', tone: 'calm' })

  return pills.slice(0, compact ? 1 : 2)
}

const getChipStyle = (tone) => {
  if (tone === 'accent') return { background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }
  if (tone === 'success') return { background: 'rgba(16,185,129,0.14)', color: '#34d399' }
  if (tone === 'danger') return { background: 'rgba(239,68,68,0.14)', color: '#f87171' }
  if (tone === 'warning') return { background: 'rgba(249,115,22,0.14)', color: '#fb923c' }
  if (tone === 'risk') return { background: 'rgba(56,189,248,0.14)', color: '#7dd3fc' }
  if (tone === 'calm') return { background: 'rgba(148,163,184,0.12)', color: '#cbd5e1' }
  return { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }
}

const getFallbackBarStyle = (row, item, width) => {
  const color = item.color || STATUS_COLOR[item.status] || row.color || 'var(--accent)'
  const due = toDisplayDate(item.dueDate)
  const isLate = !!(due && due < startOfDay(new Date()) && item.status !== 'done')
  const isBlocked = item.status === 'blocked'

  return {
    color,
    accentColor: isLate ? '#f87171' : color,
    height: row.type === 'program' ? 20 : row.type === 'project' ? 16 : 14,
    background: isBlocked
      ? `repeating-linear-gradient(135deg, ${color}28 0 8px, rgba(255,255,255,0.04) 8px 16px)`
      : `${color}24`,
    border: `1px solid ${isLate ? '#f87171' : color}88`,
    boxShadow: isLate
      ? '0 0 0 1px rgba(248,113,113,0.3), 0 0 20px rgba(248,113,113,0.18)'
      : width > 120 ? `0 8px 22px ${color}22` : 'none',
  }
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
  onCreateTaskInRange,
  readOnly = false,
  compact = false,
}) {
  const height = ROW_HEIGHT[row.type] ?? 36
  const todayOffset = diffDays(startDate, startOfDay(new Date()))
  const isProject = row.type === 'project'
  const isTask = row.type === 'task'
  const canCreateTask = !readOnly && (row.type === 'program' || row.type === 'project')
  const RowIcon = getRowIcon(row.type)
  const createSurfaceRef = useRef(null)
  const createInteractionRef = useRef(null)
  const [createDraft, setCreateDraft] = useState(null)
  const summaryLine = useMemo(() => getSummaryLine(row), [row])
  const statusPills = useMemo(() => getStatusPills(row, compact), [row, compact])
  const laneBackground = row.type === 'program'
    ? 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.008))'
    : row.type === 'project'
      ? 'rgba(255,255,255,0.012)'
      : 'rgba(255,255,255,0.003)'
  const railBackground = row.type === 'program'
    ? 'linear-gradient(180deg, rgba(10,26,42,0.98), rgba(7,18,31,0.95))'
    : row.type === 'project'
      ? 'rgba(8,20,35,0.9)'
      : 'rgba(8,20,35,0.82)'

  const resolveCreateOffset = (clientX) => {
    const rect = createSurfaceRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return clamp(Math.floor((clientX - rect.left) / cellWidth), 0, days - 1)
  }

  const beginCreateTask = (event) => {
    if (!canCreateTask || event.button !== 0 || !createSurfaceRef.current) return
    event.preventDefault()
    event.stopPropagation()

    const startOffset = resolveCreateOffset(event.clientX)
    createInteractionRef.current = { pointerId: event.pointerId, startOffset }
    setCreateDraft({ startOffset, endOffset: startOffset })

    try {
      createSurfaceRef.current.setPointerCapture(event.pointerId)
    } catch {
      // Safe no-op when pointer capture is unavailable.
    }
  }

  const moveCreateTask = (event) => {
    const interaction = createInteractionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    event.preventDefault()
    const nextOffset = resolveCreateOffset(event.clientX)
    setCreateDraft({
      startOffset: Math.min(interaction.startOffset, nextOffset),
      endOffset: Math.max(interaction.startOffset, nextOffset),
    })
  }

  const finishCreateTask = (event) => {
    const interaction = createInteractionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    try {
      if (createSurfaceRef.current?.hasPointerCapture(event.pointerId)) {
        createSurfaceRef.current.releasePointerCapture(event.pointerId)
      }
    } catch {
      // Safe no-op if the pointer was already released.
    }

    const finalDraft = createDraft ?? {
      startOffset: interaction.startOffset,
      endOffset: interaction.startOffset,
    }
    createInteractionRef.current = null
    setCreateDraft(null)

    const start = addDays(startOfDay(startDate), finalDraft.startOffset)
    const end = addDays(startOfDay(startDate), finalDraft.endOffset)
    onCreateTaskInRange?.({
      rowType: row.type,
      rowLabel: row.label,
      programId: row.programId ?? null,
      projectId: row.projectId ?? null,
      startDate: start.toISOString(),
      dueDate: end.toISOString(),
    })
  }
  return (
    <div
      className="flex"
      style={{
        minHeight: height,
        borderBottom: row.type === 'program' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="flex-shrink-0 sticky left-0 z-10 border-r px-3 flex items-center gap-2.5"
        style={{
          width: leftColumnWidth,
          borderColor: 'rgba(255,255,255,0.08)',
          background: railBackground,
          paddingLeft: `${12 + row.depth * 12}px`,
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

        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: row.type === 'program' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)' }}
        >
          <RowIcon size={compact ? 12 : 13} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <p className={`truncate ${isTask ? 'text-[11px] font-medium' : 'text-[13px] font-semibold'}`} style={{ color: 'var(--text-primary)' }}>
              {row.label}
            </p>
          </div>
          <p className={`mt-0.5 truncate ${isTask ? 'text-[10px]' : 'text-[11px]'}`} style={{ color: 'var(--text-secondary)' }}>
            {summaryLine}
          </p>
        </div>

        {!isTask && statusPills.length > 0 ? (
          <div className="flex flex-col items-end gap-1 pl-2 flex-shrink-0">
            {statusPills.map((pill) => (
              <span
                key={`${row.id}-${pill.label}`}
                className={`rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${compact ? 'text-[9px]' : 'text-[10px]'}`}
                style={getChipStyle(pill.tone)}
              >
                {pill.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative flex-1" style={{ minWidth: days * cellWidth, height, background: laneBackground }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent ${cellWidth}px)`,
          }}
        />

        {canCreateTask && (
          <div
            ref={createSurfaceRef}
            className="absolute inset-0 z-[1]"
            onPointerDown={beginCreateTask}
            onPointerMove={moveCreateTask}
            onPointerUp={finishCreateTask}
            onPointerCancel={finishCreateTask}
            style={{ cursor: 'crosshair' }}
          />
        )}

        {todayOffset >= 0 && todayOffset < days && (
          <div
            className="absolute top-0 bottom-0 z-[2]"
            style={{
              left: todayOffset * cellWidth + cellWidth / 2 - 1,
              width: 2,
              background: 'rgba(var(--accent-rgb),0.6)',
              boxShadow: '0 0 16px rgba(var(--accent-rgb),0.24)',
            }}
          />
        )}

        {createDraft && (
          <div
            className="absolute rounded-full z-[3]"
            style={{
              left: createDraft.startOffset * cellWidth + 1,
              top: '50%',
              transform: 'translateY(-50%)',
              width: Math.max(10, (createDraft.endOffset - createDraft.startOffset + 1) * cellWidth - 2),
              height: row.type === 'program' ? 18 : 16,
              background: 'rgba(var(--accent-rgb),0.18)',
              border: '1px dashed rgba(var(--accent-rgb),0.5)',
              boxShadow: '0 0 0 1px rgba(var(--accent-rgb),0.18), 0 8px 22px rgba(var(--accent-rgb),0.16)',
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
          const { color, accentColor, height: barHeight, background, border, boxShadow } = getFallbackBarStyle(row, item, width)
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
                height: barHeight,
                background,
                border,
                boxShadow,
                cursor: row.taskId ? 'pointer' : 'default',
              }}
              title={item.title || row.label}
            >
              <div className="absolute top-0 bottom-0 left-0 rounded-full" style={{ width: `${progress * 100}%`, background: `${accentColor}70` }} />
              <div className="absolute top-[2px] bottom-[2px] left-[3px] w-[2px] rounded-full" style={{ background: accentColor }} />
              {width > 56 && (
                <span className="relative z-[2] px-2 text-[9px] font-medium truncate block text-left" style={{ color: '#e8edf5' }}>
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
              className="absolute"
              style={{
                left: offset * cellWidth + cellWidth / 2 - 6,
                top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
                width: 12,
                height: 12,
                background: `${color}22`,
                border: `1px solid ${color}`,
                boxShadow: `0 0 14px ${color}25`,
                zIndex: 3,
              }}
              title={milestone.name}
            />
          )
        })}
      </div>
    </div>
  )
})

export default TimelineRow
