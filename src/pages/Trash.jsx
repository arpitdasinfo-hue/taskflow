import { memo, useMemo, useState } from 'react'
import { ArchiveX, Clock3, Folder, RotateCcw, Search, Trash2 } from 'lucide-react'
import Header from '../components/layout/Header'
import EmptyState from '../components/common/EmptyState'
import useTaskStore from '../store/useTaskStore'
import useWorkspaceScopedData from '../hooks/useWorkspaceScopedData'
import { getTaskProgram } from '../lib/taskScope'

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#94a3b8',
}

const STATUS_LABELS = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
}

const formatDeletedLabel = (value) => {
  if (!value) return 'Recently removed'

  const deletedAt = new Date(value)
  const today = new Date()
  const sameDay = deletedAt.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (sameDay) return 'Today'
  if (deletedAt.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return deletedAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: deletedAt.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

const formatDateTime = (value) => {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const TrashTaskRow = memo(function TrashTaskRow({ task, projectsById, programs, onRestore, onDeleteForever }) {
  const project = task.projectId ? projectsById.get(task.projectId) : null
  const parentProject = project?.parentId ? projectsById.get(project.parentId) : null
  const program = getTaskProgram(task, programs, projectsById)
  const contextLabel = parentProject
    ? `${program?.name || 'No program'} / ${parentProject.name} / ${project.name}`
    : project
      ? `${program?.name || 'No program'} / ${project.name}`
      : program
        ? `${program.name} / Direct task`
        : 'No program'

  return (
    <div
      className="rounded-2xl px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {task.title}
          </p>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${PRIORITY_COLORS[task.priority] ?? '#94a3b8'}18`, color: PRIORITY_COLORS[task.priority] ?? '#94a3b8' }}
          >
            {task.priority}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
          >
            {STATUS_LABELS[task.status] ?? task.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-flex items-center gap-1.5">
            <Folder size={11} />
            {contextLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={11} />
            Deleted {formatDateTime(task.deletedAt)}
          </span>
          {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 lg:flex-shrink-0">
        <button
          onClick={() => onRestore(task.id)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.22)' }}
        >
          <RotateCcw size={12} />
          Restore
        </button>
        <button
          onClick={() => onDeleteForever(task.id)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)' }}
        >
          <Trash2 size={12} />
          Delete forever
        </button>
      </div>
    </div>
  )
})

const Trash = memo(function Trash() {
  const [query, setQuery] = useState('')
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const trashTasks = useTaskStore((state) => state.trashTasks)
  const restoreTask = useTaskStore((state) => state.restoreTask)
  const purgeTask = useTaskStore((state) => state.purgeTask)
  const emptyTrash = useTaskStore((state) => state.emptyTrash)
  const { projects, programs, trashTasks: scopedTrashTasks } = useWorkspaceScopedData()

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  )

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return scopedTrashTasks

    return scopedTrashTasks.filter((task) => {
      const project = task.projectId ? projectsById.get(task.projectId) : null
      const program = getTaskProgram(task, programs, projectsById)
      return [
        task.title,
        task.description,
        project?.name,
        program?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    })
  }, [scopedTrashTasks, query, projectsById, programs])

  const groupedTasks = useMemo(() => {
    const groups = new Map()

    filteredTasks.forEach((task) => {
      const label = formatDeletedLabel(task.deletedAt)
      const current = groups.get(label) ?? []
      current.push(task)
      groups.set(label, current)
    })

    return [...groups.entries()]
  }, [filteredTasks])

  const lastDeleted = scopedTrashTasks[0]?.deletedAt ? formatDateTime(scopedTrashTasks[0].deletedAt) : '—'

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_220px] gap-3 mb-5">
          <label
            className="flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Search size={15} style={{ color: 'var(--text-secondary)' }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search deleted tasks"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </label>

          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
              In Trash
            </p>
            <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              {scopedTrashTasks.length}
            </p>
          </div>

          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
              Last Deleted
            </p>
            <p className="text-sm font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
              {lastDeleted}
            </p>
          </div>
        </div>

        <div
          className="rounded-[24px] p-4 md:p-5 mb-5"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
                Trash Review
              </p>
              <h2 className="text-base font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                Deleted tasks stay out of your dashboards
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Restore anything you removed by mistake, or delete it permanently from here.
              </p>
            </div>

            {scopedTrashTasks.length > 0 && (
              confirmEmpty ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#fca5a5' }}>Delete all permanently?</span>
                  <button
                    onClick={() => {
                      emptyTrash()
                      setConfirmEmpty(false)
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ background: 'rgba(239,68,68,0.16)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)' }}
                  >
                    Empty trash
                  </button>
                  <button
                    onClick={() => setConfirmEmpty(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmEmpty(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)' }}
                >
                  <Trash2 size={12} />
                  Empty trash
                </button>
              )
            )}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={ArchiveX}
            title={trashTasks.length === 0 ? 'Trash is empty' : 'No deleted tasks match this search'}
            description={trashTasks.length === 0
              ? 'Deleted tasks will land here, not inside your active dashboards.'
              : 'Try a different keyword or clear the search.'}
          />
        ) : (
          <div className="space-y-5">
            {groupedTasks.map(([label, tasks]) => (
              <section key={label}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                  >
                    {tasks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TrashTaskRow
                      key={task.id}
                      task={task}
                      projectsById={projectsById}
                      programs={programs}
                      onRestore={restoreTask}
                      onDeleteForever={purgeTask}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

export default Trash
