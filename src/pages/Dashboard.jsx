import { memo, useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ListChecks,
  Sparkles,
  Target,
} from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import InfoTooltip from '../components/common/InfoTooltip'
import useSettingsStore from '../store/useSettingsStore'
import usePlanningStore from '../store/usePlanningStore'
import { useAllProgramStats } from '../hooks/useProgramStats'
import { getPeriodBounds } from '../lib/planning'
import useWorkspaceScopedData from '../hooks/useWorkspaceScopedData'

const formatShortDate = (value) => {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const tonePalette = {
  neutral: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' },
  accent: { bg: 'rgba(var(--accent-rgb),0.12)', border: 'rgba(var(--accent-rgb),0.22)', color: 'var(--accent)' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.24)', color: '#f59e0b' },
  danger: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)', color: '#ef4444' },
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.24)', color: '#10b981' },
}

const StatPill = memo(function StatPill({ label, value, tone = 'neutral', onClick = null }) {
  const palette = tonePalette[tone] ?? tonePalette.neutral
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick ?? undefined}
      className="rounded-2xl px-3 py-3 text-left transition-transform hover:-translate-y-0.5"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="mt-2 text-[1.9rem] font-bold leading-none" style={{ color: palette.color }}>
        {value}
      </div>
    </Component>
  )
})

const SignalCard = memo(function SignalCard({ title, value, detail, tone = 'neutral', icon: Icon, onClick }) {
  const palette = tonePalette[tone] ?? tonePalette.neutral

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-[22px] p-4 transition-transform hover:-translate-y-0.5"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${palette.border}` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: `${palette.color}18`, border: `1px solid ${palette.color}26` }}
          >
            <Icon size={15} style={{ color: palette.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{detail}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold leading-none" style={{ color: palette.color }}>{value}</div>
          <ArrowRight size={12} className="ml-auto mt-2" style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>
    </button>
  )
})

const LaunchRow = memo(function LaunchRow({ milestone, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/4"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.16em] flex-shrink-0"
        style={{ background: `${milestone.color}18`, color: milestone.color }}
      >
        {formatShortDate(milestone.dueDate)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {milestone.name}
        </div>
        <div className="mt-1 text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
          {milestone.context}
        </div>
      </div>
      <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        {milestone.completed ? 'Done' : 'Upcoming'}
      </div>
    </button>
  )
})

const QueueRow = memo(function QueueRow({ task, context, onOpen }) {
  const dueLabel = task.dueDate ? formatShortDate(task.dueDate) : 'No due date'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/4"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f97316' : '#38bdf8' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</div>
        <div className="mt-1 text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{context}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[11px] font-medium" style={{ color: task.status === 'blocked' ? '#f59e0b' : task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' ? '#ef4444' : 'var(--text-primary)' }}>
          {dueLabel}
        </div>
        <div className="mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{task.status === 'in-progress' ? 'Active' : task.status === 'todo' ? 'To Do' : task.status}</div>
      </div>
    </button>
  )
})

const ProgramPulseRow = memo(function ProgramPulseRow({ program, stats, onOpen }) {
  const tone = stats.health === 'off-track' ? 'danger' : stats.health === 'at-risk' ? 'warning' : 'success'
  const palette = tonePalette[tone]

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/4"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: program.color }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{program.name}</div>
        <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {stats.projectCount} projects · {stats.total} tasks · {stats.completion}% complete
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px]" style={{ color: stats.critical > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
          {stats.critical} critical
        </span>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: palette.bg, color: palette.color }}>
          {stats.health === 'off-track' ? 'Off track' : stats.health === 'at-risk' ? 'At risk' : 'On track'}
        </span>
      </div>
    </button>
  )
})

const Dashboard = memo(function Dashboard() {
  const setPage = useSettingsStore((state) => state.setPage)
  const setActiveProgram = useSettingsStore((state) => state.setActiveProgram)
  const setActiveProject = useSettingsStore((state) => state.setActiveProject)
  const selectTask = useSettingsStore((state) => state.selectTask)
  const setTaskDrilldown = useSettingsStore((state) => state.setTaskDrilldown)
  const clearTaskDrilldown = useSettingsStore((state) => state.clearTaskDrilldown)
  const setAnalyticsInsight = useSettingsStore((state) => state.setAnalyticsInsight)
  const clearAnalyticsInsight = useSettingsStore((state) => state.clearAnalyticsInsight)
  const { programs, projects, milestones, tasks } = useWorkspaceScopedData()
  const commitments = usePlanningStore((state) => state.commitments)
  const allStats = useAllProgramStats({ programs, projects, milestones, tasks })

  const activeTasks = useMemo(() => tasks.filter((task) => !task.deletedAt), [tasks])
  const openTasks = useMemo(() => activeTasks.filter((task) => task.status !== 'done'), [activeTasks])
  const overdueTasks = useMemo(() => openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date()), [openTasks])
  const blockedTasks = useMemo(() => openTasks.filter((task) => task.status === 'blocked'), [openTasks])
  const criticalTasks = useMemo(() => openTasks.filter((task) => task.priority === 'critical'), [openTasks])
  const unscheduledTasks = useMemo(() => openTasks.filter((task) => !task.startDate || !task.dueDate), [openTasks])

  const weekBounds = getPeriodBounds('week')
  const todayBounds = getPeriodBounds('day')
  const weekCommitments = useMemo(
    () => commitments.filter((commitment) => commitment.periodType === 'week' && commitment.periodStart === weekBounds.startKey),
    [commitments, weekBounds.startKey]
  )
  const todayCommitments = useMemo(
    () => commitments.filter((commitment) => commitment.periodType === 'day' && commitment.periodStart === todayBounds.startKey),
    [commitments, todayBounds.startKey]
  )

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs])

  const nextMilestones = useMemo(
    () => (milestones ?? [])
      .filter((milestone) => milestone.dueDate && milestone.status !== 'completed')
      .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
      .slice(0, 5)
      .map((milestone) => {
        const project = projectById.get(milestone.projectId)
        const program = project?.programId ? programById.get(project.programId) : null
        return {
          id: milestone.id,
          name: milestone.name,
          dueDate: milestone.dueDate,
          completed: milestone.completed || milestone.status === 'completed',
          color: project?.color || program?.color || '#38bdf8',
          projectId: project?.id ?? null,
          programId: program?.id ?? project?.programId ?? null,
          context: project ? `${program?.name ? `${program.name} · ` : ''}${project.name}` : program?.name || 'Milestone',
        }
      }),
    [milestones, projectById, programById]
  )

  const nextMilestone = nextMilestones[0] ?? null
  const flaggedPrograms = useMemo(
    () => programs.filter((program) => ['at-risk', 'off-track'].includes(allStats[program.id]?.health)),
    [programs, allStats]
  )
  const pulsePrograms = useMemo(
    () => [...programs]
      .sort((left, right) => {
        const leftStats = allStats[left.id] ?? {}
        const rightStats = allStats[right.id] ?? {}
        const score = (stats) => (stats.overdue ?? 0) * 3 + (stats.blocked ?? 0) * 2 + (stats.critical ?? 0)
        return score(rightStats) - score(leftStats)
      })
      .slice(0, 4),
    [programs, allStats]
  )

  const actionQueue = useMemo(
    () => [...openTasks]
      .sort((left, right) => {
        const leftScore = (left.status === 'blocked' ? 50 : 0) + (left.priority === 'critical' ? 30 : left.priority === 'high' ? 20 : 0) + (left.dueDate ? -new Date(left.dueDate).getTime() / 1e12 : 0)
        const rightScore = (right.status === 'blocked' ? 50 : 0) + (right.priority === 'critical' ? 30 : right.priority === 'high' ? 20 : 0) + (right.dueDate ? -new Date(right.dueDate).getTime() / 1e12 : 0)
        return rightScore - leftScore
      })
      .slice(0, 6),
    [openTasks]
  )

  const getTaskContext = (task) => {
    const project = task.projectId ? projectById.get(task.projectId) : null
    const programId = task.programId ?? project?.programId
    const program = programId ? programById.get(programId) : null
    if (project) return `${program?.name ? `${program.name} · ` : ''}${project.name}`
    if (program) return `${program.name} · Program task`
    return 'Standalone task'
  }

  const openTasksView = (drilldown = null) => {
    clearAnalyticsInsight()
    if (drilldown) setTaskDrilldown(drilldown)
    else clearTaskDrilldown()
    setPage('tasks')
  }

  const openPlanner = () => {
    clearTaskDrilldown()
    clearAnalyticsInsight()
    setPage('today')
  }

  const openPrograms = () => {
    clearTaskDrilldown()
    clearAnalyticsInsight()
    setPage('projects')
  }

  const openAnalytics = (insight) => {
    clearTaskDrilldown()
    setAnalyticsInsight(insight)
    setPage('program-dashboard')
  }

  if (programs.length === 0 && activeTasks.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
        <GlassCard padding="p-6" className="mt-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.1)' }}>
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Start with one program</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            The dashboard becomes useful once the first program, project, and tasks exist.
          </p>
          <button type="button" onClick={openPrograms} className="btn-accent mt-5 px-4 py-2 text-sm">
            Create program
          </button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
      <GlassCard padding="p-4 md:p-5" className="mt-2 mb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
              Command center
              <InfoTooltip text="Use Dashboard for quick pressure checks: launches, blocked work, unscheduled work, and the most important open tasks." widthClassName="w-72" />
            </div>
            <h1 className="mt-2 text-[1.7rem] md:text-[1.95rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              See the week, not the noise
            </h1>
            <p className="mt-2 text-sm max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              Review delivery pressure, launches, and next actions from one clean surface.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={openPlanner} className="btn-accent px-3 py-2 text-xs">
                Open planner
              </button>
              <button type="button" onClick={() => openTasksView('open')} className="btn-ghost px-3 py-2 text-xs">
                Open all tasks
              </button>
              <button type="button" onClick={() => {
                clearTaskDrilldown()
                clearAnalyticsInsight()
                setPage('timeline')
              }} className="btn-ghost px-3 py-2 text-xs">
                Open gantt
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 xl:w-[500px]">
            <StatPill label="Open work" value={openTasks.length} tone="accent" onClick={() => openTasksView('open')} />
            <StatPill label="This week" value={weekCommitments.length} tone="default" onClick={openPlanner} />
            <StatPill label="Next launch" value={nextMilestone ? formatShortDate(nextMilestone.dueDate) : 'None'} tone={nextMilestone ? 'success' : 'neutral'} onClick={() => openAnalytics('launch')} />
            <StatPill label="Risk" value={flaggedPrograms.length > 0 ? `${flaggedPrograms.length} flagged` : 'Stable'} tone={flaggedPrograms.length > 0 ? 'danger' : 'success'} onClick={() => openAnalytics('flagged')} />
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
        <SignalCard
          title="Overdue"
          value={overdueTasks.length}
          detail={overdueTasks.length > 0 ? 'Deadlines already slipped.' : 'No overdue work.'}
          tone={overdueTasks.length > 0 ? 'danger' : 'success'}
          icon={AlertTriangle}
          onClick={() => openTasksView('overdue')}
        />
        <SignalCard
          title="Blocked"
          value={blockedTasks.length}
          detail={blockedTasks.length > 0 ? 'Work waiting on unblock.' : 'Nothing blocked.'}
          tone={blockedTasks.length > 0 ? 'warning' : 'success'}
          icon={Clock3}
          onClick={() => openTasksView('blocked')}
        />
        <SignalCard
          title="Unscheduled"
          value={unscheduledTasks.length}
          detail={unscheduledTasks.length > 0 ? 'Missing start or due date.' : 'Scheduling is filled in.'}
          tone={unscheduledTasks.length > 0 ? 'warning' : 'neutral'}
          icon={CalendarClock}
          onClick={() => openTasksView('unscheduled')}
        />
        <SignalCard
          title="Critical"
          value={criticalTasks.length}
          detail={criticalTasks.length > 0 ? 'High-risk tasks still open.' : 'No critical work right now.'}
          tone={criticalTasks.length > 0 ? 'danger' : 'success'}
          icon={Target}
          onClick={() => openTasksView('critical')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr] mb-4">
        <GlassCard padding="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Launch watch
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Upcoming milestones
              </p>
            </div>
            <button type="button" onClick={() => openAnalytics('launch')} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Open analytics
            </button>
          </div>

          <div className="space-y-2">
            {nextMilestones.length === 0 ? (
              <div className="rounded-2xl px-3 py-4 text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                No milestone dates available yet.
              </div>
            ) : nextMilestones.map((milestone) => (
              <LaunchRow
                key={milestone.id}
                milestone={milestone}
                onOpen={() => {
                  if (milestone.programId) setActiveProgram(milestone.programId)
                  if (milestone.projectId) setActiveProject(milestone.projectId)
                  setPage('projects')
                }}
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard padding="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Planner pulse
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Work already committed
              </p>
            </div>
            <button type="button" onClick={openPlanner} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Open planner
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatPill label="Today" value={todayCommitments.length} tone="accent" onClick={openPlanner} />
            <StatPill label="Week" value={weekCommitments.length} tone="success" onClick={openPlanner} />
            <StatPill label="Programs" value={programs.length} tone="neutral" onClick={openPrograms} />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={openPlanner}
              className="w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/4"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Focus today</div>
                  <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {todayCommitments.length} tasks are already in today focus.
                  </div>
                </div>
                <ArrowRight size={13} style={{ color: 'var(--accent)' }} />
              </div>
            </button>
            <button
              type="button"
              onClick={openPlanner}
              className="w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/4"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Carry the week forward</div>
                  <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {weekCommitments.length} tasks are committed for the current week.
                  </div>
                </div>
                <ArrowRight size={13} style={{ color: 'var(--accent)' }} />
              </div>
            </button>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard padding="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Program pulse
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Which programs need attention
              </p>
            </div>
            <button type="button" onClick={() => openAnalytics('flagged')} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Open analytics
            </button>
          </div>

          <div className="space-y-2">
            {pulsePrograms.map((program) => (
              <ProgramPulseRow
                key={program.id}
                program={program}
                stats={allStats[program.id]}
                onOpen={() => {
                  setActiveProgram(program.id)
                  setPage('projects')
                }}
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard padding="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Action queue
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Open work most likely to move this week
              </p>
            </div>
            <button type="button" onClick={() => openTasksView('open')} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Open all tasks
            </button>
          </div>

          <div className="space-y-2">
            {actionQueue.map((task) => (
              <QueueRow
                key={task.id}
                task={task}
                context={getTaskContext(task)}
                onOpen={() => {
                  if (task.projectId) setActiveProject(task.projectId)
                  else if (task.programId) setActiveProgram(task.programId)
                  openTasksView('open')
                  selectTask(task.id)
                }}
              />
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
})

export default Dashboard
