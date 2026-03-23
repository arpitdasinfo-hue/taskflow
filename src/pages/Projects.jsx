import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
import useProjectStore, { PROJECT_COLORS, PROGRAM_SCOPE_CONFIG, PROGRAM_SCOPE_OPTIONS } from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'
import { sortTasksByStartDate } from '../lib/taskSort'
import { taskMatchesProgram } from '../lib/taskScope'
import useWorkspaceScopedData from '../hooks/useWorkspaceScopedData'
import {
  createCollapseVariants,
  createFadeUpVariants,
  createStaggerContainer,
  MOTION_SPRINGS,
} from '../lib/motion'

void motion

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

const ProgramSignalButton = memo(function ProgramSignalButton({ label, value, detail, tone = 'default', onClick = null }) {
  const palette = tone === 'danger'
    ? { background: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.22)', color: '#f87171' }
    : tone === 'warning'
      ? { background: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.22)', color: '#fbbf24' }
      : tone === 'success'
        ? { background: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.22)', color: '#34d399' }
        : { background: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick ?? undefined}
      className={`rounded-2xl px-3 py-2.5 text-left ${onClick ? 'transition-transform hover:-translate-y-0.5' : ''}`}
      style={{ background: palette.background, border: `1px solid ${palette.border}` }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="mt-2 text-xl font-bold leading-none" style={{ color: palette.color }}>
        {value}
      </div>
      <div className="mt-1 text-[10px] leading-5" style={{ color: 'var(--text-secondary)' }}>
        {detail}
      </div>
    </Component>
  )
})

const MilestonePreviewStrip = memo(function MilestonePreviewStrip({ label, milestones, accentColor, onToggle, expanded }) {
  const visibleMilestones = sortMilestones(milestones).slice(0, 2)
  const nextMilestone = visibleMilestones.find((milestone) => milestone.status !== 'completed') ?? visibleMilestones[0] ?? null

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
            {milestones.length > 0
              ? nextMilestone
                ? `Next ${formatShortDate(nextMilestone.dueDate) ?? 'milestone'} · ${nextMilestone.name}`
                : `${milestones.length} milestone${milestones.length === 1 ? '' : 's'} in this workstream`
              : 'No milestones pinned yet'}
          </p>
        </div>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[11px] px-2.5 py-1.5 rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: expanded ? accentColor : 'var(--text-secondary)', border: `1px solid ${expanded ? `${accentColor}22` : 'rgba(255,255,255,0.08)'}` }}
          >
            {expanded ? 'Hide' : milestones.length > 0 ? 'View all' : 'Add'}
          </button>
        )}
      </div>
        {visibleMilestones.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]"
              style={{ background: 'rgba(255,255,255,0.035)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span style={{ color: accentColor }}>◆</span>
              <span className="font-medium max-w-[154px] truncate">{milestone.name}</span>
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

const ProgramMilestonesOverview = memo(function ProgramMilestonesOverview({ milestones, projects, accentColor }) {
  const visibleMilestones = useMemo(() => sortMilestones(milestones).slice(0, 2), [milestones])
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )

  const totalCount = milestones.length
  const completedCount = milestones.filter((milestone) => milestone.status === 'completed').length
  const upcomingCount = milestones.filter((milestone) => milestone.status !== 'completed').length
  const hiddenCount = Math.max(0, totalCount - visibleMilestones.length)
  const nextMilestone = sortMilestones(milestones).find((milestone) => milestone.status !== 'completed') ?? null

  return (
    <div
      className="rounded-2xl px-3 py-2"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
              Milestones
            </p>
            <InfoTooltip text="Program milestones are rolled up from the milestones inside its projects and sub-projects." />
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            {totalCount > 0
              ? nextMilestone
                ? `Next ${formatShortDate(nextMilestone.dueDate) ?? 'milestone'} · ${nextMilestone.name}`
                : `${upcomingCount} upcoming, ${completedCount} completed`
              : 'No project milestones yet'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          <span>{totalCount} total</span>
          <span>{upcomingCount} upcoming</span>
          <span>{completedCount} done</span>
        </div>
      </div>

      {visibleMilestones.length > 0 ? (
        <div className="mt-2 space-y-1">
          {visibleMilestones.map((milestone) => {
            const project = projectMap.get(milestone.projectId)
            const isCompleted = milestone.status === 'completed'
            const dueDate = milestone.dueDate ? new Date(milestone.dueDate) : null
            const isOverdue = dueDate && dueDate < new Date() && !isCompleted
            const projectColor = project?.color || accentColor

            return (
              <div
                key={milestone.id}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5"
                style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.035)' }}
              >
                <span style={{ color: projectColor }} className="text-[11px] flex-shrink-0">◆</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] font-medium truncate"
                      style={{
                        color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                      }}
                    >
                      {milestone.name}
                    </span>
                    {project && (
                      <span className="text-[10px]" style={{ color: projectColor }}>{project.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {milestone.dueDate ? (
                    <span
                      className="text-[10px] px-2 py-1 rounded-full"
                      style={{
                        background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                        color: isOverdue ? '#fca5a5' : 'var(--text-secondary)',
                      }}
                    >
                      {formatShortDate(milestone.dueDate)}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                      No date
                    </span>
                  )}
                  <span
                    className="text-[10px] px-2 py-1 rounded-full"
                    style={isCompleted
                      ? { background: 'rgba(16,185,129,0.14)', color: '#34d399' }
                      : isOverdue
                        ? { background: 'rgba(239,68,68,0.14)', color: '#f87171' }
                          : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                  >
                    {isCompleted ? 'Done' : isOverdue ? 'Late' : 'Upcoming'}
                  </span>
                </div>
              </div>
            )
          })}
          {hiddenCount > 0 && (
            <div className="pt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              +{hiddenCount} more milestone{hiddenCount === 1 ? '' : 's'} in this program
            </div>
          )}
        </div>
      ) : null}
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
  const moveTask = useTaskStore((state) => state.moveTask)
  const updateProject = useProjectStore((state) => state.updateProject)
  const moveProject = useProjectStore((state) => state.moveProject)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const addProject = useProjectStore((state) => state.addProject)
  const { tasks, programs, milestones, projects: allProjects } = useWorkspaceScopedData()
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
  const parentProgram = useMemo(
    () => programs.find((program) => program.id === project.programId) ?? null,
    [programs, project.programId]
  )
  const canShareProject = !parentProgram || parentProgram.scope !== 'personal'
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
  const reduceMotion = useReducedMotion()
  const collapseVariants = useMemo(() => createCollapseVariants(reduceMotion), [reduceMotion])

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
    <motion.div
      layout={!reduceMotion}
      className="rounded-[24px] overflow-hidden"
      data-project-id={project.id}
      onDragOver={handleProjectDragOver}
      onDrop={handleProjectDrop}
      style={{
        border: depth > 0 ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.08)',
        background: depth > 0 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.018)',
        boxShadow: expanded ? `0 12px 30px ${project.color}0b` : 'none',
      }}
    >
      <div
        onClick={toggleExpanded}
        className="group cursor-pointer px-3.5 py-2.5"
        style={{ background: expanded ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.015)', borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
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
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
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
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {inProgress} active
            </span>
          </div>

          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <ActionMenu
              iconOnly
              items={[
                { label: showMovePicker ? 'Hide move picker' : 'Move to program…', onClick: () => setShowMovePicker((current) => !current) },
                ...(canShareProject ? [{ label: showShare ? 'Hide share link' : 'Share project', onClick: () => setShowShare(true) }] : []),
                { label: deleteArmed ? 'Cancel delete' : 'Delete project', onClick: () => setDeleteArmed((current) => !current), tone: 'danger' },
              ]}
            />
          </div>
        </div>
      </div>

      {showMovePicker && (
          <motion.div className="px-3.5 pb-2" variants={collapseVariants} initial="initial" animate="animate" exit="exit">
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
        </motion.div>
      )}

      {deleteArmed && (
        <motion.div className="px-3.5 pb-3" variants={collapseVariants} initial="initial" animate="animate" exit="exit">
          <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}>
            <span className="text-[11px]" style={{ color: '#fca5a5' }}>Delete this project and its nested work?</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDeleteArmed(false)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.08)' }}>Cancel</button>
              <button type="button" onClick={() => deleteProject(project.id)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: '#fff', background: '#dc2626' }}>Delete</button>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          variants={collapseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="overflow-hidden"
        >
        <div className="px-3.5 pb-3 pt-2 space-y-2" style={{ background: 'rgba(255,255,255,0.018)' }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>{done}</strong> of {total} done</span>
            <span><strong style={{ color: 'var(--text-primary)' }}>{inProgress}</strong> active</span>
            <span><strong style={{ color: health.color }}>{health.label}</strong></span>
            <span>{windowLabel}</span>
            {unscheduled > 0 && <span><strong style={{ color: '#fca5a5' }}>{unscheduled}</strong> need dates</span>}
          </div>

          <MilestonePreviewStrip
            label="Milestones"
            milestones={projectMilestones}
            accentColor={project.color}
            expanded={showMilestones}
            onToggle={() => setShowMilestones((current) => !current)}
          />

          <AnimatePresence initial={false}>
          {showMilestones && (
            <motion.div
              variants={collapseVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="overflow-hidden rounded-2xl px-3 py-3"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <MilestonePanel projectId={project.id} projectColor={project.color} />
            </motion.div>
          )}
          </AnimatePresence>

          {childProjects.length > 0 && (
            <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Sub-projects</p>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{childProjects.length}</span>
              </div>
              <div className="space-y-2">
                {childProjects.map((childProject) => (
                  <ProjectPanel key={childProject.id} project={childProject} depth={depth + 1} />
                ))}
              </div>
            </div>
          )}

          {depth === 0 && (
            <div className="rounded-2xl px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(255,255,255,0.04)' }}>
              {addingSub ? (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Add sub-project</p>
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
                  className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-xl transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Plus size={12} /> Add sub-project
                </button>
              )}
            </div>
          )}

          <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Work items</p>
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
                <div className="rounded-2xl px-3 py-3 text-center text-[11px]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  No direct tasks yet.
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
        </motion.div>
      )}
      </AnimatePresence>

      {canShareProject && showShare && (
        <ShareModal resourceType="project" resourceId={project.id} resourceName={project.name} onClose={() => setShowShare(false)} />
      )}
    </motion.div>
  )
})

const ProgramSection = memo(function ProgramSection({ program, projects, expanded, onToggle }) {
  const updateProgram = useProjectStore((state) => state.updateProgram)
  const moveProgram = useProjectStore((state) => state.moveProgram)
  const deleteProgram = useProjectStore((state) => state.deleteProgram)
  const addProject = useProjectStore((state) => state.addProject)
  const moveProject = useProjectStore((state) => state.moveProject)
  const setPage = useSettingsStore((state) => state.setPage)
  const setActiveProgram = useSettingsStore((state) => state.setActiveProgram)
  const setActiveProject = useSettingsStore((state) => state.setActiveProject)
  const setTaskDrilldown = useSettingsStore((state) => state.setTaskDrilldown)
  const clearTaskDrilldown = useSettingsStore((state) => state.clearTaskDrilldown)
  const clearAnalyticsInsight = useSettingsStore((state) => state.clearAnalyticsInsight)
  const setGanttConfig = useSettingsStore((state) => state.setGanttConfig)
  const { milestones, tasks } = useWorkspaceScopedData()
  const [addingProject, setAddingProject] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjColor, setNewProjColor] = useState(PROJECT_COLORS[0])
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)

  const topLevelProjects = projects.filter((project) => !project.parentId)
  const projectMilestones = useMemo(() => sortMilestones(milestones.filter((milestone) => projects.some((project) => project.id === milestone.projectId))), [milestones, projects])

  const programDirectTasks = useMemo(() => sortTasksByStartDate(tasks.filter((task) => !task.projectId && taskMatchesProgram(task, program.id, projects))), [tasks, program.id, projects])
  const allTasks = useMemo(() => tasks.filter((task) => taskMatchesProgram(task, program.id, projects)), [tasks, program.id, projects])

  const totalTasks = allTasks.length
  const doneTasks = allTasks.filter((task) => task.status === 'done').length
  const blocked = allTasks.filter((task) => task.status === 'blocked').length
  const now = new Date()
  const overdue = allTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'done').length
  const unscheduled = allTasks.filter((task) => !task.startDate && !task.dueDate).length
  const health = getHealthMeta({ total: totalTasks, done: doneTasks, blocked, overdue, unscheduled })
  const scopeConfig = PROGRAM_SCOPE_CONFIG[program.scope ?? 'professional'] ?? PROGRAM_SCOPE_CONFIG.professional
  const canShareProgram = (program.scope ?? 'professional') !== 'personal'
  const scheduleWindow = buildScheduleWindow(program, projects, allTasks, projectMilestones)
  const windowLabel = formatWindowLabel(scheduleWindow.startDate, scheduleWindow.dueDate)
  const nextMilestone = projectMilestones.find((milestone) => milestone.status !== 'completed') ?? projectMilestones[0] ?? null
  const reduceMotion = useReducedMotion()
  const collapseVariants = useMemo(() => createCollapseVariants(reduceMotion), [reduceMotion])

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

  const openProgramTasks = (drilldown = null) => {
    clearAnalyticsInsight()
    setActiveProject(null)
    setActiveProgram(program.id)
    if (drilldown) setTaskDrilldown(drilldown)
    else clearTaskDrilldown()
    setPage('tasks')
  }

  const openProgramTimeline = (riskOnly = false) => {
    clearAnalyticsInsight()
    clearTaskDrilldown()
    setActiveProject(null)
    setActiveProgram(program.id)
    setGanttConfig({
      viewMode: riskOnly ? 'risk' : 'roadmap',
      showDependencies: true,
      onlyDelayed: riskOnly,
      onlyCritical: false,
      onlyDependencyRisk: riskOnly,
      filteredProgramIds: [program.id],
      filteredProjectIds: [],
      filteredSubProjectIds: [],
      expandedProjectIds: topLevelProjects.map((projectItem) => projectItem.id),
    })
    setPage('timeline')
  }

  return (
    <motion.div className="mb-4 rounded-[26px] overflow-hidden" layout={!reduceMotion} data-program-id={program.id} onDragOver={handleProgramDragOver} onDrop={handleProgramDrop} style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="px-4 md:px-5 py-3" style={{ background: expanded ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)', borderBottom: expanded ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <div className="flex items-start gap-3">
          <button type="button" onClick={onToggle} style={{ color: 'var(--text-secondary)' }}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
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
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ color: scopeConfig.color }}>{scopeConfig.label}</span>
              <span>{windowLabel}</span>
              <span>{topLevelProjects.length} project{topLevelProjects.length === 1 ? '' : 's'}</span>
              <span>{totalTasks} task{totalTasks === 1 ? '' : 's'}</span>
              {projectMilestones.length > 0 && <span>{projectMilestones.length} milestone{projectMilestones.length === 1 ? '' : 's'}</span>}
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <ProgramSignalButton
                label="Open work"
                value={totalTasks - doneTasks}
                detail={totalTasks > 0 ? `${doneTasks} done out of ${totalTasks}` : 'No tracked work yet'}
                tone={(totalTasks - doneTasks) > 0 ? 'default' : 'success'}
                onClick={() => openProgramTasks('open')}
              />
              <ProgramSignalButton
                label="Blocked"
                value={blocked}
                detail={blocked > 0 ? 'Needs unblock' : 'No blocked work'}
                tone={blocked > 0 ? 'warning' : 'success'}
                onClick={() => openProgramTasks(blocked > 0 ? 'blocked' : 'open')}
              />
              <ProgramSignalButton
                label="Next milestone"
                value={nextMilestone ? formatShortDate(nextMilestone.dueDate) ?? 'Set date' : 'None'}
                detail={nextMilestone ? nextMilestone.name : 'Add the first milestone'}
                tone={nextMilestone ? 'default' : 'warning'}
                onClick={() => openProgramTimeline(false)}
              />
              <ProgramSignalButton
                label="Due risk"
                value={overdue}
                detail={overdue > 0 ? 'Overdue tasks already slipped' : 'No overdue tasks'}
                tone={overdue > 0 ? 'danger' : 'success'}
                onClick={() => openProgramTasks(overdue > 0 ? 'overdue' : 'open')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => openProgramTasks('open')} className="text-[11px] px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
              Open tasks
            </button>
            <button type="button" onClick={() => openProgramTimeline(overdue > 0 || blocked > 0)} className="text-[11px] px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              Timeline
            </button>
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
                ...(canShareProgram ? [{ label: 'Share program', onClick: () => setShowShare(true) }] : []),
                { label: deleteArmed ? 'Cancel delete' : 'Delete program', onClick: () => setDeleteArmed((current) => !current), tone: 'danger' },
              ]}
            />
          </div>
        </div>
      </div>

      {deleteArmed && (
        <motion.div className="px-4 md:px-5 py-3" variants={collapseVariants} initial="initial" animate="animate" exit="exit">
          <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}>
            <span className="text-[11px]" style={{ color: '#fca5a5' }}>Delete this program and unassign its projects?</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDeleteArmed(false)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.08)' }}>Cancel</button>
              <button type="button" onClick={() => deleteProgram(program.id)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: '#fff', background: '#dc2626' }}>Delete</button>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          variants={collapseVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="overflow-hidden"
        >
        <div className="px-4 md:px-5 pb-3 pt-2.5 space-y-2.5">
          <ProgramMilestonesOverview milestones={projectMilestones} projects={projects} accentColor={program.color} />

          {addingProject && (
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex flex-col gap-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>New project</p>
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

          {programDirectTasks.length > 0 && (
            <div className="rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Program tasks</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Work tracked directly at the program level, outside a project.
                  </p>
                </div>
                <button type="button" onClick={() => openProgramTasks('open')} className="text-[11px] px-2.5 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                  Open in all tasks
                </button>
              </div>
              <div className="space-y-1">
                {programDirectTasks.slice(0, 4).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
              {programDirectTasks.length > 4 && (
                <div className="pt-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  +{programDirectTasks.length - 4} more program task{programDirectTasks.length - 4 === 1 ? '' : 's'}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Projects</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Expand a project to manage sub-projects, dates, and direct tasks.
                </p>
              </div>
            </div>
          <div className="space-y-3">
            {topLevelProjects.length === 0 && !addingProject ? (
              <div className="rounded-2xl px-4 py-3 text-center text-[11px]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                {programDirectTasks.length > 0
                  ? 'Program-level tasks exist, but there are no projects yet. Add the first project when you want to break the work down.'
                  : 'No projects yet. Add the first project for this program.'}
              </div>
            ) : (
              topLevelProjects.map((projectItem) => (
                <ProjectPanel key={projectItem.id} project={projectItem} />
              ))
            )}
          </div>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {canShareProgram && showShare && <ShareModal resourceType="program" resourceId={program.id} resourceName={program.name} onClose={() => setShowShare(false)} />}
    </motion.div>
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
  const workspaceViewScope = useSettingsStore((state) => state.workspaceViewScope)
  const [scope, setScope] = useState(workspaceViewScope)
  const addProgram = useProjectStore((state) => state.addProgram)

  const submit = () => {
    if (!name.trim()) return
    addProgram({ name: name.trim(), color, description: desc.trim(), scope })
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
      <div className="grid grid-cols-2 gap-2">
        {PROGRAM_SCOPE_OPTIONS.map((option) => {
          const active = scope === option.id
          const palette = PROGRAM_SCOPE_CONFIG[option.id]
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setScope(option.id)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={active
                ? { background: palette.background, color: palette.color, border: `1px solid ${palette.color}44` }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <ColorPalettePicker colors={PROJECT_COLORS} value={color} onChange={(next) => next && setColor(next)} />
      <div className="flex gap-2">
        <button type="button" onClick={submit} className="flex-1 btn-accent py-2 text-xs">Create program</button>
        <button type="button" onClick={onDone} className="btn-ghost py-2 text-xs px-3">Cancel</button>
      </div>
    </GlassCard>
  )
})

const Projects = memo(function Projects() {
  const { programs, projects, milestones, tasks } = useWorkspaceScopedData()
  const activeProjectId = useSettingsStore((state) => state.activeProjectId)
  const activeProgramId = useSettingsStore((state) => state.activeProgramId)
  const setActiveProgram = useSettingsStore((state) => state.setActiveProgram)
  const setActiveProject = useSettingsStore((state) => state.setActiveProject)
  const [addingProgram, setAddingProgram] = useState(false)

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const focusedProgramId = activeProgramId ?? activeProject?.programId ?? null
  const focusedProgram = focusedProgramId ? programs.find((program) => program.id === focusedProgramId) ?? null : null

  const visiblePrograms = useMemo(() => (focusedProgram ? [focusedProgram] : programs), [focusedProgram, programs])
  const visibleProjects = useMemo(
    () => (focusedProgram ? projects.filter((project) => project.programId === focusedProgram.id) : projects),
    [focusedProgram, projects]
  )
  const unassignedProjects = useMemo(
    () => (focusedProgram ? [] : projects.filter((project) => !project.programId || !programs.find((program) => program.id === project.programId))),
    [focusedProgram, programs, projects]
  )
  const visibleTasks = useMemo(
    () => (focusedProgram ? tasks.filter((task) => taskMatchesProgram(task, focusedProgram.id, projects)) : tasks),
    [focusedProgram, projects, tasks]
  )
  const visibleMilestoneCount = useMemo(
    () => {
      if (focusedProgram) {
        const visibleProjectIds = new Set(visibleProjects.map((project) => project.id))
        return milestones.filter((milestone) => visibleProjectIds.has(milestone.projectId)).length
      }
      return milestones.length
    },
    [focusedProgram, milestones, visibleProjects]
  )
  const totalTasks = visibleTasks.length
  const doneTasks = visibleTasks.filter((task) => task.status === 'done').length
  const openTasks = totalTasks - doneTasks
  const topLevelProjectCount = focusedProgram ? visibleProjects.filter((project) => !project.parentId).length : projects.filter((project) => !project.parentId).length
  const [openProgramId, setOpenProgramId] = useState(null)
  const reduceMotion = useReducedMotion()
  const sectionVariants = useMemo(() => createFadeUpVariants(reduceMotion), [reduceMotion])
  const staggerVariants = useMemo(() => createStaggerContainer(reduceMotion, 0.045, 0.03), [reduceMotion])

  useEffect(() => {
    if (focusedProgramId) {
      setOpenProgramId(focusedProgramId)
      return
    }
    if (activeProject?.programId) {
      setOpenProgramId(activeProject.programId)
      return
    }
    setOpenProgramId((current) => {
      if (current && visiblePrograms.some((program) => program.id === current)) return current
      return visiblePrograms[0]?.id ?? null
    })
  }, [focusedProgramId, activeProject?.programId, visiblePrograms])

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
      <motion.div variants={staggerVariants} initial="initial" animate="animate" className="py-2 mb-3">
      <motion.div variants={sectionVariants}>
        <PageHero
          eyebrow="Programs"
          title="Programs"
          description={focusedProgram
            ? `${focusedProgram.name} is in focus. Manage structure here, then jump into tasks or timeline when you need to operate.`
            : 'Keep structure, milestones, and workstream actions in one place without turning this page into a second dashboard.'}
          infoText="Dashboard is the review surface. Programs is where you organize the work, keep milestones healthy, and jump into the next action."
          minimal
          stats={[
            { label: 'Programs', value: programs.length, tone: 'accent' },
            { label: 'Projects', value: topLevelProjectCount },
            { label: 'Milestones', value: visibleMilestoneCount },
            { label: 'Open work', value: openTasks, tone: openTasks > 0 ? 'success' : 'default' },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              {programs.length > 0 && (
                <select
                  value={focusedProgram?.id ?? ''}
                  onChange={(event) => {
                    const nextProgramId = event.target.value || null
                    setActiveProject(null)
                    setActiveProgram(nextProgramId)
                  }}
                  className="text-xs px-3 py-2 rounded-xl min-w-[220px]"
                  style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                >
                  <option value="">All programs</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              )}
              {focusedProgram && (
                <button type="button" onClick={clearFocus} className="btn-ghost px-3 py-2 text-xs">
                  Clear focus
                </button>
              )}
              <button type="button" onClick={() => setAddingProgram(true)} className="btn-accent flex items-center gap-1.5 px-3.5 py-2 text-xs">
                <Plus size={13} /> New program
              </button>
            </div>
          )}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {addingProgram && (
          <motion.div variants={sectionVariants} initial="initial" animate="animate" exit="exit">
            <NewProgramForm onDone={() => setAddingProgram(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {programs.length === 0 && unassignedProjects.length === 0 && !addingProgram ? (
        <motion.div variants={sectionVariants} className="flex flex-col items-center justify-center py-20 gap-3">
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
        </motion.div>
      ) : (
        <motion.div variants={staggerVariants} className="space-y-0">
          {visiblePrograms.map((program) => (
            <motion.div key={program.id} variants={sectionVariants}>
            <ProgramSection
              key={program.id}
              program={program}
              projects={visibleProjects.filter((project) => project.programId === program.id)}
              expanded={focusedProgram ? true : openProgramId === program.id}
              onToggle={() => {
                if (focusedProgram) return
                setOpenProgramId((current) => (current === program.id ? null : program.id))
              }}
            />
            </motion.div>
          ))}
          {!focusedProgram && (
            <motion.div variants={sectionVariants}>
              <UnassignedSection projects={unassignedProjects} />
            </motion.div>
          )}
        </motion.div>
      )}
      </motion.div>
    </div>
  )
})

export default Projects
