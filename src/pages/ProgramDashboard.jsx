import { memo, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, CalendarClock, ArrowRight, Flag, FolderClock } from 'lucide-react'
import Header from '../components/layout/Header'
import { ProgramStatusBadge, ProgramHealthBadge } from '../components/common/ProgramStatusBadge'
import GlassCard from '../components/common/GlassCard'
import MilestoneTimeline from '../components/common/MilestoneTimeline'
import PageHero from '../components/common/PageHero'
import ScopeBar from '../components/common/ScopeBar'
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

const ReviewFocusCard = memo(function ReviewFocusCard({ label, value, detail, tone = 'neutral', icon: Icon }) {
  const palette = tone === 'danger'
    ? { background: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)', color: '#ef4444' }
    : tone === 'warning'
      ? { background: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.24)', color: '#f59e0b' }
      : tone === 'accent'
        ? { background: 'rgba(var(--accent-rgb),0.12)', border: 'rgba(var(--accent-rgb),0.2)', color: 'var(--accent)' }
        : { background: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }

  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{ background: palette.background, border: `1px solid ${palette.border}` }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: palette.color }} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold leading-none" style={{ color: palette.color }}>{value}</div>
      <p className="mt-2 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
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

// ── Program Dashboard page ────────────────────────────────────────────────────
const ProgramDashboard = memo(function ProgramDashboard() {
  const programs  = useProjectStore((s) => s.programs)
  const projects  = useProjectStore((s) => s.projects)
  const milestones = useProjectStore((s) => s.milestones)
  const tasks     = useTaskStore((s) => s.tasks)
  const setPage   = useSettingsStore((s) => s.setPage)
  const setGanttConfig = useSettingsStore((s) => s.setGanttConfig)
  const allStats  = useAllProgramStats()
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const insights  = useTimelineIntelligence({
    programs,
    projects,
    tasks,
    filteredProgramIds: new Set(selectedProgramId ? [selectedProgramId] : []),
    filteredProjectIds: new Set(selectedProjectId ? [selectedProjectId] : []),
    filteredSubProjectIds: new Set(),
  })
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const visibleProjects = useMemo(
    () => selectedProgramId ? projects.filter((project) => project.programId === selectedProgramId) : projects,
    [projects, selectedProgramId]
  )

  useEffect(() => {
    if (!selectedProgramId) return
    if (!programs.some((program) => program.id === selectedProgramId)) {
      setSelectedProgramId('')
      setSelectedProjectId('')
    }
  }, [selectedProgramId, programs])

  useEffect(() => {
    if (!selectedProjectId) return
    if (!visibleProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId('')
    }
  }, [selectedProjectId, visibleProjects])

  const scopedProjects = useMemo(() => {
    let scoped = projects
    if (selectedProgramId) scoped = scoped.filter((project) => project.programId === selectedProgramId)
    if (!selectedProjectId) return scoped

    const selected = scoped.find((project) => project.id === selectedProjectId)
    if (!selected) return []

    const scopedIds = new Set([selected.id])
    if (!selected.parentId) {
      scoped.filter((project) => project.parentId === selected.id).forEach((project) => scopedIds.add(project.id))
    } else {
      scopedIds.add(selected.parentId)
    }
    return scoped.filter((project) => scopedIds.has(project.id))
  }, [projects, selectedProgramId, selectedProjectId])

  const scopedProgramIds = useMemo(
    () => new Set(scopedProjects.map((project) => project.programId).filter(Boolean)),
    [scopedProjects]
  )

  const scopedPrograms = useMemo(() => {
    if (selectedProgramId) return programs.filter((program) => program.id === selectedProgramId)
    if (!selectedProjectId) return programs
    return programs.filter((program) => scopedProgramIds.has(program.id))
  }, [programs, scopedProgramIds, selectedProgramId, selectedProjectId])

  const scopedProjectIds = useMemo(() => new Set(scopedProjects.map((project) => project.id)), [scopedProjects])

  const scopedTasks = useMemo(() => {
    if (selectedProjectId) {
      return tasks.filter((task) => task.projectId && scopedProjectIds.has(task.projectId))
    }
    if (selectedProgramId) {
      return tasks.filter((task) => {
        const taskProgramId = task.programId ?? (task.projectId ? projectById.get(task.projectId)?.programId : null)
        return taskProgramId === selectedProgramId
      })
    }
    return tasks
  }, [tasks, selectedProgramId, selectedProjectId, scopedProjectIds, projectById])

  const scopedMilestones = useMemo(
    () => milestones.filter((milestone) => milestone.projectId && scopedProjectIds.has(milestone.projectId)),
    [milestones, scopedProjectIds]
  )

  const summary = useMemo(() => {
    const total = scopedTasks.length
    const done = scopedTasks.filter((task) => task.status === 'done').length
    const overdue = scopedTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done').length
    const completion = total ? Math.round((done / total) * 100) : 0
    const atRisk = scopedPrograms.filter((program) => allStats[program.id]?.health === 'at-risk').length
    const offTrack = scopedPrograms.filter((program) => allStats[program.id]?.health === 'off-track').length
    return { total, done, overdue, completion, atRisk, offTrack }
  }, [scopedTasks, scopedPrograms, allStats])

  const milestoneTimelineItems = useMemo(
    () => scopedMilestones
      .filter((milestone) => milestone.dueDate)
      .map((milestone) => {
        const project = milestone.projectId ? projectById.get(milestone.projectId) : null
        const program = project?.programId ? programs.find((entry) => entry.id === project.programId) : null
        return {
          id: milestone.id,
          name: milestone.name,
          dueDate: milestone.dueDate,
          completed: milestone.completed || milestone.status === 'completed',
          color: project?.color || program?.color || '#38bdf8',
          context: project ? `${program?.name ? `${program.name} · ` : ''}${project.name}` : program?.name || 'Unassigned',
        }
      }),
    [scopedMilestones, projectById, programs]
  )

  const scopedProgramCards = useMemo(
    () => scopedPrograms.map((program) => {
      const programProjects = scopedProjects.filter((project) => project.programId === program.id)
      const programProjectIds = new Set(programProjects.map((project) => project.id))
      const programTasks = scopedTasks.filter((task) => {
        const taskProgramId = task.programId ?? (task.projectId ? projectById.get(task.projectId)?.programId : null)
        return taskProgramId === program.id && (!task.projectId || programProjectIds.has(task.projectId))
      })
      const programMilestones = scopedMilestones.filter((milestone) => milestone.projectId && programProjectIds.has(milestone.projectId))
      const done = programTasks.filter((task) => task.status === 'done').length
      return {
        program,
        stats: {
          total: programTasks.length,
          done,
          inProgress: programTasks.filter((task) => task.status === 'in-progress').length,
          blocked: programTasks.filter((task) => task.status === 'blocked').length,
          overdue: programTasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done').length,
          critical: programTasks.filter((task) => task.priority === 'critical').length,
          completion: programTasks.length ? Math.round((done / programTasks.length) * 100) : 0,
          projectCount: programProjects.filter((project) => !project.parentId).length,
          health: allStats[program.id]?.health ?? 'on-track',
          upcomingMilestones: programMilestones
            .filter((milestone) => milestone.status !== 'completed' && milestone.dueDate)
            .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
            .slice(0, 3),
        },
      }
    }),
    [scopedPrograms, scopedProjects, scopedTasks, scopedMilestones, projectById, allStats]
  )

  const nextMilestone = milestoneTimelineItems[0] ?? null
  const flaggedPrograms = scopedProgramCards.filter(({ stats }) => ['at-risk', 'off-track'].includes(stats.health)).length
  const launchCount = milestoneTimelineItems.length

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
            <PageHero
              eyebrow="Analytics"
              title="Review delivery with the signals that change the next decision"
              description="Start with launch timing, missing schedules, and flagged workstreams before you drop into detailed roll-ups."
              compact
              stats={[
                { label: 'Programs', value: scopedPrograms.length, tone: 'accent' },
                { label: 'Tasks', value: summary.total, tone: 'default' },
                { label: 'Overdue', value: summary.overdue, tone: summary.overdue > 0 ? 'danger' : 'default' },
                { label: 'Launches', value: launchCount, tone: launchCount > 0 ? 'success' : 'default' },
              ]}
            >
              <div className="max-w-2xl">
                <div className="flex justify-between text-[11px] mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <span>Portfolio completion</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{summary.completion}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${summary.completion}%`, background: 'linear-gradient(90deg, var(--accent-dark), var(--accent))' }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {summary.offTrack > 0 ? `${summary.offTrack} off track` : summary.atRisk > 0 ? `${summary.atRisk} at risk` : 'Portfolio stable'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {nextMilestone ? `Next launch ${nextMilestone.name} · ${new Date(nextMilestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No launch date pinned yet'}
                  </span>
                </div>
              </div>
            </PageHero>

            <ScopeBar
              eyebrow="Analytics scope"
              title="Keep this review tight"
              description="Cut the portfolio to one program or one project before you look at signals."
              compact
              controls={
                <>
                  <select
                    value={selectedProgramId}
                    onChange={(event) => {
                      setSelectedProgramId(event.target.value)
                      setSelectedProjectId('')
                    }}
                    className="text-xs px-3 py-2 rounded-xl min-w-[180px]"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                    <option value="">All programs</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedProjectId}
                    onChange={(event) => {
                      const nextProjectId = event.target.value
                      setSelectedProjectId(nextProjectId)
                      if (!nextProjectId) return
                      const project = projectById.get(nextProjectId)
                      if (project?.programId && project.programId !== selectedProgramId) {
                        setSelectedProgramId(project.programId)
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-xl min-w-[220px]"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                    <option value="">All projects</option>
                    {visibleProjects.map((project) => {
                      const parent = project.parentId ? projectById.get(project.parentId) : null
                      const label = parent ? `${parent.name} / ${project.name}` : project.name
                      return <option key={project.id} value={project.id}>{label}</option>
                    })}
                  </select>
                </>
              }
              actions={
                (selectedProgramId || selectedProjectId) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProgramId('')
                      setSelectedProjectId('')
                    }}
                    className="px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Clear scope
                  </button>
                ) : null
              }
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ReviewFocusCard
                label="Flagged programs"
                value={flaggedPrograms}
                detail={flaggedPrograms > 0 ? 'Programs showing overdue work or blocked flow.' : 'No program is currently flagged.'}
                tone={flaggedPrograms > 0 ? 'danger' : 'accent'}
                icon={Flag}
              />
              <ReviewFocusCard
                label="Schedule conflicts"
                value={insights.cards.find((card) => card.id === 'conflicts')?.value ?? 0}
                detail="Dates that invert task or project windows."
                tone={(insights.cards.find((card) => card.id === 'conflicts')?.value ?? 0) > 0 ? 'danger' : 'neutral'}
                icon={AlertTriangle}
              />
              <ReviewFocusCard
                label="Unscheduled"
                value={insights.cards.find((card) => card.id === 'unscheduled')?.value ?? 0}
                detail="Tasks still missing a full start and due range."
                tone={(insights.cards.find((card) => card.id === 'unscheduled')?.value ?? 0) > 0 ? 'warning' : 'neutral'}
                icon={FolderClock}
              />
              <ReviewFocusCard
                label="Next launch"
                value={nextMilestone ? new Date(nextMilestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                detail={nextMilestone ? nextMilestone.name : 'No upcoming milestone in scope.'}
                tone={nextMilestone ? 'accent' : 'neutral'}
                icon={CalendarClock}
              />
            </div>

            <GlassCard padding="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}>
                  <CalendarClock size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Milestone Timeline</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Zoomed-out launch view of the next checkpoints across programs.
                  </p>
                </div>
              </div>
              <MilestoneTimeline milestones={milestoneTimelineItems} />
            </GlassCard>

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

            <div className="grid gap-4 md:grid-cols-2">
              {scopedProgramCards.map(({ program, stats }) => (
                <ProgramCard key={program.id} program={program} stats={stats} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
})

export default ProgramDashboard
