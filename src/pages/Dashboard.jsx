import { memo, useMemo } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock3, FolderKanban, Sparkles, Target } from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import PageHero from '../components/common/PageHero'
import MilestoneTimeline from '../components/common/MilestoneTimeline'
import useSettingsStore from '../store/useSettingsStore'
import useProjectStore from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'
import usePlanningStore from '../store/usePlanningStore'
import { useAllProgramStats } from '../hooks/useProgramStats'
import { getPeriodBounds } from '../lib/planning'

const formatShortDate = (value) => {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const tonePalette = {
  neutral: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' },
  accent: { bg: 'rgba(var(--accent-rgb),0.12)', border: 'rgba(var(--accent-rgb),0.2)', color: 'var(--accent)' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.22)', color: '#f59e0b' },
  danger: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.22)', color: '#ef4444' },
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.22)', color: '#10b981' },
}

const DecisionCard = memo(function DecisionCard({ title, value, detail, tone = 'neutral', icon: Icon, onClick }) {
  const palette = tonePalette[tone] ?? tonePalette.neutral

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-[24px] p-4 transition-transform hover:-translate-y-0.5"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: `${palette.color}18`, border: `1px solid ${palette.color}22` }}
        >
          <Icon size={16} style={{ color: palette.color }} />
        </div>
        <ArrowRight size={13} style={{ color: 'var(--text-secondary)' }} />
      </div>
      <div className="mt-4 text-2xl font-bold leading-none" style={{ color: palette.color }}>{value}</div>
      <div className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</div>
      <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
    </button>
  )
})

const ProgramPulseCard = memo(function ProgramPulseCard({ program, stats, onOpen }) {
  const tone = stats.health === 'off-track' ? 'danger' : stats.health === 'at-risk' ? 'warning' : 'accent'
  const palette = tonePalette[tone]

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-[24px] p-4 transition-transform hover:-translate-y-0.5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: program.color }} />
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{program.name}</span>
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {stats.projectCount} projects · {stats.total} tasks
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}>
          {stats.health === 'off-track' ? 'Off track' : stats.health === 'at-risk' ? 'At risk' : 'On track'}
        </span>
      </div>

      <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${stats.completion}%`, background: `linear-gradient(90deg, ${program.color}88, ${program.color})` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="font-semibold" style={{ color: stats.overdue > 0 ? '#ef4444' : 'var(--text-primary)' }}>{stats.overdue}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Overdue</div>
        </div>
        <div>
          <div className="font-semibold" style={{ color: stats.blocked > 0 ? '#f59e0b' : 'var(--text-primary)' }}>{stats.blocked}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Blocked</div>
        </div>
        <div>
          <div className="font-semibold" style={{ color: stats.critical > 0 ? '#ef4444' : 'var(--text-primary)' }}>{stats.critical}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Critical</div>
        </div>
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

const Dashboard = memo(function Dashboard() {
  const setPage = useSettingsStore((state) => state.setPage)
  const setActiveProgram = useSettingsStore((state) => state.setActiveProgram)
  const setActiveProject = useSettingsStore((state) => state.setActiveProject)
  const selectTask = useSettingsStore((state) => state.selectTask)
  const programs = useProjectStore((state) => state.programs)
  const projects = useProjectStore((state) => state.projects)
  const milestones = useProjectStore((state) => state.milestones)
  const tasks = useTaskStore((state) => state.tasks)
  const commitments = usePlanningStore((state) => state.commitments)
  const allStats = useAllProgramStats()

  const activeTasks = useMemo(() => tasks.filter((task) => !task.deletedAt), [tasks])
  const openTasks = useMemo(() => activeTasks.filter((task) => task.status !== 'done'), [activeTasks])
  const overdueTasks = useMemo(
    () => openTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date()),
    [openTasks]
  )
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

  const milestoneTimelineItems = useMemo(
    () => (milestones ?? [])
      .filter((milestone) => milestone.dueDate && milestone.status !== 'completed')
      .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
      .slice(0, 8)
      .map((milestone) => {
        const project = projectById.get(milestone.projectId)
        const program = project?.programId ? programById.get(project.programId) : null
        return {
          id: milestone.id,
          name: milestone.name,
          dueDate: milestone.dueDate,
          completed: milestone.completed || milestone.status === 'completed',
          color: project?.color || program?.color || '#38bdf8',
          context: project ? `${program?.name ? `${program.name} · ` : ''}${project.name}` : program?.name || 'Milestone',
        }
      }),
    [milestones, projectById, programById]
  )

  const nextMilestone = milestoneTimelineItems[0] ?? null
  const atRiskPrograms = useMemo(
    () => programs.filter((program) => ['at-risk', 'off-track'].includes(allStats[program.id]?.health)).length,
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
      .slice(0, 3),
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
          <button
            type="button"
            onClick={() => setPage('projects')}
            className="btn-accent mt-5 px-4 py-2 text-sm"
          >
            Create program
          </button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
      <div className="py-2 mb-4">
        <PageHero
          eyebrow="Command center"
          title="What needs attention now"
          description="Start from delivery pressure, launch timing, and planned commitments instead of hunting through pages."
          compact
          stats={[
            { label: 'Open work', value: openTasks.length, tone: 'accent' },
            { label: 'This week', value: weekCommitments.length, tone: 'default' },
            { label: 'Next launch', value: nextMilestone ? formatShortDate(nextMilestone.dueDate) : 'None', tone: nextMilestone ? 'success' : 'default' },
            { label: 'Risk', value: atRiskPrograms > 0 ? `${atRiskPrograms} flagged` : 'Stable', tone: atRiskPrograms > 0 ? 'danger' : 'success' },
          ]}
          actions={
            <>
              <button type="button" onClick={() => setPage('today')} className="btn-ghost px-3 py-2 text-xs">
                Open planner
              </button>
              <button type="button" onClick={() => setPage('timeline')} className="btn-accent px-3 py-2 text-xs">
                Open gantt
              </button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {todayCommitments.length} in focus today
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {overdueTasks.length} overdue
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {blockedTasks.length} blocked
            </span>
          </div>
        </PageHero>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
        <DecisionCard
          title="Overdue tasks"
          value={overdueTasks.length}
          detail={overdueTasks.length > 0 ? 'Review deadlines that already slipped.' : 'No work has slipped today.'}
          tone={overdueTasks.length > 0 ? 'danger' : 'success'}
          icon={AlertTriangle}
          onClick={() => setPage('tasks')}
        />
        <DecisionCard
          title="Blocked tasks"
          value={blockedTasks.length}
          detail={blockedTasks.length > 0 ? 'Unblock these first to restart flow.' : 'No blocked work right now.'}
          tone={blockedTasks.length > 0 ? 'warning' : 'success'}
          icon={Clock3}
          onClick={() => setPage('tasks')}
        />
        <DecisionCard
          title="Unscheduled work"
          value={unscheduledTasks.length}
          detail={unscheduledTasks.length > 0 ? 'Tasks still need both start and due dates.' : 'Schedules are filled in.'}
          tone={unscheduledTasks.length > 0 ? 'warning' : 'neutral'}
          icon={CalendarClock}
          onClick={() => setPage('timeline')}
        />
        <DecisionCard
          title="Critical work"
          value={criticalTasks.length}
          detail={criticalTasks.length > 0 ? 'High-risk work still open.' : 'No critical tasks need action.'}
          tone={criticalTasks.length > 0 ? 'danger' : 'success'}
          icon={Target}
          onClick={() => setPage('tasks')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr] mb-4">
        <GlassCard padding="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Upcoming launches
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Milestones coming up next
              </p>
            </div>
            <button type="button" onClick={() => setPage('program-dashboard')} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              View analytics
            </button>
          </div>
          <MilestoneTimeline milestones={milestoneTimelineItems} compact />
        </GlassCard>

        <GlassCard padding="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.12)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Planner pulse</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Commitments already in motion this week.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>Today</div>
              <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--accent)' }}>{todayCommitments.length}</div>
            </div>
            <div className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>Week</div>
              <div className="mt-2 text-2xl font-bold" style={{ color: '#10b981' }}>{weekCommitments.length}</div>
            </div>
            <div className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>Programs</div>
              <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{programs.length}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPage('today')}
            className="w-full rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/4"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Open planner</div>
                <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>Review today focus, this week, and carry-forward in one place.</div>
              </div>
              <ArrowRight size={13} style={{ color: 'var(--accent)' }} />
            </div>
          </button>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
        <GlassCard padding="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Program pulse
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Which workstreams need leadership attention
              </p>
            </div>
            <button type="button" onClick={() => setPage('program-dashboard')} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              Open analytics
            </button>
          </div>
          <div className="space-y-3">
            {pulsePrograms.map((program) => (
              <ProgramPulseCard
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

        <GlassCard padding="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                Action queue
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Open work most likely to move the week
              </p>
            </div>
            <button type="button" onClick={() => setPage('tasks')} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
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
                  setPage('tasks')
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
