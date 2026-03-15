import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { CheckSquare, ChevronRight, ListTodo } from 'lucide-react'
import TaskCard from '../components/tasks/TaskCard'
import FilterBar from '../components/tasks/FilterBar'
import BulkActionBar from '../components/tasks/BulkActionBar'
import CommitTaskMenu from '../components/planning/CommitTaskMenu'
import EmptyState from '../components/common/EmptyState'
import PageHero from '../components/common/PageHero'
import { InlineDateChip, InlineStatusChip } from '../components/common/InlineFieldChips'
import Header from '../components/layout/Header'
import useSettingsStore from '../store/useSettingsStore'
import useTaskStore from '../store/useTaskStore'
import useProjectStore from '../store/useProjectStore'
import { useFilteredTasks } from '../hooks/useFilteredTasks'
import { sortTasksByStartDate } from '../lib/taskSort'
import { getTaskProgram, getTaskProgramId } from '../lib/taskScope'

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#64748b' }
const PRIORITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }
const STATUS_COLOR = { todo: '#94a3b8', 'in-progress': '#22d3ee', review: '#f59e0b', done: '#10b981', blocked: '#ef4444' }
const STATUS_LABEL = { todo: 'To Do', 'in-progress': 'Active', review: 'Review', done: 'Done', blocked: 'Blocked' }

const STATUS_COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#94a3b8' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
  { id: 'review', label: 'In Review', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#10b981' },
  { id: 'blocked', label: 'Blocked', color: '#ef4444' },
]

const SELECT_STYLE = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text-primary)',
}

const PriorityPill = memo(function PriorityPill({ value }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap"
      style={{ background: `${PRIORITY_COLOR[value]}16`, color: PRIORITY_COLOR[value] }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLOR[value] }} />
      {PRIORITY_LABEL[value]}
    </span>
  )
})

const TaskContextChip = memo(function TaskContextChip({ task, projectById, programById }) {
  const project = task.projectId ? projectById.get(task.projectId) : null
  const program = task.programId
    ? programById.get(task.programId)
    : (project?.programId ? programById.get(project.programId) : null)
  const color = project?.color ?? program?.color ?? '#94a3b8'
  const label = project
    ? project.parentId && projectById.get(project.parentId)
      ? `${projectById.get(project.parentId)?.name} / ${project.name}`
      : project.name
    : program
      ? `${program.name} · Program`
      : 'Standalone'

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium max-w-[220px] truncate"
      style={{ background: `${color}16`, color }}
      title={label}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="truncate">{label}</span>
    </span>
  )
})

const BoardColumn = memo(function BoardColumn({ column, tasks, provided, snapshot, selectMode }) {
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const toggleTaskSelection = useSettingsStore((state) => state.toggleTaskSelection)

  return (
    <div
      className="flex flex-col rounded-2xl min-w-[260px] max-w-[300px] w-[280px]"
      style={{
        background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${snapshot.isDraggingOver ? `${column.color}40` : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.2s ease',
      }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{column.label}</span>
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${column.color}18`, color: column.color }}
        >
          {tasks.length}
        </span>
      </div>
      <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 px-2 pb-2 space-y-2 min-h-[80px]">
        {tasks.map((task, index) => (
          <Draggable key={task.id} draggableId={task.id} index={index}>
            {(dragProvided, dragSnapshot) => (
              <div
                ref={dragProvided.innerRef}
                {...dragProvided.draggableProps}
                {...dragProvided.dragHandleProps}
                className={`relative ${dragSnapshot.isDragging ? 'is-dragging' : ''}`}
                style={dragProvided.draggableProps.style}
              >
                {selectMode && (
                  <button
                    onPointerDown={(event) => { event.stopPropagation(); toggleTaskSelection(task.id) }}
                    className="absolute top-2 left-2 z-10 w-4 h-4 rounded border flex items-center justify-center"
                    style={selectedTaskIds.includes(task.id)
                      ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
                      : { background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    {selectedTaskIds.includes(task.id) && <span className="text-white text-[8px] font-bold">✓</span>}
                  </button>
                )}
                <TaskCard task={task} draggable />
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    </div>
  )
})

const TaskRow = memo(function TaskRow({ task, selectMode }) {
  const selectTask = useSettingsStore((state) => state.selectTask)
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const toggleTaskSelection = useSettingsStore((state) => state.toggleTaskSelection)
  const updateTask = useTaskStore((state) => state.updateTask)
  const projects = useProjectStore((state) => state.projects)
  const programs = useProjectStore((state) => state.programs)
  const project = projects.find((entry) => entry.id === task.projectId)
  const program = getTaskProgram(task, programs, projects)
  const now = new Date()
  const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
  const isDone = task.status === 'done'
  const isSelected = selectedTaskIds.includes(task.id)
  const completedSubs = task.subtasks?.filter((entry) => entry.completed).length ?? 0
  const totalSubs = task.subtasks?.length ?? 0

  const handleClick = () => {
    if (selectMode) toggleTaskSelection(task.id)
    else selectTask(task.id)
  }

  const openTask = useCallback(() => {
    selectTask(task.id)
  }, [selectTask, task.id])

  const updateDateField = useCallback((field, nextValue) => {
    updateTask(task.id, { [field]: nextValue ? new Date(nextValue).toISOString() : null })
  }, [task.id, updateTask])

  const updateStatusField = useCallback((nextStatus) => {
    updateTask(task.id, { status: nextStatus })
  }, [task.id, updateTask])

  return (
    <div
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-white/5 group"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isSelected ? 'rgba(var(--accent-rgb),0.06)' : 'transparent',
      }}
    >
      {selectMode ? (
        <span
          className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
          style={isSelected
            ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
            : { borderColor: 'rgba(255,255,255,0.3)' }}
        >
          {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
        </span>
      ) : (
        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: PRIORITY_COLOR[task.priority] }} />
      )}

      <button type="button" onClick={handleClick} className="flex-1 min-w-0 text-left bg-transparent border-0 p-0">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm truncate"
            style={{ color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {task.description}
            </p>
          )}
        </div>
      </button>

      {(project || program) && (
        <span
          className="hidden xl:inline text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 max-w-[180px] truncate"
          style={{ background: `${(project?.color ?? program?.color) || '#94a3b8'}18`, color: (project?.color ?? program?.color) || '#94a3b8' }}
        >
          {project?.name ?? `${program?.name} · Program`}
        </span>
      )}

      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        <InlineDateChip label="Start" value={task.startDate} onChange={(nextValue) => updateDateField('startDate', nextValue)} />
        <InlineDateChip label="Due" value={task.dueDate} tone={isOverdue ? 'danger' : 'default'} onChange={(nextValue) => updateDateField('dueDate', nextValue)} />
      </div>

      {totalSubs > 0 && (
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {completedSubs}/{totalSubs}
        </span>
      )}

      <InlineStatusChip value={task.status} onChange={updateStatusField} labels={STATUS_LABEL} colors={STATUS_COLOR} />

      {!selectMode && <CommitTaskMenu taskId={task.id} compact />}

      {!selectMode && (
        <button
          type="button"
          onClick={openTask}
          className="flex-shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={`Open ${task.title}`}
          title="Open task"
        >
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  )
})

const ListView = memo(function ListView({ tasks, selectMode }) {
  const selectAllTasks = useSettingsStore((state) => state.selectAllTasks)
  const clearTaskSelection = useSettingsStore((state) => state.clearTaskSelection)
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const allSelected = tasks.length > 0 && tasks.every((task) => selectedTaskIds.includes(task.id))

  if (tasks.length === 0) {
    return <EmptyState icon={ListTodo} title="No tasks found" description="Try adjusting your filters or create a new task." />
  }

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {selectMode && (
        <div
          className="flex items-center px-3 py-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(var(--accent-rgb),0.04)' }}
        >
          <button
            onClick={() => (allSelected ? clearTaskSelection() : selectAllTasks(tasks.map((task) => task.id)))}
            className="text-xs"
            style={{ color: 'var(--accent)' }}
          >
            {allSelected ? 'Deselect all' : `Select all (${tasks.length})`}
          </button>
        </div>
      )}
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} selectMode={selectMode} />
      ))}
    </div>
  )
})

const TableRow = memo(function TableRow({ task, selectMode, projectById, programById }) {
  const selectTask = useSettingsStore((state) => state.selectTask)
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const toggleTaskSelection = useSettingsStore((state) => state.toggleTaskSelection)
  const updateTask = useTaskStore((state) => state.updateTask)
  const isSelected = selectedTaskIds.includes(task.id)
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

  return (
    <tr
      className="transition-colors hover:bg-white/5"
      style={{ background: isSelected ? 'rgba(var(--accent-rgb),0.06)' : 'transparent' }}
    >
      <td className="px-3 py-3 border-b align-top" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-start gap-2.5 min-w-0">
          {selectMode ? (
            <button
              type="button"
              onClick={() => toggleTaskSelection(task.id)}
              className="mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
              style={isSelected
                ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
                : { borderColor: 'rgba(255,255,255,0.3)' }}
            >
              {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
            </button>
          ) : (
            <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[task.priority] }} />
          )}
          <button type="button" onClick={() => selectTask(task.id)} className="min-w-0 text-left bg-transparent border-0 p-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</div>
            {task.description && (
              <div className="text-[11px] truncate mt-1" style={{ color: 'var(--text-secondary)' }}>{task.description}</div>
            )}
          </button>
        </div>
      </td>
      <td className="px-3 py-3 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <TaskContextChip task={task} projectById={projectById} programById={programById} />
      </td>
      <td className="px-3 py-3 border-b whitespace-nowrap text-xs" style={{ borderColor: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
        {task.projectId ? (projectById.get(task.projectId)?.name ?? '—') : 'Program task'}
      </td>
      <td className="px-3 py-3 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <InlineDateChip
          label="Start"
          value={task.startDate}
          onChange={(nextValue) => updateTask(task.id, { startDate: nextValue ? new Date(nextValue).toISOString() : null })}
        />
      </td>
      <td className="px-3 py-3 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <InlineDateChip
          label="Due"
          value={task.dueDate}
          tone={isOverdue ? 'danger' : 'default'}
          onChange={(nextValue) => updateTask(task.id, { dueDate: nextValue ? new Date(nextValue).toISOString() : null })}
        />
      </td>
      <td className="px-3 py-3 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <InlineStatusChip
          value={task.status}
          onChange={(nextStatus) => updateTask(task.id, { status: nextStatus })}
          labels={STATUS_LABEL}
          colors={STATUS_COLOR}
        />
      </td>
      <td className="px-3 py-3 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <PriorityPill value={task.priority} />
      </td>
      <td className="px-3 py-3 border-b whitespace-nowrap text-right" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {!selectMode && <CommitTaskMenu taskId={task.id} compact />}
      </td>
    </tr>
  )
})

const TableView = memo(function TableView({ tasks, selectMode, projectById, programById }) {
  const selectAllTasks = useSettingsStore((state) => state.selectAllTasks)
  const clearTaskSelection = useSettingsStore((state) => state.clearTaskSelection)
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const allSelected = tasks.length > 0 && tasks.every((task) => selectedTaskIds.includes(task.id))

  if (tasks.length === 0) {
    return <EmptyState icon={ListTodo} title="No tasks found" description="Try adjusting your filters or create a new task." />
  }

  return (
    <div
      className="rounded-[24px] overflow-hidden mb-6"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.035)' }}>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => (allSelected ? clearTaskSelection() : selectAllTasks(tasks.map((task) => task.id)))}
                    className="inline-flex items-center gap-2"
                    style={{ color: 'var(--accent)' }}
                  >
                    <CheckSquare size={12} />
                    Task
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <CheckSquare size={12} />
                    Task
                  </span>
                )}
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Program</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Project</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Start</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Due</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Status</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Priority</th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>Plan</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <TableRow
                key={task.id}
                task={task}
                selectMode={selectMode}
                projectById={projectById}
                programById={programById}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})

const BoardView = memo(function BoardView({ selectMode, tasksByStatus }) {
  const updateTask = useTaskStore((state) => state.updateTask)

  const onDragEnd = useCallback((result) => {
    if (!result.destination) return
    const nextStatus = result.destination.droppableId
    if (result.source.droppableId !== nextStatus) {
      updateTask(result.draggableId, { status: nextStatus })
    }
  }, [updateTask])

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-6 px-0.5 snap-x snap-mandatory">
        {STATUS_COLUMNS.map((column) => (
          <Droppable key={column.id} droppableId={column.id}>
            {(provided, snapshot) => (
              <BoardColumn column={column} tasks={tasksByStatus[column.id] ?? []} provided={provided} snapshot={snapshot} selectMode={selectMode} />
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
})

const Tasks = memo(function Tasks() {
  const [showFilter, setShowFilter] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [filterProgramId, setFilterProgramId] = useState('')
  const [filterProjectId, setFilterProjectId] = useState('')
  const view = useSettingsStore((state) => state.view)
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const clearTaskSelection = useSettingsStore((state) => state.clearTaskSelection)
  const tasks = useFilteredTasks()
  const programs = useProjectStore((state) => state.programs)
  const projects = useProjectStore((state) => state.projects)
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs])

  const visibleProjects = useMemo(() => {
    if (!filterProgramId) return projects
    return projects.filter((project) => project.programId === filterProgramId)
  }, [projects, filterProgramId])

  useEffect(() => {
    if (!filterProjectId) return
    const project = projectById.get(filterProjectId)
    if (!project || (filterProgramId && project.programId !== filterProgramId)) {
      setFilterProjectId('')
    }
  }, [projectById, filterProgramId, filterProjectId])

  const filteredTasks = useMemo(() => {
    const scopedTasks = !filterProgramId && !filterProjectId
      ? tasks
      : tasks.filter((task) => {
          const taskProgramId = getTaskProgramId(task, projectById)
          if (filterProgramId && taskProgramId !== filterProgramId) return false
          if (filterProjectId && task.projectId !== filterProjectId) return false
          return true
        })

    return sortTasksByStartDate(scopedTasks)
  }, [tasks, projectById, filterProgramId, filterProjectId])

  const tasksByStatus = useMemo(() => {
    const grouped = { todo: [], 'in-progress': [], review: [], done: [], blocked: [] }
    filteredTasks.forEach((task) => {
      if (grouped[task.status]) grouped[task.status].push(task)
    })
    return grouped
  }, [filteredTasks])

  const inProgressCount = useMemo(
    () => filteredTasks.filter((task) => task.status === 'in-progress' || task.status === 'review').length,
    [filteredTasks]
  )
  const overdueCount = useMemo(
    () => filteredTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done').length,
    [filteredTasks]
  )

  const toggleSelectMode = () => {
    setSelectMode((current) => {
      if (current) clearTaskSelection()
      return !current
    })
  }

  const activeFilterCount = Number(Boolean(filterProgramId)) + Number(Boolean(filterProjectId))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header showViewToggle showFilter onFilter={() => setShowFilter((value) => !value)} />

      <div className="px-4 md:px-6 pb-3 space-y-3">
        <PageHero
          title="All Tasks"
          compact
          stats={[
            { label: 'Visible tasks', value: filteredTasks.length, tone: 'accent' },
            { label: 'In progress', value: inProgressCount, tone: 'default' },
            { label: 'Overdue', value: overdueCount, tone: overdueCount > 0 ? 'danger' : 'default' },
          ]}
          actions={
            <button
              onClick={toggleSelectMode}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-colors"
              style={selectMode
                ? { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }
                : { color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <CheckSquare size={13} />
              {selectMode ? `Selecting (${selectedTaskIds.length})` : 'Select tasks'}
            </button>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden md:flex items-center text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
              Scope
            </div>
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <select
                value={filterProgramId}
                onChange={(event) => {
                  setFilterProgramId(event.target.value)
                  setFilterProjectId('')
                }}
                className="text-xs px-3 py-2 rounded-xl min-w-[180px]"
                style={SELECT_STYLE}
              >
                <option value="">All programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
              <select
                value={filterProjectId}
                onChange={(event) => {
                  const nextProjectId = event.target.value
                  setFilterProjectId(nextProjectId)
                  if (!nextProjectId) return
                  const project = projectById.get(nextProjectId)
                  if (project?.programId && project.programId !== filterProgramId) {
                    setFilterProgramId(project.programId)
                  }
                }}
                className="text-xs px-3 py-2 rounded-xl min-w-[220px]"
                style={SELECT_STYLE}
              >
                <option value="">All projects</option>
                {visibleProjects.map((project) => {
                  const parent = project.parentId ? projectById.get(project.parentId) : null
                  const program = project.programId ? programById.get(project.programId) : null
                  const label = parent ? `${parent.name} / ${project.name}` : (program ? `${program.name} / ${project.name}` : project.name)
                  return <option key={project.id} value={project.id}>{label}</option>
                })}
              </select>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterProgramId('')
                    setFilterProjectId('')
                  }}
                  className="px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Clear scope
                </button>
              )}
            </div>
          </div>
        </PageHero>

        {showFilter && <FilterBar onClose={() => setShowFilter(false)} />}
      </div>

      <div className={`flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8 ${view === 'board' ? 'overflow-x-auto' : ''}`}>
        {view === 'list' && <ListView tasks={filteredTasks} selectMode={selectMode} />}
        {view === 'table' && <TableView tasks={filteredTasks} selectMode={selectMode} projectById={projectById} programById={programById} />}
        {view === 'board' && <BoardView selectMode={selectMode} tasksByStatus={tasksByStatus} />}
      </div>

      {selectedTaskIds.length > 0 && <BulkActionBar />}
    </div>
  )
})

export default Tasks
