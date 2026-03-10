import { memo, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import TaskCard from '../components/tasks/TaskCard'
import FilterBar from '../components/tasks/FilterBar'
import EmptyState from '../components/common/EmptyState'
import Header from '../components/layout/Header'
import GlassCard from '../components/common/GlassCard'
import { ListTodo, Plus } from 'lucide-react'
import useSettingsStore from '../store/useSettingsStore'
import useTaskStore from '../store/useTaskStore'
import { useFilteredTasks, useTasksByStatus } from '../hooks/useFilteredTasks'

const STATUS_COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: '#94a3b8' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
  { id: 'review',      label: 'In Review',   color: '#f59e0b' },
  { id: 'done',        label: 'Done',        color: '#10b981' },
  { id: 'blocked',     label: 'Blocked',     color: '#ef4444' },
]

// ── Board Column ─────────────────────────────────────────────────────────────
const BoardColumn = memo(function BoardColumn({ column, tasks, provided, snapshot }) {
  return (
    <div
      className="flex flex-col rounded-2xl min-w-[260px] max-w-[300px] w-[280px]"
      style={{
        background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${snapshot.isDraggingOver ? column.color + '40' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Column header */}
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

      {/* Drop zone */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className="flex-1 px-2 pb-2 space-y-2 min-h-[80px]"
      >
        {tasks.map((task, index) => (
          <Draggable key={task.id} draggableId={task.id} index={index}>
            {(dragProvided, dragSnapshot) => (
              <div
                ref={dragProvided.innerRef}
                {...dragProvided.draggableProps}
                {...dragProvided.dragHandleProps}
                className={dragSnapshot.isDragging ? 'is-dragging' : ''}
                style={dragProvided.draggableProps.style}
              >
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
const ListView = memo(function ListView({ tasks }) {
  if (tasks.length === 0)
    return (
      <EmptyState
        icon={ListTodo}
        title="No tasks found"
        description="Try adjusting your filters or create a new task."
      />
    )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-6">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
})

// ── Board View ─────────────────────────────────────────────────────────────────
const BoardView = memo(function BoardView() {
  const tasksByStatus = useTasksByStatus()
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
              <BoardColumn
                column={col}
                tasks={tasksByStatus[col.id] ?? []}
                provided={provided}
                snapshot={snapshot}
              />
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
  const view  = useSettingsStore((s) => s.view)
  const tasks = useFilteredTasks()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header showViewToggle showFilter onFilter={() => setShowFilter((v) => !v)} />

      {/* Filter bar */}
      {showFilter && (
        <div className="px-4 md:px-6 mb-2">
          <FilterBar onClose={() => setShowFilter(false)} />
        </div>
      )}

      {/* Task count */}
      <div className="px-4 md:px-6 mb-3 flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto px-4 md:px-6 ${view === 'board' ? 'overflow-x-auto' : ''}`}>
        {view === 'list' ? <ListView tasks={tasks} /> : <BoardView />}
      </div>
    </div>
  )
})

export default Tasks
