import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Folder, FolderOpen, CheckCircle2, Clock, AlertTriangle,
  Trash2, Check, X, ChevronDown, ChevronRight, LayoutList, Kanban,
  Calendar, GitBranch, MoreHorizontal, Share2, GripVertical,
} from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import InfoTooltip from '../components/common/InfoTooltip'
import PageHero from '../components/common/PageHero'
import { InlineDateChip, InlineStatusChip } from '../components/common/InlineFieldChips'
import ColorPalettePicker from '../components/common/ColorPalettePicker'
import ShareModal from '../components/ShareModal'
import { ProgramStatusBadge, STATUS_CONFIG, STATUS_OPTIONS } from '../components/common/ProgramStatusBadge'
import MilestonePanel from '../components/projects/MilestonePanel'
import useProjectStore, { PROJECT_COLORS } from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'
import { sortTasksByStartDate } from '../lib/taskSort'
import { taskMatchesProgram } from '../lib/taskScope'

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' }
const STATUS_LABEL = { todo: 'To Do', 'in-progress': 'Active', review: 'Review', done: 'Done', blocked: 'Blocked' }
const STATUS_COLOR = { todo: '#94a3b8', 'in-progress': '#22d3ee', review: '#f59e0b', done: '#10b981', blocked: '#ef4444' }
const DND_MIME = 'application/x-taskflow-dnd'
let activeDragPayload = null

const writeDragPayload = (event, payload) => {
  activeDragPayload = payload
  const raw = JSON.stringify(payload)
  event.dataTransfer.setData(DND_MIME, raw)
  event.dataTransfer.setData('text/plain', raw)
  event.dataTransfer.effectAllowed = 'move'
}

const readDragPayload = (event) => {
  const raw = event.dataTransfer.getData(DND_MIME) || event.dataTransfer.getData('text/plain')
  if (!raw) return activeDragPayload
  try {
    return JSON.parse(raw)
  } catch {
    return activeDragPayload
  }
}

const createsProjectCycle = (projects, movingProjectId, nextParentId) => {
  let cursorId = nextParentId
  while (cursorId) {
    if (cursorId === movingProjectId) return true
    const cursor = projects.find((project) => project.id === cursorId)
    cursorId = cursor?.parentId ?? null
  }
  return false
}

const formatShortDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const collectProjectTreeIds = (projects, projectId) => {
  const ids = [projectId]
  for (let index = 0; index < ids.length; index += 1) {
    const currentId = ids[index]
    projects.forEach((project) => {
      if (project.parentId === currentId && !ids.includes(project.id)) ids.push(project.id)
    })
  }
  return ids
}

const buildScheduleWindow = (...collections) => {
  const starts = []
  const dues = []

  collections.flat().forEach((item) => {
    if (!item) return
    if (item.startDate) {
      const start = new Date(item.startDate)
      if (!Number.isNaN(start.getTime())) starts.push(start)
    }
    if (item.dueDate) {
      const due = new Date(item.dueDate)
      if (!Number.isNaN(due.getTime())) dues.push(due)
    }
  })

  starts.sort((a, b) => a - b)
  dues.sort((a, b) => a - b)

  return {
    startDate: starts[0] ? starts[0].toISOString() : null,
    dueDate: dues[dues.length - 1] ? dues[dues.length - 1].toISOString() : null,
  }
}

const formatWindowLabel = (startDate, dueDate) => {
  const startLabel = formatShortDate(startDate)
  const dueLabel = formatShortDate(dueDate)
  if (startLabel && dueLabel) return `${startLabel} - ${dueLabel}`
  if (startLabel) return `Starts ${startLabel}`
  if (dueLabel) return `Due ${dueLabel}`
  return 'No schedule set'
}

const sortMilestones = (milestones) => (
  [...milestones].sort((left, right) => {
    const leftTs = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    const rightTs = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    return leftTs - rightTs
  })
)

const getHealthMeta = ({ total, done, blocked, overdue, unscheduled }) => {
  if (total === 0) return { label: 'Planning', color: '#94a3b8', background: 'rgba(148,163,184,0.14)', detail: 'No active work yet' }
  if (done === total) return { label: 'Complete', color: '#10b981', background: 'rgba(16,185,129,0.14)', detail: 'All tasks closed' }
  if (overdue > 0) return { label: 'At risk', color: '#ef4444', background: 'rgba(239,68,68,0.16)', detail: `${overdue} overdue` }
  if (blocked > 0) return { label: 'Needs attention', color: '#f97316', background: 'rgba(249,115,22,0.16)', detail: `${blocked} blocked` }
  if (unscheduled > 0) return { label: 'Needs dates', color: '#f59e0b', background: 'rgba(245,158,11,0.16)', detail: `${unscheduled} unscheduled` }
  return { label: 'On track', color: '#22d3ee', background: 'rgba(34,211,238,0.16)', detail: 'Healthy delivery rhythm' }
}

const Editable = memo(function Editable({ value, onSave, className, style, maxLength = 60 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const commit = () => {
    if (draft.trim()) onSave(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') setEditing(false)
        }}
        className={`${className} bg-transparent border-b`}
        style={{ ...style, borderColor: 'var(--accent)', outline: 'none' }}
        maxLength={maxLength}
      />
    )
  }

  return (
    <span
      className={`${className} cursor-text hover:opacity-80`}
      style={style}
      onClick={(event) => {
        event.stopPropagation()
        setDraft(value)
        setEditing(true)
      }}
      title="Click to rename"
    >
      {value}
    </span>
  )
})

const ColorDot = memo(function ColorDot({ color, onChange }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined' || !buttonRef.current) return

    const updatePosition = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const menuWidth = menuRef.current?.offsetWidth ?? 178
      const menuHeight = menuRef.current?.offsetHeight ?? 180
      const viewportPadding = 8
      const gap = 8

      let left = rect.left
      let top = rect.bottom + gap

      if (left + menuWidth > window.innerWidth - viewportPadding) left = window.innerWidth - menuWidth - viewportPadding
      if (left < viewportPadding) left = viewportPadding
      if (top + menuHeight > window.innerHeight - viewportPadding) top = rect.top - menuHeight - gap
      if (top < viewportPadding) top = viewportPadding

      setMenuPos({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleMouseDown = (event) => {
      const target = event.target
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  return (
    <div className="relative flex-shrink-0" onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="w-5 h-5 rounded-full p-[2px] hover:scale-105 transition-transform"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: open ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.16)',
          boxShadow: open ? `0 0 0 2px ${color}33` : 'none',
        }}
        title="Change color"
      >
        <span className="w-full h-full rounded-full block" style={{ background: color }} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[100] w-[178px]"
            style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px`, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
          >
            <ColorPalettePicker
              colors={PROJECT_COLORS}
              value={color}
              compact
              onChange={(next) => {
                if (!next) return
                onChange(next)
                setOpen(false)
              }}
            />
          </div>
        </>,
        document.body
      )}
    </div>
  )
})

const ActionMenu = memo(function ActionMenu({ label, icon: Icon = MoreHorizontal, items, iconOnly = false, accent = false }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className={`inline-flex items-center gap-1.5 rounded-xl transition-colors ${iconOnly ? 'p-2' : 'px-3 py-2 text-xs font-semibold'}`}
        style={accent
          ? { background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.18)' }
          : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Icon size={13} />
        {!iconOnly && label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full right-0 mt-1 z-50 rounded-2xl overflow-hidden"
            style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)', boxShadow: '0 16px 48px rgba(15,23,42,0.18)', minWidth: '180px' }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpen(false)
                  item.onClick()
                }}
                className="w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-100"
                style={item.tone === 'danger' ? { color: '#dc2626' } : { color: '#334155' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
})

const MetricTile = memo(function MetricTile({ icon: Icon, label, value, detail, tone = 'default' }) {
  const palette = tone === 'danger'
    ? { background: 'rgba(239,68,68,0.09)', border: 'rgba(239,68,68,0.18)', color: '#fca5a5' }
    : tone === 'accent'
      ? { background: 'rgba(var(--accent-rgb),0.12)', border: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)' }
      : { background: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }

  return (
    <div
      className="rounded-2xl px-3 py-2.5"
      style={{ background: palette.background, border: `1px solid ${palette.border}` }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
        <Icon size={11} style={{ color: palette.color }} />
        {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      {detail && (
        <p className="mt-1 text-[11px] leading-4.5" style={{ color: 'var(--text-secondary)' }}>
          {detail}
        </p>
      )}
    </div>
  )
})

const MilestonePreviewStrip = memo(function MilestonePreviewStrip({ label, milestones, accentColor, onToggle, expanded }) {
  const visibleMilestones = sortMilestones(milestones).slice(0, 3)

  return (
    <div
      className="rounded-2xl px-3.5 py-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            {milestones.length > 0
              ? `${milestones.length} milestone${milestones.length === 1 ? '' : 's'} in this workstream`
              : 'No milestones pinned yet'}
          </p>
        </div>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[11px] px-2.5 py-1.5 rounded-full transition-colors"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            {expanded ? 'Hide details' : milestones.length > 0 ? 'Manage' : 'Add milestone'}
          </button>
        )}
      </div>
      {visibleMilestones.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {visibleMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[11px]"
              style={{ background: `${accentColor}14`, color: 'var(--text-primary)', border: `1px solid ${accentColor}24` }}
            >
              <span style={{ color: accentColor }}>◆</span>
              <span className="font-medium">{milestone.name}</span>
              {milestone.dueDate && (
                <span style={{ color: 'var(--text-secondary)' }}>{formatShortDate(milestone.dueDate)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

const TaskRow = memo(function TaskRow({ task, onDragStart, onDragOver, onDrop }) {
  const selectTask = useSettingsStore((state) => state.selectTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const now = new Date()
  const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'

  const updateDateField = (field, nextValue) => {
    updateTask(task.id, { [field]: nextValue ? new Date(nextValue).toISOString() : null })
  }

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart?.(event, task)}
      onDragOver={(event) => onDragOver?.(event, task)}
      onDrop={(event) => onDrop?.(event, task)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-white/5 group"
      style={{ border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[task.priority] }} />
      <button
        type="button"
        onClick={() => selectTask(task.id)}
        className="flex-1 min-w-0 bg-transparent border-0 p-0 text-left"
      >
        <span
          className="block text-sm truncate"
          style={{
            color: task.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
      </button>
      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        <InlineDateChip label="Start" value={task.startDate} onChange={(nextValue) => updateDateField('startDate', nextValue)} />
        <InlineDateChip label="Due" value={task.dueDate} tone={isOverdue ? 'danger' : 'default'} onChange={(nextValue) => updateDateField('dueDate', nextValue)} />
      </div>
      {task.subtasks?.length > 0 && (
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {task.subtasks.filter((subtask) => subtask.completed).length}/{task.subtasks.length}
        </span>
      )}
      <InlineStatusChip value={task.status} onChange={(nextStatus) => updateTask(task.id, { status: nextStatus })} labels={STATUS_LABEL} colors={STATUS_COLOR} />
    </div>
  )
})

const KanbanCard = memo(function KanbanCard({ task }) {
  const selectTask = useSettingsStore((state) => state.selectTask)
  return (
    <button
      type="button"
      onClick={() => selectTask(task.id)}
      className="w-full text-left p-2.5 rounded-xl transition-colors hover:bg-white/5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: PRIORITY_COLOR[task.priority] }} />
        <span className="text-xs leading-snug" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
      </div>
      {task.subtasks?.length > 0 && (
        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {task.subtasks.filter((subtask) => subtask.completed).length}/{task.subtasks.length} subtasks
        </div>
      )}
    </button>
  )
})

const KANBAN_COLS = [
  { id: 'todo', label: 'To Do', color: '#94a3b8' },
  { id: 'in-progress', label: 'In Progress', color: '#22d3ee' },
  { id: 'review', label: 'Review', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#10b981' },
  { id: 'blocked', label: 'Blocked', color: '#ef4444' },
]

const ProjectPanel = memo(function ProjectPanel({ project, depth = 0 }) {
  const tasks = useTaskStore((state) => state.tasks)
  const moveTask = useTaskStore((state) => state.moveTask)
  const updateProject = useProjectStore((state) => state.updateProject)
  const moveProject = useProjectStore((state) => state.moveProject)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const addProject = useProjectStore((state) => state.addProject)
  const programs = useProjectStore((state) => state.programs)
  const milestones = useProjectStore((state) => state.milestones ?? [])
  const allProjects = useProjectStore((state) => state.projects)
  const activeProjectId = useSettingsStore((state) => state.activeProjectId)
  const setActiveProject = useSettingsStore((state) => state.setActiveProject)

  const [view, setView] = useState('list')
  const [expanded, setExpanded] = useState(() => activeProjectId === project.id)
  const [showWork, setShowWork] = useState(() => activeProjectId === project.id)
  const [addingSub, setAddingSub] = useState(false)
  const [subName, setSubName] = useState('')
  const [subColor, setSubColor] = useState(project.color)
  const [showMilestones, setShowMilestones] = useState(false)
  const [showMovePicker, setShowMovePicker] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)

  const childProjects = useMemo(() => allProjects.filter((candidate) => candidate.parentId === project.id), [allProjects, project.id])
  const projectTreeIds = useMemo(() => collectProjectTreeIds(allProjects, project.id), [allProjects, project.id])
  const directTasks = useMemo(() => sortTasksByStartDate(tasks.filter((task) => task.projectId === project.id)), [tasks, project.id])
  const allProjectTasks = useMemo(() => sortTasksByStartDate(tasks.filter((task) => task.projectId && projectTreeIds.includes(task.projectId))), [tasks, projectTreeIds])
  const projectMilestones = useMemo(() => sortMilestones(milestones.filter((milestone) => milestone.projectId === project.id)), [milestones, project.id])

  const total = allProjectTasks.length
  const done = allProjectTasks.filter((task) => task.status === 'done').length
  const inProgress = allProjectTasks.filter((task) => task.status === 'in-progress' || task.status === 'review').length
  const blocked = allProjectTasks.filter((task) => task.status === 'blocked').length
  const now = new Date()
  const overdue = allProjectTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'done').length
  const unscheduled = allProjectTasks.filter((task) => !task.startDate && !task.dueDate).length
  const completion = total ? Math.round((done / total) * 100) : 0
  const health = getHealthMeta({ total, done, blocked, overdue, unscheduled })
  const scheduleWindow = buildScheduleWindow(project, childProjects, allProjectTasks, projectMilestones)
  const windowLabel = formatWindowLabel(scheduleWindow.startDate, scheduleWindow.dueDate)

  useEffect(() => {
    if (activeProjectId === project.id) {
      setExpanded(true)
      setShowWork(true)
    }
  }, [activeProjectId, project.id])

  const submitSubProject = () => {
    if (!subName.trim()) return
    addProject({ name: subName.trim(), color: subColor, programId: project.programId, parentId: project.id })
    setSubName('')
    setAddingSub(false)
  }

  const openTaskComposer = () => {
    setActiveProject(project.id)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('taskflow:quick-add', {
          detail: { type: 'task', projectId: project.id, programId: project.programId ?? '' },
        })
      )
    }
  }

  const toggleExpanded = () => {
    setExpanded((current) => !current)
    setActiveProject(project.id)
  }

  const handleProjectDragStart = (event) => {
    event.stopPropagation()
    writeDragPayload(event, {
      type: 'project',
      id: project.id,
      programId: project.programId ?? null,
      parentId: project.parentId ?? null,
    })
  }

  const handleProjectDragOver = (event) => {
    const payload = readDragPayload(event)
    if (!payload) return
    if (payload.type === 'project' || payload.type === 'task') {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleProjectDrop = (event) => {
    const payload = readDragPayload(event)
    if (!payload) return

    if (payload.type === 'project' && payload.id !== project.id) {
      event.preventDefault()
      event.stopPropagation()
      const nextParentId = project.parentId ?? null
      if (createsProjectCycle(allProjects, payload.id, nextParentId)) return
      moveProject(payload.id, {
        programId: project.programId ?? null,
        parentId: nextParentId,
        beforeProjectId: project.id,
      })
      return
    }

    if (payload.type === 'task' && payload.id) {
      event.preventDefault()
      event.stopPropagation()
      moveTask(payload.id, { projectId: project.id })
    }
  }

  const handleTaskDragStart = (event, task) => {
    event.stopPropagation()
    writeDragPayload(event, {
      type: 'task',
      id: task.id,
      projectId: task.projectId ?? null,
    })
  }

  const handleTaskDragOver = (event, task) => {
    const payload = readDragPayload(event)
    if (!payload || payload.type !== 'task' || payload.id === task.id) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleTaskDrop = (event, task) => {
    const payload = readDragPayload(event)
    if (!payload || payload.type !== 'task' || payload.id === task.id) return
    event.preventDefault()
    event.stopPropagation()
    moveTask(payload.id, { projectId: project.id, beforeTaskId: task.id })
  }

  return (
    <div
      className="rounded-[26px] overflow-hidden"
      data-project-id={project.id}
      onDragOver={handleProjectDragOver}
      onDrop={handleProjectDrop}
      style={{
        border: `1px solid ${project.color}${depth > 0 ? '22' : '28'}`,
        background: depth > 0 ? 'rgba(255,255,255,0.014)' : 'rgba(255,255,255,0.02)',
        boxShadow: expanded ? `0 18px 42px ${project.color}10` : 'none',
      }}
    >
      <div
        onClick={toggleExpanded}
        className="group cursor-pointer px-4 py-3"
        style={{ background: `${project.color}${expanded ? '0f' : '09'}`, borderBottom: expanded ? `1px solid ${project.color}18` : 'none' }}
      >
        <div className="flex items-start gap-3">
          <button type="button" onClick={(event) => { event.stopPropagation(); toggleExpanded() }} style={{ color: 'var(--text-secondary)' }}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
          <button
            type="button"
            draggable
            onDragStart={handleProjectDragStart}
            onClick={(event) => event.stopPropagation()}
            className="p-0.5 rounded hover:bg-white/8 cursor-grab active:cursor-grabbing"
            style={{ color: 'var(--text-secondary)' }}
            title="Drag to reorder or move project"
          >
            <GripVertical size={12} />
          </button>
          <ColorDot color={project.color} onChange={(nextColor) => updateProject(project.id, { color: nextColor })} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {depth > 0 && <GitBranch size={10} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
              <Editable value={project.name} onSave={(name) => updateProject(project.id, { name })} className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }} />
              {depth > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                  Sub-project
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: health.background, color: health.color }}>
                {health.label}
              </span>
              <InfoTooltip text={project.description} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span>{windowLabel}</span>
              <span>{total} task{total === 1 ? '' : 's'}</span>
              {childProjects.length > 0 && <span>{childProjects.length} sub-project{childProjects.length === 1 ? '' : 's'}</span>}
              {projectMilestones.length > 0 && <span>{projectMilestones.length} milestone{projectMilestones.length === 1 ? '' : 's'}</span>}
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-3 min-w-[220px]" onClick={(event) => event.stopPropagation()}>
            <div className="flex-1 min-w-[120px]">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completion}%`, background: `linear-gradient(90deg, ${project.color}88, ${project.color})` }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                <span>{done}/{total || 0} done</span>
                <span style={{ color: project.color }}>{completion}%</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: `${project.color}18`, color: project.color }}>
              {inProgress} active
            </span>
          </div>

          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <ActionMenu
              iconOnly
              items={[
                { label: showMovePicker ? 'Hide move picker' : 'Move to program…', onClick: () => setShowMovePicker((current) => !current) },
                { label: showShare ? 'Hide share link' : 'Share project', onClick: () => setShowShare(true) },
                { label: deleteArmed ? 'Cancel delete' : 'Delete project', onClick: () => setDeleteArmed((current) => !current), tone: 'danger' },
              ]}
            />
          </div>
        </div>
      </div>

      {showMovePicker && (
        <div className="px-4 pb-2">
          <select
            value={project.programId ?? ''}
            onChange={(event) => {
              moveProject(project.id, { programId: event.target.value || null, parentId: project.parentId ?? null })
              setShowMovePicker(false)
            }}
            className="w-full text-xs px-2.5 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
          >
            <option value="">Unassigned</option>
            {programs.map((programOption) => (
              <option key={programOption.id} value={programOption.id}>{programOption.name}</option>
            ))}
          </select>
        </div>
      )}

      {deleteArmed && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}>
            <span className="text-[11px]" style={{ color: '#fca5a5' }}>Delete this project and its nested work?</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDeleteArmed(false)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.08)' }}>Cancel</button>
              <button type="button" onClick={() => deleteProject(project.id)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: '#fff', background: '#dc2626' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-3.5 pt-2.5 space-y-2.5" style={{ background: `${project.color}05` }}>
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={CheckCircle2} label="Progress" value={`${completion}% complete`} detail={`${done} of ${total || 0} tasks closed`} tone="accent" />
            <MetricTile icon={Clock} label="Execution" value={`${inProgress} active`} detail={unscheduled > 0 ? `${unscheduled} tasks still need dates` : 'Tasks are sequenced'} />
            <MetricTile icon={Calendar} label="Schedule" value={windowLabel} detail={project.dueDate ? `Project due ${formatShortDate(project.dueDate)}` : 'No project-level due date'} />
            <MetricTile icon={AlertTriangle} label="Health" value={health.label} detail={health.detail} tone={overdue > 0 || blocked > 0 ? 'danger' : 'default'} />
          </div>

          <MilestonePreviewStrip
            label="Milestones"
            milestones={projectMilestones}
            accentColor={project.color}
            expanded={showMilestones}
            onToggle={() => setShowMilestones((current) => !current)}
          />

          {showMilestones && (
            <div className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <MilestonePanel projectId={project.id} projectColor={project.color} />
            </div>
          )}

          {childProjects.length > 0 && (
            <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Sub-projects</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Keep the hierarchy clean. Open a sub-project only when you want its work.</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: `${project.color}18`, color: project.color }}>{childProjects.length}</span>
              </div>
              <div className="space-y-2">
                {childProjects.map((childProject) => (
                  <ProjectPanel key={childProject.id} project={childProject} depth={depth + 1} />
                ))}
              </div>
            </div>
          )}

          {depth === 0 && (
            <div className="rounded-2xl px-3.5 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {addingSub ? (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Add sub-project</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Split this project into clearer sub-projects without opening another program.</p>
                  </div>
                  <input
                    autoFocus
                    value={subName}
                    onChange={(event) => setSubName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitSubProject()
                      if (event.key === 'Escape') setAddingSub(false)
                    }}
                    placeholder="Sub-project name…"
                    maxLength={60}
                    className="w-full text-xs px-2.5 py-2 rounded-xl bg-transparent border"
                    style={{ borderColor: 'rgba(var(--accent-rgb),0.3)', color: 'var(--text-primary)' }}
                  />
                  <ColorPalettePicker colors={PROJECT_COLORS} value={subColor} compact onChange={(next) => next && setSubColor(next)} />
                  <div className="flex gap-2">
                    <button type="button" onClick={submitSubProject} className="flex-1 btn-accent py-1.5 text-xs">Create sub-project</button>
                    <button type="button" onClick={() => setAddingSub(false)} className="btn-ghost py-1.5 text-xs px-3">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingSub(true)}
                  className="flex items-center gap-2 text-[11px] px-2.5 py-2 rounded-xl transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Plus size={12} /> Add sub-project
                </button>
              )}
            </div>
          )}

          <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Work items</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Open work only when you want to review or update the tasks inside this project.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {directTasks.length > 0 && showWork && (
                  <div className="flex items-center gap-0.5 rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {[['list', LayoutList], ['board', Kanban]].map(([nextView, Icon]) => (
                      <button
                        key={nextView}
                        type="button"
                        onClick={() => setView(nextView)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={view === nextView ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-secondary)' }}
                      >
                        <Icon size={12} />
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setShowWork((current) => !current)} className="text-[11px] px-2.5 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                  {showWork ? 'Hide tasks' : 'Show tasks'}
                </button>
                <button type="button" onClick={openTaskComposer} className="text-[11px] px-2.5 py-2 rounded-xl" style={{ background: `${project.color}18`, color: project.color }}>
                  Add task
                </button>
              </div>
            </div>

            {showWork ? (
              directTasks.length === 0 ? (
                <div className="rounded-2xl px-3 py-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  No direct tasks yet. Add work here or keep it inside sub-projects.
                </div>
              ) : view === 'list' ? (
                <div className="space-y-1">
                  {directTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onDragStart={handleTaskDragStart} onDragOver={handleTaskDragOver} onDrop={handleTaskDrop} />
                  ))}
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                  {KANBAN_COLS.map((column) => {
                    const columnTasks = directTasks.filter((task) => task.status === column.id)
                    return (
                      <div key={column.id} className="flex-shrink-0 w-[220px] snap-start">
                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: column.color }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: column.color }}>{column.label}</span>
                          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-secondary)' }}>{columnTasks.length}</span>
                        </div>
                        <div className="space-y-1.5 min-h-[40px]">
                          {columnTasks.map((task) => <KanbanCard key={task.id} task={task} />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              <div className="rounded-2xl px-3 py-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                {directTasks.length > 0 ? `${directTasks.length} direct task${directTasks.length === 1 ? '' : 's'} tucked under this project.` : 'No direct tasks here yet.'}
              </div>
            )}
          </div>
        </div>
      )}

      {showShare && (
        <ShareModal resourceType="project" resourceId={project.id} resourceName={project.name} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
})

const ProgramSection = memo(function ProgramSection({ program, projects }) {
  const updateProgram = useProjectStore((state) => state.updateProgram)
  const moveProgram = useProjectStore((state) => state.moveProgram)
  const deleteProgram = useProjectStore((state) => state.deleteProgram)
  const addProject = useProjectStore((state) => state.addProject)
  const moveProject = useProjectStore((state) => state.moveProject)
  const milestones = useProjectStore((state) => state.milestones ?? [])
  const tasks = useTaskStore((state) => state.tasks)
  const activeProgramId = useSettingsStore((state) => state.activeProgramId)
  const activeProjectId = useSettingsStore((state) => state.activeProjectId)

  const [collapsed, setCollapsed] = useState(false)
  const [addingProject, setAddingProject] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjColor, setNewProjColor] = useState(PROJECT_COLORS[0])
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)

  const topLevelProjects = projects.filter((project) => !project.parentId)
  const containsActiveProject = !!activeProjectId && projects.some((project) => project.id === activeProjectId)
  const projectMilestones = useMemo(() => sortMilestones(milestones.filter((milestone) => projects.some((project) => project.id === milestone.projectId))), [milestones, projects])

  const programDirectTasks = useMemo(() => sortTasksByStartDate(tasks.filter((task) => !task.projectId && taskMatchesProgram(task, program.id, projects))), [tasks, program.id, projects])
  const allTasks = useMemo(() => tasks.filter((task) => taskMatchesProgram(task, program.id, projects)), [tasks, program.id, projects])

  const totalTasks = allTasks.length
  const doneTasks = allTasks.filter((task) => task.status === 'done').length
  const inProgress = allTasks.filter((task) => task.status === 'in-progress' || task.status === 'review').length
  const blocked = allTasks.filter((task) => task.status === 'blocked').length
  const now = new Date()
  const overdue = allTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'done').length
  const unscheduled = allTasks.filter((task) => !task.startDate && !task.dueDate).length
  const completion = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const health = getHealthMeta({ total: totalTasks, done: doneTasks, blocked, overdue, unscheduled })
  const scheduleWindow = buildScheduleWindow(program, projects, allTasks, projectMilestones)
  const windowLabel = formatWindowLabel(scheduleWindow.startDate, scheduleWindow.dueDate)

  useEffect(() => {
    if (activeProgramId === program.id || containsActiveProject) setCollapsed(false)
  }, [activeProgramId, containsActiveProject, program.id])

  const submitProject = () => {
    if (!newProjName.trim()) return
    addProject({ name: newProjName.trim(), color: newProjColor, programId: program.id })
    setNewProjName('')
    setAddingProject(false)
  }

  const handleProgramDragStart = (event) => {
    event.stopPropagation()
    writeDragPayload(event, { type: 'program', id: program.id })
  }

  const handleProgramDragOver = (event) => {
    const payload = readDragPayload(event)
    if (!payload) return
    if (payload.type === 'program' && payload.id !== program.id) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }
    if (payload.type === 'project') {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleProgramDrop = (event) => {
    const payload = readDragPayload(event)
    if (!payload) return

    if (payload.type === 'program' && payload.id !== program.id) {
      event.preventDefault()
      event.stopPropagation()
      moveProgram(payload.id, program.id)
      return
    }

    if (payload.type === 'project') {
      event.preventDefault()
      event.stopPropagation()
      moveProject(payload.id, { programId: program.id, parentId: null })
      return
    }
  }

  return (
    <div className="mb-4 rounded-[28px] overflow-hidden" data-program-id={program.id} onDragOver={handleProgramDragOver} onDrop={handleProgramDrop} style={{ border: `1px solid ${program.color}24`, background: 'rgba(255,255,255,0.02)' }}>
      <div className="px-4 md:px-5 py-3.5" style={{ background: `${program.color}08` }}>
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => setCollapsed((current) => !current)} style={{ color: 'var(--text-secondary)' }}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            type="button"
            draggable
            onDragStart={handleProgramDragStart}
            onClick={(event) => event.stopPropagation()}
            className="p-0.5 rounded hover:bg-white/8 cursor-grab active:cursor-grabbing"
            style={{ color: 'var(--text-secondary)' }}
            title="Drag to reorder program"
          >
            <GripVertical size={13} />
          </button>
          <div className="w-3 h-3 rounded flex-shrink-0 mt-1" style={{ background: program.color, boxShadow: `0 0 8px ${program.color}60` }} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Editable value={program.name} onSave={(name) => updateProgram(program.id, { name })} className="text-base font-bold" style={{ color: 'var(--text-primary)' }} />
              <div className="relative">
                <button type="button" onClick={() => setShowStatusPicker((current) => !current)}>
                  <ProgramStatusBadge status={program.status || 'planning'} />
                </button>
                {showStatusPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowStatusPicker(false)} />
                    <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)', boxShadow: '0 16px 48px rgba(15,23,42,0.18)', minWidth: '140px' }}>
                      {STATUS_OPTIONS.map((value) => {
                        const config = STATUS_CONFIG[value]
                        const active = (program.status || 'planning') === value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              updateProgram(program.id, { status: value })
                              setShowStatusPicker(false)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 transition-colors"
                            style={active ? { color: config.color, background: `${config.color}12` } : { color: '#334155' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: config.color }} />
                            {config.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: health.background, color: health.color }}>{health.label}</span>
              <InfoTooltip text={program.description} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span>{windowLabel}</span>
              <span>{topLevelProjects.length} project{topLevelProjects.length === 1 ? '' : 's'}</span>
              <span>{totalTasks} task{totalTasks === 1 ? '' : 's'}</span>
              {projectMilestones.length > 0 && <span>{projectMilestones.length} milestone{projectMilestones.length === 1 ? '' : 's'}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <ActionMenu
              label="Add"
              icon={Plus}
              accent
              items={[
                { label: 'Add project', onClick: () => setAddingProject(true) },
              ]}
            />
            <ActionMenu
              iconOnly
              items={[
                { label: 'Share program', onClick: () => setShowShare(true) },
                { label: deleteArmed ? 'Cancel delete' : 'Delete program', onClick: () => setDeleteArmed((current) => !current), tone: 'danger' },
              ]}
            />
          </div>
        </div>
      </div>

      {deleteArmed && (
        <div className="px-4 md:px-5 py-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}>
            <span className="text-[11px]" style={{ color: '#fca5a5' }}>Delete this program and unassign its projects?</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDeleteArmed(false)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.08)' }}>Cancel</button>
              <button type="button" onClick={() => deleteProgram(program.id)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: '#fff', background: '#dc2626' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="px-4 md:px-5 pb-4 pt-3.5 space-y-3" style={{ borderTop: `1px solid ${program.color}12` }}>
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Folder} label="Projects" value={`${topLevelProjects.length} active projects`} detail={topLevelProjects.length > 0 ? `${projects.length - topLevelProjects.length > 0 ? `${projects.length - topLevelProjects.length} nested beneath them` : 'No nested sub-projects yet'}` : 'Create the first project to start structuring work'} tone="accent" />
            <MetricTile icon={CheckCircle2} label="Progress" value={`${completion}% complete`} detail={`${doneTasks} of ${totalTasks || 0} tasks closed`} />
            <MetricTile icon={Clock} label="Execution" value={`${inProgress} active`} detail={unscheduled > 0 ? `${unscheduled} tasks still need dates` : 'Work is sequenced across projects'} />
            <MetricTile icon={AlertTriangle} label="Health" value={health.label} detail={health.detail} tone={overdue > 0 || blocked > 0 ? 'danger' : 'default'} />
          </div>

          <MilestonePreviewStrip label="Program milestones" milestones={projectMilestones} accentColor={program.color} />

          {programDirectTasks.length > 0 && (
            <div className="rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Program-level tasks</p>
                <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {programDirectTasks.length} task{programDirectTasks.length === 1 ? '' : 's'} sit at program level. Manage them from All Tasks if needed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  useSettingsStore.getState().setActiveProgram(program.id)
                  useSettingsStore.getState().setPage('tasks')
                }}
                className="text-[11px] px-2.5 py-2 rounded-xl flex-shrink-0"
                style={{ background: `${program.color}18`, color: program.color }}
              >
                Open tasks
              </button>
            </div>
          )}

          {addingProject && (
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
              <div className="flex flex-col gap-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>New project</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Add the next project inside this program.</p>
                </div>
                <input
                  autoFocus
                  value={newProjName}
                  onChange={(event) => setNewProjName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submitProject()
                    if (event.key === 'Escape') setAddingProject(false)
                  }}
                  placeholder="Project name…"
                  maxLength={60}
                  className="w-full text-sm px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }}
                />
                <ColorPalettePicker colors={PROJECT_COLORS} value={newProjColor} onChange={(next) => next && setNewProjColor(next)} />
                <div className="flex gap-2">
                  <button type="button" onClick={submitProject} className="flex-1 btn-accent py-1.5 text-xs">Create project</button>
                  <button type="button" onClick={() => setAddingProject(false)} className="btn-ghost py-1.5 text-xs px-3">Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {topLevelProjects.length === 0 && programDirectTasks.length === 0 && !addingProject ? (
              <div className="rounded-2xl px-4 py-5 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                    No projects yet. Add the first project for this program.
              </div>
            ) : (
              topLevelProjects.map((projectItem) => (
                <ProjectPanel key={projectItem.id} project={projectItem} />
              ))
            )}
          </div>
        </div>
      )}

      {showShare && <ShareModal resourceType="program" resourceId={program.id} resourceName={program.name} onClose={() => setShowShare(false)} />}
    </div>
  )
})

const StructureExplorer = memo(function StructureExplorer({
  programs,
  projects,
  tasks,
  unassignedProjects,
  activeProgramId,
  activeProjectId,
  previewProgramId,
  onSelectProgram,
  onSelectProject,
  onSelectUnassigned,
}) {
  const topLevelProjects = useMemo(() => projects.filter((project) => !project.parentId), [projects])

  return (
    <GlassCard padding="p-3.5" rounded="rounded-[28px]" className="sticky top-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
            Structure
          </p>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Programs & Projects
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span
            className="px-2 py-1 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}
          >
            {programs.length} programs
          </span>
          <span
            className="px-2 py-1 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
          >
            {topLevelProjects.length} top-level projects
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {programs.map((program) => {
          const programProjects = topLevelProjects.filter((project) => project.programId === program.id)
          const programTasks = tasks.filter((task) => taskMatchesProgram(task, program.id, projects))
          const isProgramActive = activeProgramId === program.id || (!activeProgramId && !activeProjectId && previewProgramId === program.id)
          const hasActiveProject = programProjects.some((project) => project.id === activeProjectId)
          const isExpanded = isProgramActive || hasActiveProject

          return (
            <div
              key={program.id}
              className="rounded-2xl px-3 py-2.5"
              style={{
                background: isExpanded ? `${program.color}10` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isExpanded ? `${program.color}30` : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <button type="button" onClick={() => onSelectProgram(program.id)} className="w-full text-left">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: program.color, boxShadow: `0 0 8px ${program.color}55` }} />
                  <span className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{program.name}</span>
                  <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                    {programProjects.length} projects
                  </span>
                </div>
                <div className="mt-1.5 pl-5 text-[11px] flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
                  <span>{programTasks.length} tasks</span>
                  <span>{programTasks.filter((task) => task.status === 'done').length} done</span>
                  {isProgramActive && !activeProjectId && <span style={{ color: 'var(--accent)' }}>Selected</span>}
                </div>
              </button>

              {isExpanded && programProjects.length > 0 && (
                <div className="mt-2.5 pl-5 space-y-1.5">
                  {programProjects.map((project) => {
                    const projectTasks = tasks.filter((task) => task.projectId === project.id)
                    const isProjectActive = activeProjectId === project.id
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => onSelectProject(project.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors"
                        style={isProjectActive
                          ? { background: `${project.color}20`, border: `1px solid ${project.color}35`, color: project.color }
                          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
                        <span className="flex-1 text-[12px] font-medium truncate" style={{ color: isProjectActive ? project.color : 'var(--text-primary)' }}>
                          {project.name}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'inherit' }}>
                          {projectTasks.length}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {unassignedProjects.length > 0 && (
          <button
            type="button"
            onClick={onSelectUnassigned}
            className="w-full text-left rounded-2xl px-3 py-2.5 transition-colors"
            style={{
              background: !activeProgramId && activeProjectId && !projects.find((project) => project.id === activeProjectId)?.programId
                ? 'rgba(var(--accent-rgb),0.12)'
                : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Folder size={14} style={{ color: 'var(--text-secondary)' }} />
              <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Unassigned projects</span>
              <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                {unassignedProjects.filter((project) => !project.parentId).length}
              </span>
            </div>
            <div className="mt-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Review detached work
            </div>
          </button>
        )}
      </div>
    </GlassCard>
  )
})

const UnassignedSection = memo(function UnassignedSection({ projects }) {
  const moveProject = useProjectStore((state) => state.moveProject)
  const [collapsed, setCollapsed] = useState(false)
  const topLevelProjects = projects.filter((project) => !project.parentId)
  if (topLevelProjects.length === 0) return null

  return (
    <div className="mb-6 rounded-[28px] overflow-hidden" onDragOver={(event) => {
      const payload = readDragPayload(event)
      if (!payload || payload.type !== 'project') return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }} onDrop={(event) => {
      const payload = readDragPayload(event)
      if (!payload || payload.type !== 'project') return
      event.preventDefault()
      event.stopPropagation()
      moveProject(payload.id, { programId: null, parentId: null })
    }} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2.5 px-4 py-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <button type="button" onClick={() => setCollapsed((current) => !current)} style={{ color: 'var(--text-secondary)' }}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </button>
        <Folder size={14} style={{ color: 'var(--text-secondary)' }} />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Unassigned projects</h2>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Projects not currently attached to a program.</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
          {topLevelProjects.length}
        </span>
      </div>
      {!collapsed && (
        <div className="px-4 py-4 space-y-3">
          {topLevelProjects.map((project) => <ProjectPanel key={project.id} project={project} />)}
        </div>
      )}
    </div>
  )
})

const NewProgramForm = memo(function NewProgramForm({ onDone }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [desc, setDesc] = useState('')
  const addProgram = useProjectStore((state) => state.addProgram)

  const submit = () => {
    if (!name.trim()) return
    addProgram({ name: name.trim(), color, description: desc.trim() })
    onDone()
  }

  return (
    <GlassCard padding="p-4" className="flex flex-col gap-3 mb-6">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: color }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Program</span>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
          if (event.key === 'Escape') onDone()
        }}
        placeholder="Program name (e.g. Credit Cards, GTM)…"
        maxLength={60}
        className="w-full text-sm px-3 py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }}
      />
      <input
        value={desc}
        onChange={(event) => setDesc(event.target.value)}
        placeholder="Description (optional)"
        maxLength={120}
        className="w-full text-sm px-3 py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
      />
      <ColorPalettePicker colors={PROJECT_COLORS} value={color} onChange={(next) => next && setColor(next)} />
      <div className="flex gap-2">
        <button type="button" onClick={submit} className="flex-1 btn-accent py-2 text-xs">Create program</button>
        <button type="button" onClick={onDone} className="btn-ghost py-2 text-xs px-3">Cancel</button>
      </div>
    </GlassCard>
  )
})

const Projects = memo(function Projects() {
  const programs = useProjectStore((state) => state.programs)
  const projects = useProjectStore((state) => state.projects)
  const tasks = useTaskStore((state) => state.tasks)
  const activeProjectId = useSettingsStore((state) => state.activeProjectId)
  const activeProgramId = useSettingsStore((state) => state.activeProgramId)
  const setActiveProgram = useSettingsStore((state) => state.setActiveProgram)
  const setActiveProject = useSettingsStore((state) => state.setActiveProject)
  const [addingProgram, setAddingProgram] = useState(false)

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const focusedProgramId = activeProgramId ?? activeProject?.programId ?? null
  const focusedProgram = focusedProgramId ? programs.find((program) => program.id === focusedProgramId) ?? null : null

  const visiblePrograms = focusedProgram ? [focusedProgram] : programs
  const visibleProjects = focusedProgram ? projects.filter((project) => project.programId === focusedProgram.id) : projects
  const unassignedProjects = focusedProgram ? [] : projects.filter((project) => !project.programId || !programs.find((program) => program.id === project.programId))
  const visibleTasks = focusedProgram ? tasks.filter((task) => taskMatchesProgram(task, focusedProgram.id, projects)) : tasks
  const totalTasks = visibleTasks.length
  const doneTasks = visibleTasks.filter((task) => task.status === 'done').length
  const topLevelProjectCount = focusedProgram ? visibleProjects.filter((project) => !project.parentId).length : projects.filter((project) => !project.parentId).length
  const headerTitle = focusedProgram ? focusedProgram.name : 'Programs'
  useEffect(() => {
    const selector = activeProjectId
      ? `[data-project-id="${activeProjectId}"]`
      : activeProgramId
        ? `[data-program-id="${activeProgramId}"]`
        : null

    if (!selector) return undefined

    const scrollToTarget = () => {
      const target = document.querySelector(selector)
      if (!target) return false
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return true
    }

    if (scrollToTarget()) return undefined
    const timeoutId = setTimeout(scrollToTarget, 80)
    return () => clearTimeout(timeoutId)
  }, [activeProjectId, activeProgramId, programs.length, projects.length])

  const clearFocus = () => {
    setActiveProject(null)
    setActiveProgram(null)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
      <div className="py-2 mb-3">
        <PageHero
          eyebrow="Programs"
          title={headerTitle}
          infoText={focusedProgram
            ? 'Review the selected program, manage its projects, and add program-level work directly where it belongs.'
            : 'Scan programs, open the one you want, and manage projects, milestones, and program tasks in one place.'}
          stats={[
            { label: 'Programs', value: programs.length, tone: 'accent' },
            { label: 'Projects', value: topLevelProjectCount, tone: 'default' },
            { label: 'Tasks', value: totalTasks, tone: 'default' },
            { label: 'Tasks done', value: `${doneTasks}/${totalTasks}`, tone: 'success' },
          ]}
          compact
          actions={
            <>
              {focusedProgram && (
                <button type="button" onClick={clearFocus} className="btn-ghost px-3 py-2 text-xs">
                  All programs
                </button>
              )}
              <button type="button" onClick={() => setAddingProgram(true)} className="btn-accent flex items-center gap-1.5 px-3 py-2 text-xs">
                <Plus size={13} /> New program
              </button>
            </>
          }
        >
        </PageHero>
      </div>

      {addingProgram && <NewProgramForm onDone={() => setAddingProgram(false)} />}

      {programs.length === 0 && unassignedProjects.length === 0 && !addingProgram ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.1)' }}>
            <FolderOpen size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No programs yet</p>
          <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Create a program first, then split the work into projects and only open tasks where you actually need to operate.
          </p>
          <button type="button" onClick={() => setAddingProgram(true)} className="btn-accent px-4 py-2 text-xs mt-1">
            Create first program
          </button>
        </div>
      ) : (
        <>
          {visiblePrograms.map((program) => (
            <ProgramSection key={program.id} program={program} projects={visibleProjects.filter((project) => project.programId === program.id)} />
          ))}
          {!focusedProgram && <UnassignedSection projects={unassignedProjects} />}
        </>
      )}
    </div>
  )
})

export default Projects
