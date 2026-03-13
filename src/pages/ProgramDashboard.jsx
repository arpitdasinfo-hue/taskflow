import { memo } from 'react'
import { BarChart3, CheckCircle2, Clock, AlertTriangle, TrendingUp, Milestone, ArrowRight } from 'lucide-react'
import Header from '../components/layout/Header'
import { ProgramStatusBadge, ProgramHealthBadge } from '../components/common/ProgramStatusBadge'
import TimelinePlanningPanel from '../components/timeline/TimelinePlanningPanel'
import useTaskStore from '../store/useTaskStore'
import useTimelineIntelligence from '../hooks/useTimelineIntelligence'
import { useAllProgramStats } from '../hooks/useProgramStats'
import useProjectStore from '../store/useProjectStore'
import useSettingsStore from '../store/useSettingsStore'

// ── Stat pill ─────────────────────────────────────────────────────────────────
const Stat = memo(function Stat({ label, value, color, icon: Icon }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex items-center gap-1">
        {Icon && <Icon size={11} style={{ color }} />}
        <span className="text-lg font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</span>
      </div>
    </div>
  )
})

// ── Milestone row ─────────────────────────────────────────────────────────────
const MilestoneItem = memo(function MilestoneItem({ milestone, projectColor }) {
  const now = new Date()
  const isOverdue = milestone.dueDate && new Date(milestone.dueDate) < now && milestone.status !== 'completed'
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm" style={{ color: milestone.status === 'completed' ? '#10b981' : isOverdue ? '#ef4444' : projectColor || 'var(--accent)' }}>
        ◆
      </span>
      <span className="flex-1 text-xs truncate"
        style={{ color: 'var(--text-primary)', textDecoration: milestone.status === 'completed' ? 'line-through' : 'none' }}>
        {milestone.name}
      </span>
      {milestone.dueDate && (
        <span className="text-[10px] flex-shrink-0"
          style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
          {new Date(milestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  )
})

// ── Program card ─────────────────────────────────────────────────────────────
const ProgramCard = memo(function ProgramCard({ program, stats }) {
  const setPage          = useSettingsStore((s) => s.setPage)
  const setActiveProgram = useSettingsStore((s) => s.setActiveProgram)

  const handleViewTasks = () => {
    setActiveProgram(program.id)
    setPage('tasks')
  }

  const upcomingMilestones = stats.upcomingMilestones ?? []

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${program.color}25` }}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3" style={{ background: `${program.color}08`, borderBottom: `1px solid ${program.color}18` }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: program.color, boxShadow: `0 0 8px ${program.color}60` }} />
            <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{program.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ProgramStatusBadge status={program.status || 'planning'} />
            <ProgramHealthBadge health={stats.health} />
          </div>
        </div>

        {program.description && (
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{program.description}</p>
        )}

        {/* Completion bar */}
        <div className="mb-1">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
            <span>{stats.done} of {stats.total} tasks</span>
            <span style={{ color: program.color, fontWeight: 600 }}>{stats.completion}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${stats.completion}%`, background: `linear-gradient(90deg, ${program.color}60, ${program.color})` }} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-5 py-3 grid grid-cols-4 gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <Stat label="Active" value={stats.inProgress} color="#22d3ee" icon={Clock} />
        <Stat label="Done" value={stats.done} color="#10b981" icon={CheckCircle2} />
        <Stat label="Blocked" value={stats.blocked} color={stats.blocked > 0 ? '#ef4444' : undefined} icon={stats.blocked > 0 ? AlertTriangle : undefined} />
        <Stat label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? '#ef4444' : undefined} />
      </div>

      {/* Upcoming milestones */}
      {upcomingMilestones.length > 0 && (
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
            Upcoming Milestones
          </p>
          <div className="space-y-0.5">
            {upcomingMilestones.slice(0, 3).map((m) => (
              <MilestoneItem key={m.id} milestone={m} projectColor={program.color} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {stats.projectCount} project{stats.projectCount !== 1 ? 's' : ''}
          {stats.critical > 0 && <span style={{ color: '#ef4444' }}> · {stats.critical} critical</span>}
        </span>
        <button onClick={handleViewTasks}
          className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent)' }}>
          View tasks <ArrowRight size={10} />
        </button>
      </div>
    </div>
  )
})

// ── Overall summary ───────────────────────────────────────────────────────────
const OverallSummary = memo(function OverallSummary({ allStats, programs }) {
  const total    = Object.values(allStats).reduce((s, st) => s + st.total, 0)
  const done     = Object.values(allStats).reduce((s, st) => s + st.done, 0)
  const overdue  = Object.values(allStats).reduce((s, st) => s + st.overdue, 0)
  const completion = total ? Math.round((done / total) * 100) : 0

  const atRisk    = programs.filter((p) => allStats[p.id]?.health === 'at-risk').length
  const offTrack  = programs.filter((p) => allStats[p.id]?.health === 'off-track').length

  return (
    <div className="rounded-2xl p-5 mb-6"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--accent-rgb),0.15)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
          <BarChart3 size={14} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Portfolio Overview</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Total Tasks</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{total}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Completed</p>
          <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{done}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Overdue</p>
          <p className="text-2xl font-bold" style={{ color: overdue > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{overdue}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Portfolio Health</p>
          <p className="text-sm font-semibold mt-1"
            style={{ color: offTrack > 0 ? '#ef4444' : atRisk > 0 ? '#f59e0b' : '#10b981' }}>
            {offTrack > 0 ? `${offTrack} off-track` : atRisk > 0 ? `${atRisk} at-risk` : 'On track'}
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[10px] mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          <span>Portfolio Completion</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{completion}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${completion}%`, background: 'linear-gradient(90deg, var(--accent-dark), var(--accent))' }} />
        </div>
      </div>
    </div>
  )
})

// ── Program Dashboard page ────────────────────────────────────────────────────
const ProgramDashboard = memo(function ProgramDashboard() {
  const programs  = useProjectStore((s) => s.programs)
  const projects  = useProjectStore((s) => s.projects)
  const tasks     = useTaskStore((s) => s.tasks)
  const setPage   = useSettingsStore((s) => s.setPage)
  const setGanttConfig = useSettingsStore((s) => s.setGanttConfig)
  const allStats  = useAllProgramStats()
  const insights  = useTimelineIntelligence({
    programs,
    projects,
    tasks,
    filteredProgramIds: new Set(),
    filteredProjectIds: new Set(),
    filteredSubProjectIds: new Set(),
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">

        {programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.1)' }}>
              <TrendingUp size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No programs yet</p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              Create programs in the Projects page to see your portfolio overview here.
            </p>
          </div>
        ) : (
          <>
            <OverallSummary allStats={allStats} programs={programs} />

            <div className="grid gap-4 md:grid-cols-2">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  stats={allStats[program.id] || { total: 0, done: 0, inProgress: 0, blocked: 0, overdue: 0, critical: 0, completion: 0, projectCount: 0, health: 'on-track', upcomingMilestones: [] }}
                />
              ))}
            </div>

            <TimelinePlanningPanel
              showSavedViews={false}
              insights={insights}
              onOpenRiskView={() => {
                setGanttConfig({
                  viewMode: 'risk',
                  showDependencies: true,
                  onlyDelayed: true,
                  onlyCritical: true,
                  onlyDependencyRisk: true,
                })
                setPage('timeline')
              }}
              onExpandAll={() => {
                setGanttConfig({
                  expandedProjectIds: projects
                    .filter((project) => tasks.some((task) => task.projectId === project.id))
                    .map((project) => project.id),
                })
                setPage('timeline')
              }}
            />
          </>
        )}
      </div>
    </div>
  )
})

export default ProgramDashboard
