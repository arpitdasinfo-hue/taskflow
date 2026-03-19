import { memo, useCallback } from 'react'
import { Calendar, MessageSquare, CheckSquare } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { PriorityBadge, StatusBadge, TagBadge } from '../common/Badge'
import CommitTaskMenu from '../planning/CommitTaskMenu'
import useSettingsStore from '../../store/useSettingsStore'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore from '../../store/useProjectStore'
import { getTaskProgram } from '../../lib/taskScope'

const TaskCard = memo(function TaskCard({ task, draggable = false }) {
  const selectTask    = useSettingsStore((s) => s.selectTask)
  const toggleSubtask = useTaskStore((s) => s.toggleSubtask)
  const projects      = useProjectStore((s) => s.projects)
  const programs      = useProjectStore((s) => s.programs)
  const project       = projects.find((p) => p.id === task.projectId)
  const program       = getTaskProgram(task, programs, projects)

  const completedSubs = task.subtasks.filter((s) => s.completed).length
  const totalSubs     = task.subtasks.length
  const progress      = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done'
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

  const handleClick = useCallback(() => selectTask(task.id), [task.id, selectTask])

  const handleSubtaskToggle = useCallback(
    (e, subtaskId) => {
      e.stopPropagation()
      toggleSubtask(task.id, subtaskId)
    },
    [task.id, toggleSubtask]
  )

  return (
    <div
      className={`glass glass-hover glass-active rounded-2xl p-4 cursor-pointer anim-slide-up ${draggable ? 'select-none' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      aria-label={`Open task: ${task.title}`}
    >
      {/* Top row: priority + status + project dot */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={task.priority} size="xs" />
          {(project || program) && (
            <span
              className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                background: `${(project?.color ?? program?.color) || '#94a3b8'}18`,
                color: (project?.color ?? program?.color) || '#94a3b8',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: (project?.color ?? program?.color) || '#94a3b8' }} />
              {project?.name ?? `${program?.name} · Program`}
            </span>
          )}
        </div>
        <StatusBadge status={task.status} size="xs" />
      </div>

      {/* Title */}
      <h3
        className={`font-semibold text-sm leading-snug mb-2 line-clamp-2 ${task.status === 'done' ? 'line-through opacity-50' : ''}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {task.title}
      </h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs line-clamp-1 mb-2.5" style={{ color: 'var(--text-secondary)' }}>
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Subtasks progress */}
      {totalSubs > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Subtasks
            </span>
            <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>
              {completedSubs}/{totalSubs}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* First 2 uncompleted subtasks inline */}
          <div className="mt-1.5 space-y-1">
            {task.subtasks.filter((s) => !s.completed).slice(0, 2).map((sub) => (
              <label
                key={sub.id}
                className="flex items-center gap-2 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={sub.completed}
                  onChange={(e) => handleSubtaskToggle(e, sub.id)}
                />
                <span className="text-[11px] line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                  {sub.title}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Bottom row: due date + meta counts */}
      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {task.dueDate ? (
          <span
            className="flex items-center gap-1 text-[10px] font-medium"
            style={{
              color: isOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : 'var(--text-secondary)',
            }}
          >
            <Calendar size={10} />
            {isOverdue ? 'Overdue · ' : isDueToday ? 'Today · ' : ''}
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2.5">
          <CommitTaskMenu taskId={task.id} compact />
          {task.notes.length > 0 && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <MessageSquare size={10} />
              {task.notes.length}
            </span>
          )}
          {totalSubs > 0 && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <CheckSquare size={10} />
              {completedSubs}/{totalSubs}
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

export default TaskCard
