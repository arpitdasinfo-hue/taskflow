import { memo, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, Target } from 'lucide-react'
import Header from '../components/layout/Header'
import useProjectStore from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'

// ── Date helpers ──────────────────────────────────────────────────────────────
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d }
const startOfDay = (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d }
const diffDays = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000)

const ZOOM_CONFIGS = {
  week:  { days: 14,  cellWidth: 60, label: 'Week',  dateFormat: { weekday: 'short', day: 'numeric' } },
  month: { days: 60,  cellWidth: 28, label: 'Month', dateFormat: { day: 'numeric' } },
  quarter: { days: 120, cellWidth: 16, label: 'Quarter', dateFormat: { day: 'numeric' } },
}

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' }
const STATUS_COLOR   = { todo: '#94a3b8', 'in-progress': '#22d3ee', review: '#f59e0b', done: '#10b981', blocked: '#ef4444' }

// ── Column headers ────────────────────────────────────────────────────────────
const TimelineHeader = memo(function TimelineHeader({ startDate, days, cellWidth, zoom }) {
  const cols = Array.from({ length: days }, (_, i) => addDays(startDate, i))
  const today = startOfDay(new Date())

  return (
    <div className="flex sticky top-0 z-20" style={{ background: 'rgba(10,0,21,0.96)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Label column spacer */}
      <div className="flex-shrink-0 w-[200px] border-r" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />
      {/* Day columns */}
      <div className="flex">
        {cols.map((d, i) => {
          const isToday = d.getTime() === today.getTime()
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          const showLabel = zoom === 'week' || (zoom === 'month' && (d.getDate() === 1 || d.getDate() % 5 === 0)) || (zoom === 'quarter' && (d.getDate() === 1 || d.getDate() % 10 === 0))
          return (
            <div key={i}
              className="flex-shrink-0 text-center border-r text-[9px] font-medium py-1.5 relative"
              style={{
                width: cellWidth,
                borderColor: 'rgba(255,255,255,0.05)',
                background: isToday ? 'rgba(var(--accent-rgb),0.12)' : isWeekend ? 'rgba(255,255,255,0.01)' : 'transparent',
                color: isToday ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              {showLabel && d.toLocaleDateString('en-US', zoom === 'week' ? { weekday: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' })}
              {isToday && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-1"
                  style={{ background: 'var(--accent)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ── Gantt row for a single item (task or milestone) ───────────────────────────
const GanttBar = memo(function GanttBar({ item, type, startDate, days, cellWidth, color, onSelect }) {
  if (type === 'milestone') {
    const mStart = item.dueDate ? startOfDay(new Date(item.dueDate)) : null
    if (!mStart) return null
    const dayOffset = diffDays(startDate, mStart)
    if (dayOffset < 0 || dayOffset >= days) return null
    const isCompleted = item.status === 'completed'
    const isOverdue = !isCompleted && mStart < startOfDay(new Date())
    return (
      <div className="absolute flex items-center justify-center"
        style={{
          left: dayOffset * cellWidth + cellWidth / 2 - 7,
          top: '50%', transform: 'translateY(-50%)',
          zIndex: 2,
        }}>
        <span className="text-sm font-bold" title={item.name}
          style={{ color: isCompleted ? '#10b981' : isOverdue ? '#ef4444' : color || 'var(--accent)' }}>
          ◆
        </span>
      </div>
    )
  }

  // Task bar
  const taskStart = item.startDate ? startOfDay(new Date(item.startDate)) : null
  const taskEnd   = item.dueDate   ? startOfDay(new Date(item.dueDate))   : null
  if (!taskStart && !taskEnd) return null

  const rangeStart = taskStart || taskEnd
  const rangeEnd   = taskEnd   || taskStart
  const s = diffDays(startDate, rangeStart)
  const e = diffDays(startDate, rangeEnd)

  if (e < 0 || s >= days) return null

  const clampedS = Math.max(0, s)
  const clampedE = Math.min(days - 1, e)
  const barWidth = Math.max(cellWidth, (clampedE - clampedS + 1) * cellWidth)
  const barLeft  = clampedS * cellWidth

  const isDone    = item.status === 'done'
  const barColor  = isDone ? '#10b981' : STATUS_COLOR[item.status] || color || 'var(--accent)'

  return (
    <button
      onClick={() => onSelect && onSelect(item.id)}
      className="absolute rounded-full flex items-center px-1.5 overflow-hidden hover:brightness-125 transition-all"
      style={{
        left: barLeft,
        top: '50%', transform: 'translateY(-50%)',
        width: barWidth,
        height: 18,
        background: `${barColor}30`,
        border: `1px solid ${barColor}60`,
        zIndex: 1,
        minWidth: cellWidth,
      }}
      title={`${item.title}: ${item.status}`}
    >
      <div className="h-full rounded-full absolute left-0 top-0"
        style={{ width: `${isDone ? 100 : item.status === 'in-progress' ? 50 : 0}%`, background: `${barColor}50` }} />
      <span className="text-[9px] font-medium truncate relative z-10" style={{ color: barColor }}>
        {barWidth > 40 ? item.title : ''}
      </span>
    </button>
  )
})

// ── A single row in the timeline ──────────────────────────────────────────────
const GanttRow = memo(function GanttRow({ label, sublabel, color, items, milestones, startDate, days, cellWidth, zoom, onSelectTask, depth = 0 }) {
  const today = startOfDay(new Date())
  const todayOffset = diffDays(startDate, today)
  const cols = Array.from({ length: days }, (_, i) => i)

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex" style={{ height: 36 }}>
        {/* Label */}
        <div className="flex-shrink-0 w-[200px] flex items-center gap-2 px-3 border-r sticky left-0 z-10"
          style={{
            borderColor: 'rgba(255,255,255,0.07)',
            background: 'rgba(10,0,21,0.92)',
            paddingLeft: depth > 0 ? `${12 + depth * 12}px` : '12px',
          }}>
          {depth > 0 && <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />}
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{label}</p>
            {sublabel && <p className="text-[9px] truncate" style={{ color: 'var(--text-secondary)' }}>{sublabel}</p>}
          </div>
        </div>

        {/* Gantt area */}
        <div className="flex-1 relative" style={{ minWidth: days * cellWidth }}>
          {/* Background columns */}
          {cols.map((i) => {
            const d = addDays(startDate, i)
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            const isToday = i === todayOffset
            return (
              <div key={i} className="absolute top-0 bottom-0"
                style={{
                  left: i * cellWidth,
                  width: cellWidth,
                  background: isToday ? 'rgba(var(--accent-rgb),0.07)' : isWeekend ? 'rgba(255,255,255,0.01)' : 'transparent',
                  borderRight: '1px solid rgba(255,255,255,0.03)',
                }} />
            )
          })}

          {/* Today line */}
          {todayOffset >= 0 && todayOffset < days && (
            <div className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{ left: todayOffset * cellWidth + cellWidth / 2, width: 1, background: 'rgba(var(--accent-rgb),0.5)' }} />
          )}

          {/* Task bars */}
          {(items || []).map((task) => (
            <GanttBar key={task.id} item={task} type="task" startDate={startDate} days={days}
              cellWidth={cellWidth} color={color} onSelect={onSelectTask} />
          ))}

          {/* Milestone markers */}
          {(milestones || []).map((m) => (
            <GanttBar key={m.id} item={m} type="milestone" startDate={startDate} days={days}
              cellWidth={cellWidth} color={color} />
          ))}
        </div>
      </div>
    </div>
  )
})

// ── Timeline page ─────────────────────────────────────────────────────────────
const Timeline = memo(function Timeline() {
  const programs   = useProjectStore((s) => s.programs)
  const projects   = useProjectStore((s) => s.projects)
  const milestones = useProjectStore((s) => s.milestones)
  const tasks      = useTaskStore((s) => s.tasks)
  const selectTask = useSettingsStore((s) => s.selectTask)

  const [zoom, setZoom]         = useState('month')
  const [offsetDays, setOffsetDays] = useState(-7) // shift start by -7 days so today isn't at edge

  const config     = ZOOM_CONFIGS[zoom]
  const startDate  = useMemo(() => startOfDay(addDays(new Date(), offsetDays)), [offsetDays])

  const scroll = (dir) => setOffsetDays((d) => d + dir * (config.days / 3))
  const resetToToday = () => setOffsetDays(-7)

  // Build rows: each top-level project is a group row + task rows per project
  const rows = useMemo(() => {
    const result = []

    programs.forEach((program) => {
      const progProjects = projects.filter((p) => p.programId === program.id && !p.parentId)
      if (progProjects.length === 0) return

      // Program header row (no tasks, just label)
      result.push({
        id: `prog-${program.id}`,
        label: program.name,
        color: program.color,
        isHeader: true,
        items: [],
        milestones: [],
        depth: 0,
      })

      progProjects.forEach((project) => {
        const projectTasks = tasks.filter((t) => t.projectId === project.id)
        const projectMilestones = milestones.filter((m) => m.projectId === project.id)

        result.push({
          id: `proj-${project.id}`,
          label: project.name,
          sublabel: `${projectTasks.filter(t => t.status === 'done').length}/${projectTasks.length} done`,
          color: project.color,
          items: projectTasks.filter(t => t.startDate || t.dueDate),
          milestones: projectMilestones,
          depth: 1,
        })

        // Sub-projects
        const subProjects = projects.filter((p) => p.parentId === project.id)
        subProjects.forEach((sub) => {
          const subTasks = tasks.filter((t) => t.projectId === sub.id)
          result.push({
            id: `proj-${sub.id}`,
            label: sub.name,
            color: sub.color,
            items: subTasks.filter(t => t.startDate || t.dueDate),
            milestones: [],
            depth: 2,
          })
        })
      })
    })

    // Unassigned projects
    const unassigned = projects.filter((p) => !p.programId || !programs.find(prog => prog.id === p.programId))
    const topUnassigned = unassigned.filter((p) => !p.parentId)
    if (topUnassigned.length > 0) {
      result.push({ id: 'unassigned', label: 'Unassigned', color: '#94a3b8', isHeader: true, items: [], milestones: [], depth: 0 })
      topUnassigned.forEach((project) => {
        const projectTasks = tasks.filter((t) => t.projectId === project.id)
        result.push({
          id: `proj-${project.id}`,
          label: project.name,
          color: project.color,
          items: projectTasks.filter(t => t.startDate || t.dueDate),
          milestones: milestones.filter(m => m.projectId === project.id),
          depth: 1,
        })
      })
    }

    return result
  }, [programs, projects, tasks, milestones])

  const totalTasksWithDates = tasks.filter(t => t.startDate || t.dueDate).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 md:px-6 pb-3 flex-wrap">
        {/* Zoom */}
        <div className="flex items-center gap-0.5 rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {Object.entries(ZOOM_CONFIGS).map(([key, cfg]) => (
            <button key={key} onClick={() => setZoom(key)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={zoom === key
                ? { background: 'var(--accent)', color: '#fff' }
                : { color: 'var(--text-secondary)' }}>
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => scroll(-1)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <ChevronLeft size={15} />
          </button>
          <button onClick={resetToToday}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--accent)' }}>
            <Target size={12} /> Today
          </button>
          <button onClick={() => scroll(1)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <ChevronRight size={15} />
          </button>
        </div>

        <span className="text-xs ml-auto" style={{ color: 'var(--text-secondary)' }}>
          {totalTasksWithDates} scheduled tasks
        </span>
      </div>

      {/* Timeline grid */}
      {rows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.1)' }}>
            <Calendar size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No timeline data</p>
          <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Add due dates to tasks and projects to see them in the timeline.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
          <div style={{ minWidth: 200 + config.days * config.cellWidth }}>
            <TimelineHeader
              startDate={startDate}
              days={config.days}
              cellWidth={config.cellWidth}
              zoom={zoom}
            />
            {rows.map((row) => (
              <GanttRow
                key={row.id}
                label={row.label}
                sublabel={row.sublabel}
                color={row.color}
                items={row.items}
                milestones={row.milestones}
                startDate={startDate}
                days={config.days}
                cellWidth={config.cellWidth}
                zoom={zoom}
                onSelectTask={selectTask}
                depth={row.depth}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default Timeline
