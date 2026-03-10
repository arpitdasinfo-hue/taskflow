import { memo } from 'react'
import { AlertTriangle, Sun, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import TaskCard from '../components/tasks/TaskCard'
import EmptyState from '../components/common/EmptyState'
import Header from '../components/layout/Header'
import GlassCard from '../components/common/GlassCard'
import { useTodayTasks } from '../hooks/useFilteredTasks'

const SectionHeader = memo(function SectionHeader({ icon: Icon, title, count, color }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ background: `${color}20` }}
      >
        <Icon size={13} style={{ color }} />
      </div>
      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: `${color}18`, color }}
      >
        {count}
      </span>
    </div>
  )
})

const Today = memo(function Today() {
  const { today, overdue } = useTodayTasks()
  const dateStr = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
        {/* Date banner */}
        <GlassCard padding="px-4 py-3" className="mb-5 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-dim)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
          >
            <CalendarClock size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Today</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dateStr}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
              {today.length + overdue.length}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>tasks</div>
          </div>
        </GlassCard>

        {/* Overdue */}
        {overdue.length > 0 && (
          <div className="mb-6">
            <SectionHeader icon={AlertTriangle} title="Overdue" count={overdue.length} color="#ef4444" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {overdue.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Due today */}
        <div>
          <SectionHeader icon={Sun} title="Due Today" count={today.length} color="#f59e0b" />
          {today.length === 0 ? (
            <EmptyState
              icon={Sun}
              title="Nothing due today"
              description={overdue.length > 0 ? 'Clear your overdue tasks above.' : 'Enjoy your clear schedule!'}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {today.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* All clear */}
        {today.length === 0 && overdue.length === 0 && (
          <EmptyState
            icon={Sun}
            title="You're all caught up!"
            description="No tasks due today or overdue. Great work."
          />
        )}
      </div>
    </div>
  )
})

export default Today
