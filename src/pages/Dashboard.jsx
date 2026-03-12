import { memo } from 'react'
import { TrendingUp, Clock, AlertTriangle, CheckCircle2, Zap, ArrowRight, Sparkles } from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import TaskCard from '../components/tasks/TaskCard'
import EmptyState from '../components/common/EmptyState'
import { useTaskStats, useFilteredTasks } from '../hooks/useFilteredTasks'
import useSettingsStore from '../store/useSettingsStore'
import useProjectStore from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'

const StatCard = memo(function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <GlassCard
      hover={!!onClick}
      onClick={onClick}
      padding="p-4"
      className="flex flex-col gap-1"
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
        {onClick && <ArrowRight size={12} style={{ color: 'var(--text-secondary)' }} />}
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      {sub !== undefined && (
        <div className="text-[10px]" style={{ color }}>{sub}</div>
      )}
    </GlassCard>
  )
})

const WelcomeCard = memo(function WelcomeCard({ onGetStarted }) {
  return (
    <div
      className="rounded-2xl p-6 mb-6 flex flex-col items-center text-center gap-4"
      style={{ background: 'rgba(var(--accent-rgb),0.07)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--accent-dim)' }}
      >
        <Sparkles size={22} style={{ color: 'var(--accent)' }} />
      </div>
      <div>
        <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Welcome to TaskFlow
        </p>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          Organize your work into Programs, Projects, and Tasks. Start by creating your first program.
        </p>
      </div>
      <button
        onClick={onGetStarted}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Create your first program <ArrowRight size={14} />
      </button>
    </div>
  )
})

const Dashboard = memo(function Dashboard() {
  const { total, inProgress, done, blocked, overdue, critical, completion } = useTaskStats()
  const tasks    = useFilteredTasks()
  const setPage  = useSettingsStore((s) => s.setPage)
  const programs = useProjectStore((s) => s.programs)
  const allTasks = useTaskStore((s) => s.tasks)

  const recent = tasks.filter((t) => t.status !== 'done').slice(0, 4)
  const isEmpty = programs.length === 0 && allTasks.length === 0

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
      {/* Welcome onboarding */}
      {isEmpty && <WelcomeCard onGetStarted={() => setPage('projects')} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={TrendingUp}
          label="Total Tasks"
          value={total}
          sub={`${completion}% complete`}
          color="var(--accent)"
          onClick={() => setPage('tasks')}
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={inProgress}
          color="#f97316"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={overdue}
          color="#ef4444"
          onClick={overdue > 0 ? () => setPage('today') : undefined}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={done}
          color="#10b981"
        />
      </div>

      {/* Completion ring + critical */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* Progress card */}
        <GlassCard padding="p-5" className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Overall Progress
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
              {completion}%
            </span>
          </div>
          <div className="h-2 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${completion}%`, background: `linear-gradient(90deg, var(--accent-dark), var(--accent))` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            <span>{done} done</span>
            <span>{total - done} remaining</span>
          </div>

          {/* Status breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Blocked',  value: blocked,    color: '#ef4444' },
              { label: 'Critical', value: critical,   color: '#f97316' },
              { label: 'On Track', value: tasks.filter((t) => t.status !== 'done' && t.status !== 'blocked' && t.status !== 'review').length, color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className="text-lg font-bold" style={{ color }}>{value}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{label}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Quick tips */}
        <GlassCard padding="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Quick Focus
            </span>
          </div>
          <div className="space-y-2">
            {[
              { label: `${critical} critical tasks`, color: '#ef4444', page: 'tasks' },
              { label: `${overdue} overdue tasks`,   color: '#f97316', page: 'today' },
              { label: `${blocked} blocked tasks`,   color: '#64748b', page: 'tasks' },
            ].map(({ label, color, page }) => (
              <button
                key={label}
                onClick={() => setPage(page)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-white/5 transition-colors text-left"
                style={{ color }}
              >
                {label}
                <ArrowRight size={11} />
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Recent tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Active Tasks
          </span>
          <button
            onClick={() => setPage('tasks')}
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: 'var(--accent)' }}
          >
            View all <ArrowRight size={11} />
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="All caught up!"
            description="No active tasks. Create a new task to get started."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recent.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

export default Dashboard
