import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import {
  CalendarClock,
  CircleDot,
  ListChecks,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'
import { differenceInCalendarDays, format } from 'date-fns'
import Header from '../components/layout/Header'
import EmptyState from '../components/common/EmptyState'
import GlassCard from '../components/common/GlassCard'
import InfoTooltip from '../components/common/InfoTooltip'
import CommitTaskMenu from '../components/planning/CommitTaskMenu'
import useSettingsStore from '../store/useSettingsStore'
import useTaskStore from '../store/useTaskStore'
import usePlanningStore from '../store/usePlanningStore'
import useWorkspaceScopedData from '../hooks/useWorkspaceScopedData'
import {
  PLANNING_BUCKET_COLORS,
  PLANNING_BUCKET_LABELS,
  getPeriodBounds,
  getPreviousPeriodBounds,
  groupCommitmentsByBucket,
} from '../lib/planning'

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
]

const PERIOD_META = {
  day: {
    title: 'Today Focus',
    description: 'Only the work you intend to actively move today.',
    icon: Target,
    emptyTitle: 'Nothing committed for today',
    emptyDescription: 'Pull work from the candidate pool or from your week plan.',
    buckets: ['focus'],
  },
  week: {
    title: 'This Week',
    description: 'Commit what you will finish this week, then sequence it clearly.',
    icon: ListChecks,
    emptyTitle: 'No weekly plan yet',
    emptyDescription: 'Commit the tasks you want to carry this week.',
    buckets: ['must', 'should', 'stretch'],
  },
  month: {
    title: 'This Month',
    description: 'Keep the bigger monthly load visible without bloating Today Focus.',
    icon: CalendarClock,
    emptyTitle: 'No monthly commitments yet',
    emptyDescription: 'Set up the month view once, then refine it weekly.',
    buckets: ['must', 'should', 'stretch'],
  },
}

const TARGET_ORDER = ['day', 'week', 'month']
const TARGET_LABELS = { day: 'Today', week: 'Week', month: 'Month' }
const PRIORITY_SCORE = { critical: 90, high: 60, medium: 30, low: 10 }

const resolveTaskContext = (task, projectById, programById) => {
  const project = task.projectId ? projectById.get(task.projectId) ?? null : null
  const parent = project?.parentId ? projectById.get(project.parentId) ?? null : null
  const programId = task.programId ?? project?.programId ?? null
  const program = programId ? programById.get(programId) ?? null : null

  if (parent && project) {
    return {
      color: project.color ?? parent.color ?? program?.color ?? '#94a3b8',
      label: program ? `${program.name} · ${parent.name} / ${project.name}` : `${parent.name} / ${project.name}`,
    }
  }

  if (project) {
    return {
      color: project.color ?? program?.color ?? '#94a3b8',
      label: program ? `${program.name} · ${project.name}` : project.name,
    }
  }

  if (program) {
    return {
      color: program.color ?? '#94a3b8',
      label: `${program.name} · Program task`,
    }
  }

  return {
    color: '#94a3b8',
    label: 'Standalone task',
  }
}

const getTaskUrgencyText = (task) => {
  if (!task?.dueDate) return 'No due date'

  const dueDate = new Date(task.dueDate)
  const days = differenceInCalendarDays(dueDate, new Date())
  if (days < 0) return `Overdue by ${Math.abs(days)}d`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due ${format(dueDate, 'MMM d')}`
}

const scoreTaskForPlanning = (task) => {
  let score = PRIORITY_SCORE[task.priority] ?? 0

  if (task.status === 'in-progress') score += 35
  if (task.status === 'review') score += 20
  if (task.status === 'blocked') score -= 25

  if (task.dueDate) {
    const days = differenceInCalendarDays(new Date(task.dueDate), new Date())
    if (days < 0) score += 80
    else if (days === 0) score += 70
    else if (days <= 3) score += 55 - (days * 6)
    else if (days <= 7) score += 30 - (days * 2)
  } else {
    score -= 5
  }

  return score
}

const SummaryCard = memo(function SummaryCard({ label, value, hint, accent }) {
  return (
    <GlassCard padding="px-4 py-4" className="min-h-[104px]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-bold" style={{ color: accent ?? 'var(--text-primary)' }}>
          {value}
        </span>
        {hint ? (
          <span className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            {hint}
          </span>
        ) : null}
      </div>
    </GlassCard>
  )
})

const InlineInfoTitle = memo(function InlineInfoTitle({ title, info, badge = null, className = '' }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </span>
      <InfoTooltip text={info} widthClassName="w-64" />
      {badge}
    </div>
  )
})

const PlanningTaskRow = memo(function PlanningTaskRow({
  task,
  context,
  commitment,
  onOpen,
  onRemove,
  onStatusChange,
  isCandidate = false,
  targetState = null,
  onAssign = null,
}) {
  const isDone = task.status === 'done'
  const isBlocked = task.status === 'blocked'

  return (
    <div
      className="rounded-2xl px-3 py-3"
      style={{
        background: isDone ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isBlocked ? 'rgba(239,68,68,0.26)' : 'rgba(255,255,255,0.08)'}`,
        opacity: isDone ? 0.75 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ background: context.color, boxShadow: `0 0 10px ${context.color}55` }}
        />

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onOpen}
            className="text-left text-sm font-semibold truncate w-full hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}
          >
            {task.title}
          </button>
          <div className="mt-1 text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {context.label}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="text-[10px] px-2 py-1 rounded-full font-medium"
              style={{
                background: `${context.color}18`,
                color: context.color,
              }}
            >
              {getTaskUrgencyText(task)}
            </span>
            <span
              className="text-[10px] px-2 py-1 rounded-full font-medium capitalize"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-secondary)',
              }}
            >
              {task.priority}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isCandidate && <CommitTaskMenu taskId={task.id} compact />}
          {!isCandidate && commitment && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRemove(commitment.id)
              }}
              className="text-[11px] px-2 py-1 rounded-xl transition-colors"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.18)',
                color: '#fca5a5',
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={task.status}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onStatusChange(task.id, event.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-xl min-w-[124px]"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-primary)',
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {isCandidate && targetState && onAssign ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {TARGET_ORDER.map((target) => {
              const active = targetState[target]
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => onAssign(task.id, target)}
                  className="text-[11px] px-2.5 py-1.5 rounded-xl transition-colors"
                  style={active
                    ? { background: 'rgba(var(--accent-rgb),0.14)', border: '1px solid rgba(var(--accent-rgb),0.22)', color: 'var(--accent)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }
                  }
                >
                  {TARGET_LABELS[target]}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
})

const PlanningBucket = memo(function PlanningBucket({
  droppableId,
  title,
  hint,
  color,
  entries,
  onOpenTask,
  onRemoveCommitment,
  onStatusChange,
  emptyTitle,
  emptyDescription,
}) {
  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <GlassCard
          padding="p-4"
          className="h-full"
          style={{
            background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.08)' : undefined,
            borderColor: snapshot.isDraggingOver ? `${color}60` : undefined,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color }}>
                {title}
              </div>
              <InfoTooltip text={hint} widthClassName="w-56" />
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full"
              style={{ background: `${color}18`, color }}
            >
              {entries.length}
            </span>
          </div>

          <div ref={provided.innerRef} {...provided.droppableProps} className="mt-4 space-y-3 min-h-[96px]">
            {entries.length === 0 ? (
              <div
                className="rounded-2xl px-3 py-4 text-center"
                style={{ border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}
              >
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {emptyTitle}
                </div>
                <div className="mt-1 text-xs">
                  {emptyDescription}
                </div>
              </div>
            ) : null}

            {entries.map((entry, index) => (
              <Draggable key={entry.commitment.id} draggableId={entry.commitment.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={dragSnapshot.isDragging ? 'is-dragging' : ''}
                    style={dragProvided.draggableProps.style}
                  >
                    <PlanningTaskRow
                      task={entry.task}
                      context={entry.context}
                      commitment={entry.commitment}
                      onOpen={() => onOpenTask(entry.task.id)}
                      onRemove={onRemoveCommitment}
                      onStatusChange={onStatusChange}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        </GlassCard>
      )}
    </Droppable>
  )
})

const Today = memo(function Today() {
  const [candidateQuery, setCandidateQuery] = useState('')
  const [captureTitle, setCaptureTitle] = useState('')
  const [captureTarget, setCaptureTarget] = useState('day')
  const [captureStartDate, setCaptureStartDate] = useState('')
  const [captureDueDate, setCaptureDueDate] = useState('')

  const tasks = useTaskStore((state) => state.tasks)
  const addTask = useTaskStore((state) => state.addTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const commitments = usePlanningStore((state) => state.commitments)
  const commitTask = usePlanningStore((state) => state.commitTask)
  const removeCommitment = usePlanningStore((state) => state.removeCommitment)
  const setCommitmentLayout = usePlanningStore((state) => state.setCommitmentLayout)
  const carryForwardPeriod = usePlanningStore((state) => state.carryForwardPeriod)
  const syncScheduledCommitments = usePlanningStore((state) => state.syncScheduledCommitments)
  const selectTask = useSettingsStore((state) => state.selectTask)
  const { programs, projects, tasks: scopedTasks, programById, projectById } = useWorkspaceScopedData()

  const todayBounds = getPeriodBounds('day')
  const weekBounds = getPeriodBounds('week')
  const monthBounds = getPeriodBounds('month')
  const previousWeekBounds = getPreviousPeriodBounds('week')
  const previousMonthBounds = getPreviousPeriodBounds('month')
  const taskById = useMemo(() => new Map(scopedTasks.filter((task) => !task.deletedAt).map((task) => [task.id, task])), [scopedTasks])

  useEffect(() => {
    syncScheduledCommitments()
  }, [syncScheduledCommitments, tasks, weekBounds.startKey, monthBounds.startKey])

  const periodMatchedCommitments = useMemo(() => {
    const currentPeriods = {
      day: todayBounds.startKey,
      week: weekBounds.startKey,
      month: monthBounds.startKey,
    }

    return commitments.filter((commitment) => {
      const task = taskById.get(commitment.taskId)
      return task && currentPeriods[commitment.periodType] === commitment.periodStart
    })
  }, [commitments, taskById, todayBounds.startKey, weekBounds.startKey, monthBounds.startKey])

  const currentCommitments = useMemo(
    () => periodMatchedCommitments.filter((commitment) => {
      const task = taskById.get(commitment.taskId)
      return task && task.status !== 'done'
    }),
    [periodMatchedCommitments, taskById]
  )

  const commitmentEntries = useMemo(() => {
    const contextByTask = new Map()

    return currentCommitments.map((commitment) => {
      const task = taskById.get(commitment.taskId)
      if (!task) return null

      let context = contextByTask.get(task.id)
      if (!context) {
        context = resolveTaskContext(task, projectById, programById)
        contextByTask.set(task.id, context)
      }

      return {
        commitment,
        task,
        context,
      }
    }).filter(Boolean)
  }, [currentCommitments, taskById, projectById, programById])

  const entriesByDroppable = useMemo(() => {
    const grouped = {
      day: groupCommitmentsByBucket(commitmentEntries.filter((entry) => entry.commitment.periodType === 'day').map((entry) => entry.commitment), 'day'),
      week: groupCommitmentsByBucket(commitmentEntries.filter((entry) => entry.commitment.periodType === 'week').map((entry) => entry.commitment), 'week'),
      month: groupCommitmentsByBucket(commitmentEntries.filter((entry) => entry.commitment.periodType === 'month').map((entry) => entry.commitment), 'month'),
    }

    const byId = new Map(commitmentEntries.map((entry) => [entry.commitment.id, entry]))

    const toEntries = (periodType, bucket) =>
      (grouped[periodType][bucket] ?? []).map((commitment) => byId.get(commitment.id)).filter(Boolean)

    return {
      'day:focus': toEntries('day', 'focus'),
      'week:must': toEntries('week', 'must'),
      'week:should': toEntries('week', 'should'),
      'week:stretch': toEntries('week', 'stretch'),
      'month:must': toEntries('month', 'must'),
      'month:should': toEntries('month', 'should'),
      'month:stretch': toEntries('month', 'stretch'),
    }
  }, [commitmentEntries])

  const currentTargetState = useMemo(() => {
    const state = new Map()

    currentCommitments.forEach((commitment) => {
      if (!state.has(commitment.taskId)) {
        state.set(commitment.taskId, { day: false, week: false, month: false })
      }
      state.get(commitment.taskId)[commitment.periodType] = true
    })

    return state
  }, [currentCommitments])

  const candidateTasks = useMemo(() => {
    const normalizedQuery = candidateQuery.trim().toLowerCase()
    const activeTasks = scopedTasks.filter((task) => !task.deletedAt && task.status !== 'done')

    const filtered = activeTasks.filter((task) => {
      if (!normalizedQuery) return true
      const context = resolveTaskContext(task, projectById, programById)
      const haystack = [
        task.title,
        task.description,
        ...(task.tags ?? []),
        context.label,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })

    return filtered
      .sort((left, right) => scoreTaskForPlanning(right) - scoreTaskForPlanning(left))
      .slice(0, normalizedQuery ? 16 : 10)
      .map((task) => ({
        task,
        context: resolveTaskContext(task, projectById, programById),
      }))
  }, [candidateQuery, scopedTasks, projectById, programById])

  const summary = useMemo(() => {
    const dayCount = entriesByDroppable['day:focus'].length
    const weekEntries = [
      ...entriesByDroppable['week:must'],
      ...entriesByDroppable['week:should'],
      ...entriesByDroppable['week:stretch'],
    ]
    const monthEntries = [
      ...entriesByDroppable['month:must'],
      ...entriesByDroppable['month:should'],
      ...entriesByDroppable['month:stretch'],
    ]

    return {
      focus: dayCount,
      weekCommitted: weekEntries.length,
      weekDone: periodMatchedCommitments.filter((commitment) => {
        if (commitment.periodType !== 'week') return false
        const task = taskById.get(commitment.taskId)
        return task?.status === 'done'
      }).length,
      monthCommitted: monthEntries.length,
      overdueOpen: scopedTasks.filter((task) => !task.deletedAt && task.status !== 'done' && task.dueDate && differenceInCalendarDays(new Date(task.dueDate), new Date()) < 0).length,
    }
  }, [entriesByDroppable, periodMatchedCommitments, taskById, scopedTasks])

  const carryForwardState = useMemo(() => {
    const currentWeekTasks = new Set(
      currentCommitments
        .filter((commitment) => commitment.periodType === 'week')
        .map((commitment) => commitment.taskId)
    )
    const currentMonthTasks = new Set(
      currentCommitments
        .filter((commitment) => commitment.periodType === 'month')
        .map((commitment) => commitment.taskId)
    )

    const weekCarryCount = commitments.filter((commitment) => {
      if (commitment.periodType !== 'week' || commitment.periodStart !== previousWeekBounds.startKey) return false
      const task = taskById.get(commitment.taskId)
      return task && task.status !== 'done' && !currentWeekTasks.has(commitment.taskId)
    }).length

    const monthCarryCount = commitments.filter((commitment) => {
      if (commitment.periodType !== 'month' || commitment.periodStart !== previousMonthBounds.startKey) return false
      const task = taskById.get(commitment.taskId)
      return task && task.status !== 'done' && !currentMonthTasks.has(commitment.taskId)
    }).length

    return { weekCarryCount, monthCarryCount }
  }, [commitments, currentCommitments, previousMonthBounds.startKey, previousWeekBounds.startKey, taskById])

  const handleAssignTask = useCallback((taskId, periodType) => {
    const bucket = periodType === 'day' ? 'focus' : 'must'
    commitTask({ taskId, periodType, bucket })
  }, [commitTask])

  const handleCaptureTask = useCallback(() => {
    const title = captureTitle.trim()
    if (!title) return

    const created = addTask({
      title,
      startDate: captureStartDate ? new Date(captureStartDate).toISOString() : null,
      dueDate: captureDueDate ? new Date(captureDueDate).toISOString() : null,
    })
    if (created?.id) {
      handleAssignTask(created.id, captureTarget)
    }

    setCaptureTitle('')
    setCaptureTarget('day')
    setCaptureStartDate('')
    setCaptureDueDate('')
  }, [addTask, captureDueDate, captureStartDate, captureTarget, captureTitle, handleAssignTask])

  const handleStatusChange = useCallback((taskId, status) => {
    updateTask(taskId, { status })
  }, [updateTask])

  const handleOpenTask = useCallback((taskId) => {
    selectTask(taskId)
  }, [selectTask])

  const handleCarryForward = useCallback((periodType) => {
    if (periodType === 'week') {
      carryForwardPeriod({
        periodType: 'week',
        fromPeriodStart: previousWeekBounds.startKey,
        toPeriodStart: weekBounds.startKey,
      })
      return
    }

    carryForwardPeriod({
      periodType: 'month',
      fromPeriodStart: previousMonthBounds.startKey,
      toPeriodStart: monthBounds.startKey,
    })
  }, [carryForwardPeriod, monthBounds.startKey, previousMonthBounds.startKey, previousWeekBounds.startKey, weekBounds.startKey])

  const onDragEnd = useCallback((result) => {
    if (!result.destination) return

    const sourceId = result.source.droppableId
    const destinationId = result.destination.droppableId

    if (sourceId === destinationId && result.source.index === result.destination.index) return

    const [sourcePeriodType, sourceBucket] = sourceId.split(':')
    const [destinationPeriodType, destinationBucket] = destinationId.split(':')
    if (sourcePeriodType !== destinationPeriodType) return

    const boundsByPeriod = {
      day: todayBounds,
      week: weekBounds,
      month: monthBounds,
    }

    const sourceItems = Array.from(entriesByDroppable[sourceId] ?? [])
    const destinationItems = sourceId === destinationId
      ? sourceItems
      : Array.from(entriesByDroppable[destinationId] ?? [])

    const [moved] = sourceItems.splice(result.source.index, 1)
    if (!moved) return

    destinationItems.splice(result.destination.index, 0, moved)

    if (sourceId === destinationId) {
      setCommitmentLayout(
        destinationItems.map((entry, index) => ({
          id: entry.commitment.id,
          sortOrder: index,
          bucket: destinationBucket,
          periodType: destinationPeriodType,
          periodStart: boundsByPeriod[destinationPeriodType].startKey,
          periodEnd: boundsByPeriod[destinationPeriodType].endKey,
        }))
      )
      return
    }

    const updates = [
      ...sourceItems.map((entry, index) => ({
        id: entry.commitment.id,
        sortOrder: index,
        bucket: sourceBucket,
        periodType: sourcePeriodType,
        periodStart: boundsByPeriod[sourcePeriodType].startKey,
        periodEnd: boundsByPeriod[sourcePeriodType].endKey,
      })),
      ...destinationItems.map((entry, index) => ({
        id: entry.commitment.id,
        sortOrder: index,
        bucket: destinationBucket,
        periodType: destinationPeriodType,
        periodStart: boundsByPeriod[destinationPeriodType].startKey,
        periodEnd: boundsByPeriod[destinationPeriodType].endKey,
      })),
    ]

    setCommitmentLayout(updates)
  }, [entriesByDroppable, monthBounds, setCommitmentLayout, todayBounds, weekBounds])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
        <GlassCard padding="px-5 py-5" className="mb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
                Planning Workspace
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Plan the work you will actually move
                </h1>
                <InfoTooltip
                  text="Build a daily focus list, commit the week, and keep the month visible without cluttering the rest of the app."
                  widthClassName="w-72"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:w-[520px]">
              <SummaryCard label="Focus Today" value={summary.focus} accent="#22d3ee" />
              <SummaryCard label="Week Committed" value={summary.weekCommitted} accent="#10b981" />
              <SummaryCard label="Week Done" value={summary.weekDone} accent="#84cc16" />
              <SummaryCard label="Open Overdue" value={summary.overdueOpen} accent="#f97316" />
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5 mb-5">
          <GlassCard padding="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
                  Quick Capture
                </div>
                <InlineInfoTitle
                  title="Add work straight into the plan"
                  info="Capture standalone tasks here, then commit them to Today, Week, or Month in one step."
                  className="mt-2 text-lg"
                />
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Sparkles size={14} />
                {format(new Date(), 'EEEE, MMM d')}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={captureTitle}
                onChange={(event) => setCaptureTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCaptureTask()
                }}
                placeholder="Capture a task you want to act on..."
                className="flex-1 text-sm px-4 py-3 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)',
                }}
              />

              <div className="flex items-center gap-2">
                {TARGET_ORDER.map((target) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => setCaptureTarget(target)}
                    className="px-3 py-3 rounded-2xl text-xs font-semibold transition-colors"
                    style={captureTarget === target
                      ? { background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.26)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    {TARGET_LABELS[target]}
                  </button>
                ))}
                <button type="button" onClick={handleCaptureTask} className="btn-accent px-4 py-3">
                  Add
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
                  Start Date
                </span>
                <input
                  type="date"
                  value={captureStartDate}
                  onChange={(event) => setCaptureStartDate(event.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)',
                    colorScheme: 'dark',
                  }}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
                  Due Date
                </span>
                <input
                  type="date"
                  value={captureDueDate}
                  onChange={(event) => setCaptureDueDate(event.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)',
                    colorScheme: 'dark',
                  }}
                />
              </label>
            </div>
          </GlassCard>

          <GlassCard padding="p-5">
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.22)' }}
              >
                <Target size={18} style={{ color: '#22d3ee' }} />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
                  Carry Forward
                </div>
                <InlineInfoTitle
                  title="Pull unfinished commitments into the live plan"
                  info="Keep the plan honest instead of rebuilding it from memory every week or month."
                  className="mt-2 text-lg"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCarryForward('week')}
                disabled={carryForwardState.weekCarryCount === 0}
                className="text-left rounded-2xl px-4 py-4 transition-colors disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Last Week</span>
                  <RefreshCcw size={14} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="mt-3 text-2xl font-bold" style={{ color: '#10b981' }}>
                  {carryForwardState.weekCarryCount}
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  unfinished tasks ready to carry into this week
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleCarryForward('month')}
                disabled={carryForwardState.monthCarryCount === 0}
                className="text-left rounded-2xl px-4 py-4 transition-colors disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Last Month</span>
                  <RefreshCcw size={14} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="mt-3 text-2xl font-bold" style={{ color: '#a78bfa' }}>
                  {carryForwardState.monthCarryCount}
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  unfinished tasks ready to carry into this month
                </div>
              </button>
            </div>
          </GlassCard>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="space-y-5">
            {Object.entries(PERIOD_META).map(([periodType, meta]) => {
              const Icon = meta.icon
              const isSingleBucket = meta.buckets.length === 1
              const bounds = periodType === 'day' ? todayBounds : periodType === 'week' ? weekBounds : monthBounds

              return (
                <div key={periodType}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Icon size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <InlineInfoTitle
                        title={meta.title}
                        info={meta.description}
                        className="text-lg"
                        badge={(
                          <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                            {bounds.label}
                          </span>
                        )}
                      />
                    </div>
                  </div>

                  <div className={isSingleBucket ? 'grid grid-cols-1' : 'grid grid-cols-1 xl:grid-cols-3 gap-4'}>
                    {meta.buckets.map((bucket) => {
                      const droppableId = `${periodType}:${bucket}`
                      const color = PLANNING_BUCKET_COLORS[bucket]

                      return (
                        <PlanningBucket
                          key={droppableId}
                          droppableId={droppableId}
                          title={PLANNING_BUCKET_LABELS[bucket]}
                          hint={periodType === 'day' ? 'Drag to reorder priority inside today focus.' : 'Drag within this period to rebalance the plan.'}
                          color={color}
                          entries={entriesByDroppable[droppableId] ?? []}
                          onOpenTask={handleOpenTask}
                          onRemoveCommitment={removeCommitment}
                          onStatusChange={handleStatusChange}
                          emptyTitle={meta.emptyTitle}
                          emptyDescription={meta.emptyDescription}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </DragDropContext>

        <GlassCard padding="p-5" className="mt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
                Candidate Pool
              </div>
              <InlineInfoTitle
                title="Pull the next best work into the plan"
                info="Recommended tasks are scored by urgency, priority, and current progress. Search if you want something specific."
                className="mt-2 text-lg"
              />
            </div>

            <div className="relative w-full lg:w-[360px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input
                value={candidateQuery}
                onChange={(event) => setCandidateQuery(event.target.value)}
                placeholder="Search any task, program, or project"
                className="w-full text-sm pl-10 pr-3 py-3 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {candidateTasks.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Nothing left to queue"
                description="All open work is already committed or completed."
              />
            ) : candidateTasks.map(({ task, context }) => (
              <PlanningTaskRow
                key={task.id}
                task={task}
                context={context}
                isCandidate
                onOpen={() => handleOpenTask(task.id)}
                onStatusChange={handleStatusChange}
                targetState={currentTargetState.get(task.id) ?? { day: false, week: false, month: false }}
                onAssign={handleAssignTask}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <CircleDot size={13} />
            <span>Tasks only</span>
            <InfoTooltip
              text="Candidates stay task-based only. Programs, projects, and sub-projects remain context, not separate rows here. Use the plan buttons to commit a task to Today, Week, or Month without duplicating it."
              widthClassName="w-72"
            />
          </div>
        </GlassCard>
      </div>
    </div>
  )
})

export default Today
