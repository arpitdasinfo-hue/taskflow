import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import TaskCard from '../components/tasks/TaskCard'
import FilterBar from '../components/tasks/FilterBar'
import BulkActionBar from '../components/tasks/BulkActionBar'
import EmptyState from '../components/common/EmptyState'
import Header from '../components/layout/Header'
import { ListTodo, ChevronRight, CheckSquare } from 'lucide-react'
import useSettingsStore from '../store/useSettingsStore'
import useTaskStore from '../store/useTaskStore'
import useProjectStore from '../store/useProjectStore'
import { useFilteredTasks } from '../hooks/useFilteredTasks'

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#64748b' }
const STATUS_COLOR   = { todo: '#94a3b8', 'in-progress': '#22d3ee', review: '#f59e0b', done: '#10b981', blocked: '#ef4444' }
const STATUS_LABEL   = { todo: 'To Do', 'in-progress': 'Active', review: 'Review', done: 'Done', blocked: 'Blocked' }

const STATUS_COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: '#94a3b8' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
  { id: 'review',      label: 'In Review',   color: '#f59e0b' },
  { id: 'done',        label: 'Done',        color: '#10b981' },
  { id: 'blocked',     label: 'Blocked',     color: '#ef4444' },
]

// ── Board Column ─────────────────────────────────────────────────────────────
const BoardColumn = memo(function BoardColumn({ column, tasks, provided, snapshot, selectMode }) {
  const selectedTaskIds     = useSettingsStore((s) => s.selectedTaskIds)
  const toggleTaskSelection = useSettingsStore((s) => s.toggleTaskSelection)

  return (
    <div
      className="flex flex-col rounded-2xl min-w-[260px] max-w-[300px] w-[280px]"
      style={{
        background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${snapshot.isDraggingOver ? column.color + '40' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.2s ease',
      }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{column.label}</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${column.color}18`, color: column.color }}>
          {tasks.length}
        </span>
      </div>
      <div ref={provided.innerRef} {...provided.droppableProps}
        className="flex-1 px-2 pb-2 space-y-2 min-h-[80px]">
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
                    onPointerDown={(e) => { e.stopPropagation(); toggleTaskSelection(task.id) }}
                    className="absolute top-2 left-2 z-10 w-4 h-4 rounded border flex items-center justify-center"
                    style={selectedTaskIds.includes(task.id)
                      ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
                      : { background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.3)' }
                    }
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

// ── List View ─────────────────────────────────────────────────────────────────
const TaskRow = memo(function TaskRow({ task, selectMode }) {
  const selectTask          = useSettingsStore((s) => s.selectTask)
  const selectedTaskIds     = useSettingsStore((s) => s.selectedTaskIds)
  const toggleTaskSelection = useSettingsStore((s) => s.toggleTaskSelection)
  const projects            = useProjectStore((s) => s.projects)
  const project    = projects.find((p) => p.id === task.projectId)
  const now        = new Date()
  const isOverdue  = task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
  const isDone     = task.status === 'done'
  const isSelected = selectedTaskIds.includes(task.id)
  const completedSubs = task.subtasks?.filter((s) => s.completed).length ?? 0
  const totalSubs     = task.subtasks?.length ?? 0

  const handleClick = () => {
    if (selectMode) toggleTaskSelection(task.id)
    else selectTask(task.id)
  }

  return (
    <button onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-white/5 group"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isSelected ? 'rgba(var(--accent-rgb),0.06)' : 'transparent',
      }}
    >
      {selectMode ? (
        <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
          style={isSelected
            ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
            : { borderColor: 'rgba(255,255,255,0.3)' }
          }>
          {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
        </span>
      ) : (
        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: PRIORITY_COLOR[task.priority] }} />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate"
          style={{ color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
        )}
      </div>

      {project && (
        <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${project.color}18`, color: project.color }}>
          {project.name}
        </span>
      )}

      {totalSubs > 0 && (
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {completedSubs}/{totalSubs}
        </span>
      )}

      {task.dueDate && (
        <span className="text-[10px] flex-shrink-0"
          style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}

      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
        style={{ background: `${STATUS_COLOR[task.status]}18`, color: STATUS_COLOR[task.status] }}>
        {STATUS_LABEL[task.status]}
      </span>

      {!selectMode && (
        <ChevronRight size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
          className="opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  )
})

const ListView = memo(function ListView({ tasks, selectMode }) {
  const selectAllTasks     = useSettingsStore((s) => s.selectAllTasks)
  const clearTaskSelection = useSettingsStore((s) => s.clearTaskSelection)
  const selectedTaskIds    = useSettingsStore((s) => s.selectedTaskIds)
  const allSelected = tasks.length > 0 && tasks.every((t) => selectedTaskIds.includes(t.id))

  if (tasks.length === 0)
    return <EmptyState icon={ListTodo} title="No tasks found" description="Try adjusting your filters or create a new task." />

  return (
    <div className="rounded-2xl overflow-hidden mb-6"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {selectMode && (
        <div className="flex items-center px-3 py-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(var(--accent-rgb),0.04)' }}>
          <button onClick={() => allSelected ? clearTaskSelection() : selectAllTasks(tasks.map((t) => t.id))}
            className="text-xs" style={{ color: 'var(--accent)' }}>
            {allSelected ? 'Deselect all' : `Select all (${tasks.length})`}
          </button>
        </div>
      )}
      {tasks.map((task) => <TaskRow key={task.id} task={task} selectMode={selectMode} />)}
    </div>
  )
})

// ── Board View ─────────────────────────────────────────────────────────────────
const BoardView = memo(function BoardView({ selectMode, tasksByStatus }) {
  const updateTask    = useTaskStore((s) => s.updateTask)

  const onDragEnd = useCallback(
    (result) => {
      if (!result.destination) return
      const newStatus = result.destination.droppableId
      if (result.source.droppableId !== newStatus) {
        updateTask(result.draggableId, { status: newStatus })
      }
    },
    [updateTask]
  )

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-6 px-0.5 snap-x snap-mandatory">
        {STATUS_COLUMNS.map((col) => (
          <Droppable key={col.id} droppableId={col.id}>
            {(provided, snapshot) => (
              <BoardColumn column={col} tasks={tasksByStatus[col.id] ?? []}
                provided={provided} snapshot={snapshot} selectMode={selectMode} />
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
})

// ── Tasks Page ─────────────────────────────────────────────────────────────────
const Tasks = memo(function Tasks() {
  const [showFilter, setShowFilter] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [filterProgramId, setFilterProgramId] = useState('')
  const [filterProjectId, setFilterProjectId] = useState('')
  const view               = useSettingsStore((s) => s.view)
  const selectedTaskIds    = useSettingsStore((s) => s.selectedTaskIds)
  const clearTaskSelection = useSettingsStore((s) => s.clearTaskSelection)
  const tasks              = useFilteredTasks()
  const programs           = useProjectStore((s) => s.programs)
  const projects           = useProjectStore((s) => s.projects)
  const projectById        = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])

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
    if (!filterProgramId && !filterProjectId) return tasks

    return tasks.filter((task) => {
      const project = projectById.get(task.projectId)
      if (filterProgramId && project?.programId !== filterProgramId) return false
      if (filterProjectId && task.projectId !== filterProjectId) return false
      return true
    })
  }, [tasks, projectById, filterProgramId, filterProjectId])

  const tasksByStatus = useMemo(() => {
    const grouped = {
      todo: [],
      'in-progress': [],
      review: [],
      done: [],
      blocked: [],
    }
    filteredTasks.forEach((task) => {
      if (grouped[task.status]) grouped[task.status].push(task)
    })
    return grouped
  }, [filteredTasks])

  const toggleSelectMode = () => {
    setSelectMode((v) => { if (v) clearTaskSelection(); return !v })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header showViewToggle showFilter onFilter={() => setShowFilter((v) => !v)} />

      {showFilter && (
        <div className="px-4 md:px-6 mb-2">
          <FilterBar onClose={() => setShowFilter(false)} />
        </div>
      )}

      <div className="px-4 md:px-6 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </span>
          <button onClick={toggleSelectMode}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors"
            style={selectMode
              ? { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }
              : { color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)' }
            }>
            <CheckSquare size={12} />
            {selectMode ? `Selecting (${selectedTaskIds.length})` : 'Select'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterProgramId}
            onChange={(event) => {
              setFilterProgramId(event.target.value)
              setFilterProjectId('')
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
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
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
          >
            <option value="">All projects</option>
            {visibleProjects.map((project) => {
              const parent = project.parentId ? projectById.get(project.parentId) : null
              const label = parent ? `${parent.name} / ${project.name}` : project.name
              return (
                <option key={project.id} value={project.id}>{label}</option>
              )
            })}
          </select>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto px-4 md:px-6 ${view === 'board' ? 'overflow-x-auto' : ''}`}>
        {view === 'list'
          ? <ListView tasks={filteredTasks} selectMode={selectMode} />
          : <BoardView selectMode={selectMode} tasksByStatus={tasksByStatus} />
        }
      </div>

      {selectedTaskIds.length > 0 && <BulkActionBar />}
    </div>
  )
})

export default Tasks
