import { memo } from 'react'
import { CheckSquare, ChevronRight, ListTodo } from 'lucide-react'
import EmptyState from '../common/EmptyState'
import {
  InlineDateChip,
  InlinePriorityChip,
  InlineStatusChip,
} from '../common/InlineFieldChips'
import {
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
} from './taskTablePresentation'

export const TaskContextChip = memo(function TaskContextChip({ label, color = '#94a3b8' }) {
  if (!label) return <span style={{ color: 'var(--text-secondary)' }}>—</span>

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium max-w-[180px] truncate"
      style={{ background: `${color}16`, color }}
      title={label}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="truncate">{label}</span>
    </span>
  )
})

const StaticChip = memo(function StaticChip({ label, tone = 'default' }) {
  const palette = tone === 'danger'
    ? { background: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)', color: '#fca5a5' }
    : { background: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }

  return (
    <span
      className="inline-flex items-center whitespace-nowrap font-medium rounded-full gap-1 px-2 py-1 text-[10px]"
      style={{
        background: palette.background,
        border: `1px solid ${palette.border}`,
        color: palette.color,
      }}
    >
      {label}
    </span>
  )
})

const StaticStatusChip = memo(function StaticStatusChip({ value }) {
  const color = TASK_STATUS_COLOR[value] || '#94a3b8'
  const label = TASK_STATUS_LABEL[value] || value || '—'

  return (
    <span
      className="inline-flex items-center whitespace-nowrap font-medium rounded-full gap-1 px-2 py-1 text-[10px]"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  )
})

const StaticPriorityChip = memo(function StaticPriorityChip({ value }) {
  const color = TASK_PRIORITY_COLOR[value] || '#94a3b8'
  const label = TASK_PRIORITY_LABEL[value] || value || '—'

  return (
    <span
      className="inline-flex items-center whitespace-nowrap font-medium rounded-full gap-1 px-2 py-1 text-[10px]"
      style={{ background: `${color}16`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
})

const defaultGetTask = (item) => item

const TaskTableRow = memo(function TaskTableRow({
  item,
  getTask,
  selectMode,
  isSelected,
  onToggleSelection,
  onOpenTask,
  getContextContent,
  getProjectContent,
  onUpdateDate,
  onUpdateStatus,
  onUpdatePriority,
  renderActions,
  extraColumns,
}) {
  const task = getTask(item)
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

  return (
    <tr
      className="transition-colors hover:bg-white/5"
      style={{ background: isSelected ? 'rgba(var(--accent-rgb),0.06)' : 'transparent' }}
    >
      <td className="px-3 py-2.5 border-b align-top" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-start gap-2 min-w-0">
          {selectMode ? (
            <button
              type="button"
              onClick={() => onToggleSelection?.(task.id)}
              className="mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
              style={isSelected
                ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
                : { borderColor: 'rgba(255,255,255,0.3)' }}
            >
              {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
            </button>
          ) : (
            <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: TASK_PRIORITY_COLOR[task.priority] || '#94a3b8' }} />
          )}

          <div className="min-w-0 flex-1">
            {onOpenTask ? (
              <button
                type="button"
                onClick={() => onOpenTask(task.id, item)}
                className="min-w-0 text-left bg-transparent border-0 p-0"
              >
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {task.title}
                </div>
                {task.description && (
                  <div className="hidden 2xl:block text-[11px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {task.description}
                  </div>
                )}
              </button>
            ) : (
              <>
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {task.title}
                </div>
                {task.description && (
                  <div className="hidden 2xl:block text-[11px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {task.description}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {getContextContent ? getContextContent(item, task) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
      </td>

      <td className="px-3 py-2.5 border-b whitespace-nowrap text-xs" style={{ borderColor: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
        {getProjectContent ? getProjectContent(item, task) : '—'}
      </td>

      <td className="px-3 py-2.5 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {onUpdateDate ? (
          <InlineDateChip
            compact
            label="Start"
            value={task.startDate}
            onChange={(nextValue) => onUpdateDate(task.id, 'startDate', nextValue, item)}
          />
        ) : (
          <StaticChip label={task.startDate ? new Date(task.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start'} />
        )}
      </td>

      <td className="px-3 py-2.5 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {onUpdateDate ? (
          <InlineDateChip
            compact
            label="Due"
            value={task.dueDate}
            tone={isOverdue ? 'danger' : 'default'}
            onChange={(nextValue) => onUpdateDate(task.id, 'dueDate', nextValue, item)}
          />
        ) : (
          <StaticChip
            label={task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Due'}
            tone={isOverdue ? 'danger' : 'default'}
          />
        )}
      </td>

      <td className="px-3 py-2.5 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {onUpdateStatus ? (
          <InlineStatusChip
            compact
            value={task.status}
            onChange={(nextStatus) => onUpdateStatus(task.id, nextStatus, item)}
            labels={TASK_STATUS_LABEL}
            colors={TASK_STATUS_COLOR}
          />
        ) : (
          <StaticStatusChip value={task.status} />
        )}
      </td>

      <td className="px-3 py-2.5 border-b whitespace-nowrap" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {onUpdatePriority ? (
          <InlinePriorityChip
            compact
            value={task.priority}
            onChange={(nextPriority) => onUpdatePriority(task.id, nextPriority, item)}
            labels={TASK_PRIORITY_LABEL}
            colors={TASK_PRIORITY_COLOR}
          />
        ) : (
          <StaticPriorityChip value={task.priority} />
        )}
      </td>

      {extraColumns?.map((column) => (
        <td
          key={column.key}
          className="px-3 py-2.5 border-b whitespace-nowrap text-xs"
          style={{ borderColor: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}
        >
          {column.render(item, task)}
        </td>
      ))}

      <td className="px-3 py-2.5 border-b whitespace-nowrap text-right sticky right-0 z-10" style={{ borderColor: 'rgba(255,255,255,0.04)', background: isSelected ? 'rgba(var(--accent-rgb),0.06)' : 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)' }}>
        <div className="inline-flex items-center justify-end gap-2">
          {renderActions ? renderActions(item, task) : null}
          {onOpenTask ? (
            <button
              type="button"
              onClick={() => onOpenTask(task.id, item)}
              className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-white/6"
              style={{ color: 'var(--text-secondary)' }}
              aria-label={`Open ${task.title}`}
              title="Open task"
            >
              <ChevronRight size={12} />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  )
})

const TaskDataTable = memo(function TaskDataTable({
  items,
  getTask = defaultGetTask,
  selectMode = false,
  selectedTaskIds = [],
  onToggleSelection = null,
  onToggleSelectAll = null,
  onOpenTask = null,
  getContextContent = null,
  getProjectContent = null,
  onUpdateDate = null,
  onUpdateStatus = null,
  onUpdatePriority = null,
  renderActions = null,
  extraColumns = [],
  emptyTitle = 'No tasks found',
  emptyDescription = 'Try adjusting your filters or create a new task.',
  minWidthClassName = 'min-w-[980px]',
}) {
  if (items.length === 0) {
    return <EmptyState icon={ListTodo} title={emptyTitle} description={emptyDescription} />
  }

  const tasks = items.map((item) => getTask(item))
  const allSelected = selectMode && tasks.length > 0 && tasks.every((task) => selectedTaskIds.includes(task.id))

  return (
    <div
      className="rounded-[24px] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="overflow-x-auto">
        <table className={`w-full ${minWidthClassName} border-collapse`}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.035)' }}>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => onToggleSelectAll?.(tasks.map((task) => task.id), allSelected)}
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
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Program
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Project
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Start
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Due
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Status
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Priority
              </th>
              {extraColumns.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {column.label}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.22em] sticky right-0 z-10" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.035)' }}>
                {renderActions ? 'Plan' : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const task = getTask(item)
              return (
                <TaskTableRow
                  key={task.id}
                  item={item}
                  getTask={getTask}
                  selectMode={selectMode}
                  isSelected={selectedTaskIds.includes(task.id)}
                  onToggleSelection={onToggleSelection}
                  onOpenTask={onOpenTask}
                  getContextContent={getContextContent}
                  getProjectContent={getProjectContent}
                  onUpdateDate={onUpdateDate}
                  onUpdateStatus={onUpdateStatus}
                  onUpdatePriority={onUpdatePriority}
                  renderActions={renderActions}
                  extraColumns={extraColumns}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default TaskDataTable
