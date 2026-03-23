import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { CheckSquare, Download, ListTodo } from 'lucide-react'
import ExportModal from '../components/settings/ExportModal'
import TaskCard from '../components/tasks/TaskCard'
import FilterBar from '../components/tasks/FilterBar'
import TaskSavedViewsPanel from '../components/tasks/TaskSavedViewsPanel'
import BulkActionBar from '../components/tasks/BulkActionBar'
import CommitTaskMenu from '../components/planning/CommitTaskMenu'
import EmptyState from '../components/common/EmptyState'
import PageHero from '../components/common/PageHero'
import Header from '../components/layout/Header'
import TaskDataTable, {
  TaskContextChip,
} from '../components/tasks/TaskDataTable'
import { InlineDateChip, InlineStatusChip } from '../components/common/InlineFieldChips'
import useSettingsStore from '../store/useSettingsStore'
import useTaskStore from '../store/useTaskStore'
import { useFilteredTasks } from '../hooks/useFilteredTasks'
import useWorkspaceScopedData from '../hooks/useWorkspaceScopedData'
import { getTaskProgramId } from '../lib/taskScope'
import { collectProjectDescendantIds } from '../lib/programWorkspace'
import useToastStore from '../store/useToastStore'
import {
  TASK_PRIORITY_COLOR,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
} from '../components/tasks/taskTablePresentation'

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

const DRILLDOWN_LABEL = {
  open: 'Open work',
  overdue: 'Overdue',
  blocked: 'Blocked',
  blockedOrLate: 'Blocked or late',
  critical: 'Critical',
  unscheduled: 'Unscheduled',
}

const resolveTaskContext = (task, projectById, programById) => {
  const project = task.projectId ? projectById.get(task.projectId) ?? null : null
  const parent = project?.parentId ? projectById.get(project.parentId) ?? null : null
  const programId = getTaskProgramId(task, projectById)
  const program = programId ? programById.get(programId) ?? null : null

  if (parent && project) {
    return {
      color: project.color ?? parent.color ?? program?.color ?? '#94a3b8',
      label: `${parent.name} / ${project.name}`,
      projectName: `${parent.name} / ${project.name}`,
    }
  }

  if (project) {
    return {
      color: project.color ?? program?.color ?? '#94a3b8',
      label: project.name,
      projectName: project.name,
    }
  }

  if (program) {
    return {
      color: program.color ?? '#94a3b8',
      label: `${program.name} · Program`,
      projectName: 'Program task',
    }
  }

  return {
    color: '#94a3b8',
    label: 'Standalone',
    projectName: 'Standalone',
  }
}

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

const TaskRow = memo(function TaskRow({ task, selectMode, projectById, programById }) {
  const selectTask = useSettingsStore((state) => state.selectTask)
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const toggleTaskSelection = useSettingsStore((state) => state.toggleTaskSelection)
  const updateTask = useTaskStore((state) => state.updateTask)
  const context = resolveTaskContext(task, projectById, programById)
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

  const updateDateField = useCallback((field, nextValue) => {
    updateTask(task.id, { [field]: nextValue ? new Date(nextValue).toISOString() : null })
  }, [task.id, updateTask])

  const updateStatusField = useCallback((nextStatus) => {
    updateTask(task.id, { status: nextStatus })
  }, [task.id, updateTask])

  return (
    <div
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
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
        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: TASK_PRIORITY_COLOR[task.priority] }} />
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
            <p className="hidden 2xl:block text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {task.description}
            </p>
          )}
        </div>
      </button>

      <div className="hidden xl:block flex-shrink-0">
        <TaskContextChip label={context.label} color={context.color} />
      </div>

      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        <InlineDateChip compact label="Start" value={task.startDate} onChange={(nextValue) => updateDateField('startDate', nextValue)} />
        <InlineDateChip compact label="Due" value={task.dueDate} tone={isOverdue ? 'danger' : 'default'} onChange={(nextValue) => updateDateField('dueDate', nextValue)} />
      </div>

      {totalSubs > 0 && (
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {completedSubs}/{totalSubs}
        </span>
      )}

      <InlineStatusChip compact value={task.status} onChange={updateStatusField} labels={TASK_STATUS_LABEL} colors={TASK_STATUS_COLOR} />

      {!selectMode && <CommitTaskMenu taskId={task.id} compact />}
    </div>
  )
})

const ListView = memo(function ListView({ tasks, selectMode, projectById, programById, hasActiveFilters }) {
  const selectAllTasks = useSettingsStore((state) => state.selectAllTasks)
  const clearTaskSelection = useSettingsStore((state) => state.clearTaskSelection)
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const clearFilters = useSettingsStore((state) => state.clearFilters)
  const allSelected = tasks.length > 0 && tasks.every((task) => selectedTaskIds.includes(task.id))

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        title={hasActiveFilters ? 'No tasks match your filters' : 'No tasks found'}
        description={hasActiveFilters ? 'Try removing some filters to see more tasks.' : 'Create your first task using the + button.'}
        action={hasActiveFilters ? (
          <button
            onClick={clearFilters}
            className="text-xs px-3 py-1.5 rounded-xl transition-colors"
            style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}
          >
            Clear filters
          </button>
        ) : undefined}
      />
    )
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
            aria-label={allSelected ? 'Deselect all tasks' : `Select all ${tasks.length} tasks`}
            className="text-xs"
            style={{ color: 'var(--accent)' }}
          >
            {allSelected ? 'Deselect all' : `Select all (${tasks.length})`}
          </button>
        </div>
      )}
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} selectMode={selectMode} projectById={projectById} programById={programById} />
      ))}
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
      const label = STATUS_COLUMNS.find((col) => col.id === nextStatus)?.label ?? nextStatus
      useToastStore.getState().addToast({ message: `Moved to ${label}`, type: 'info', duration: 2000 })
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
  const [showExport, setShowExport] = useState(false)
  const [filterProgramId, setFilterProgramId] = useState('')
  const [filterProjectId, setFilterProjectId] = useState('')

  const view = useSettingsStore((state) => state.view)
  const filters = useSettingsStore((state) => state.filters)
  const sortBy = useSettingsStore((state) => state.sortBy)
  const savedTaskViews = useSettingsStore((state) => state.savedTaskViews)
  const saveTaskView = useSettingsStore((state) => state.saveTaskView)
  const deleteTaskView = useSettingsStore((state) => state.deleteTaskView)
  const toggleFilter = useSettingsStore((state) => state.toggleFilter)
  const clearFilters = useSettingsStore((state) => state.clearFilters)
  const setSortBy = useSettingsStore((state) => state.setSortBy)
  const selectedTaskIds = useSettingsStore((state) => state.selectedTaskIds)
  const clearTaskSelection = useSettingsStore((state) => state.clearTaskSelection)
  const workspaceViewScope = useSettingsStore((state) => state.workspaceViewScope)
  const taskDrilldown = useSettingsStore((state) => state.taskDrilldown)
  const clearTaskDrilldown = useSettingsStore((state) => state.clearTaskDrilldown)
  const activeProjectId = useSettingsStore((state) => state.activeProjectId)
  const activeProgramId = useSettingsStore((state) => state.activeProgramId)
  const setActiveProject = useSettingsStore((state) => state.setActiveProject)
  const setActiveProgram = useSettingsStore((state) => state.setActiveProgram)
  const selectAllTasks = useSettingsStore((state) => state.selectAllTasks)
  const toggleTaskSelection = useSettingsStore((state) => state.toggleTaskSelection)
  const selectTask = useSettingsStore((state) => state.selectTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const tasks = useFilteredTasks()
  const { programs, projects, projectById, programById } = useWorkspaceScopedData()

  const visibleProjects = useMemo(() => {
    if (!filterProgramId) return projects
    return projects.filter((project) => project.programId === filterProgramId)
  }, [projects, filterProgramId])

  useEffect(() => {
    if (!filterProgramId) return
    if (!programById.has(filterProgramId)) {
      setFilterProgramId('')
      setFilterProjectId('')
    }
  }, [filterProgramId, programById, workspaceViewScope])

  useEffect(() => {
    if (!filterProjectId) return
    const project = projectById.get(filterProjectId)
    if (!project || (filterProgramId && project.programId !== filterProgramId)) {
      setFilterProjectId('')
    }
  }, [projectById, filterProgramId, filterProjectId, workspaceViewScope])

  useEffect(() => {
    if (!activeProgramId && !activeProjectId) {
      setFilterProgramId('')
      setFilterProjectId('')
      return
    }

    if (activeProjectId) {
      const project = projectById.get(activeProjectId)
      if (!project) {
        setFilterProjectId('')
        return
      }
      setFilterProjectId(project.id)
      setFilterProgramId(project.programId || '')
      return
    }

    setFilterProjectId('')
    setFilterProgramId(activeProgramId || '')
  }, [activeProgramId, activeProjectId, projectById])

  const filteredTasks = useMemo(() => {
    const scopedProjectIds = filterProjectId ? collectProjectDescendantIds(projects, filterProjectId) : null
    return !filterProgramId && !filterProjectId
      ? tasks
      : tasks.filter((task) => {
          const taskProgramId = getTaskProgramId(task, projectById)
          if (filterProgramId && taskProgramId !== filterProgramId) return false
          if (filterProjectId) {
            if (!task.projectId) return false
            if (!scopedProjectIds?.has(task.projectId)) return false
          }
          return true
        })
  }, [tasks, projects, projectById, filterProgramId, filterProjectId])

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

  const activeFilterCount = Number(Boolean(filterProgramId)) + Number(Boolean(filterProjectId))
  const hasActiveFilters = activeFilterCount > 0 || filters.status.length > 0 || filters.priority.length > 0 || filters.tags?.length > 0

  const toggleSelectMode = () => {
    setSelectMode((current) => {
      if (current) clearTaskSelection()
      return !current
    })
  }

  const getContextContent = useCallback((task) => {
    const context = resolveTaskContext(task, projectById, programById)
    return <TaskContextChip label={context.label} color={context.color} />
  }, [projectById, programById])

  const getProjectContent = useCallback((task) => {
    return resolveTaskContext(task, projectById, programById).projectName
  }, [projectById, programById])

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
            <div className="flex flex-wrap items-center gap-2">
              {taskDrilldown && (
                <button
                  type="button"
                  onClick={clearTaskDrilldown}
                  className="px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Clear {DRILLDOWN_LABEL[taskDrilldown] || 'view'}
                </button>
              )}
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
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                title="Export tasks"
              >
                <Download size={13} />
                Export
              </button>
            </div>
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
                  setActiveProject(null)
                  setActiveProgram(event.target.value || null)
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
                  if (!nextProjectId) {
                    setActiveProject(null)
                    return
                  }
                  const project = projectById.get(nextProjectId)
                  if (project?.programId && project.programId !== filterProgramId) {
                    setFilterProgramId(project.programId)
                    setActiveProgram(project.programId)
                  }
                  setActiveProject(nextProjectId || null)
                }}
                className="text-xs px-3 py-2 rounded-xl min-w-[220px]"
                style={SELECT_STYLE}
              >
                <option value="">All projects</option>
                {visibleProjects.map((project) => {
                  const parent = project.parentId ? projectById.get(project.parentId) : null
                  const program = project.programId ? programById.get(project.programId) : null
                  const label = parent
                    ? `${parent.name} / ${project.name}`
                    : filterProgramId
                      ? project.name
                      : (program ? `${program.name} / ${project.name}` : project.name)
                  return <option key={project.id} value={project.id}>{label}</option>
                })}
              </select>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterProgramId('')
                    setFilterProjectId('')
                    setActiveProject(null)
                    setActiveProgram(null)
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
        {showFilter && (
          <div className="mt-3">
            <TaskSavedViewsPanel
              savedViews={savedTaskViews}
              onApply={(savedView) => {
                clearFilters()
                savedView.filters.status.forEach((s) => toggleFilter('status', s))
                savedView.filters.priority.forEach((p) => toggleFilter('priority', p))
                setSortBy(savedView.sortBy)
              }}
              onSave={(name) => saveTaskView({ name, filters, sortBy })}
              onDelete={deleteTaskView}
            />
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8 ${view === 'board' ? 'overflow-x-auto' : ''}`}>
        {view === 'list' && <ListView tasks={filteredTasks} selectMode={selectMode} projectById={projectById} programById={programById} hasActiveFilters={hasActiveFilters} />}

        {view === 'table' && (
          <TaskDataTable
            items={filteredTasks}
            selectMode={selectMode}
            selectedTaskIds={selectedTaskIds}
            onToggleSelection={toggleTaskSelection}
            onToggleSelectAll={(taskIds, allSelected) => {
              if (allSelected) clearTaskSelection()
              else selectAllTasks(taskIds)
            }}
            onOpenTask={(taskId) => selectTask(taskId)}
            getContextContent={(task) => getContextContent(task)}
            getProjectContent={(task) => getProjectContent(task)}
            onUpdateDate={(taskId, field, nextValue) => {
              updateTask(taskId, { [field]: nextValue ? new Date(nextValue).toISOString() : null })
            }}
            onUpdateStatus={(taskId, nextStatus) => updateTask(taskId, { status: nextStatus })}
            onUpdatePriority={(taskId, nextPriority) => updateTask(taskId, { priority: nextPriority })}
            renderActions={(task) => <CommitTaskMenu taskId={task.id} compact />}
          />
        )}

        {view === 'board' && <BoardView selectMode={selectMode} tasksByStatus={tasksByStatus} />}
      </div>

      <BulkActionBar active={selectMode} onExitSelectMode={() => setSelectMode(false)} />
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  )
})

export default Tasks
