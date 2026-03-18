import { memo, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, CalendarClock, ArrowRight, Flag, FolderClock } from 'lucide-react'
import Header from '../components/layout/Header'
import { ProgramStatusBadge, ProgramHealthBadge } from '../components/common/ProgramStatusBadge'
import GlassCard from '../components/common/GlassCard'
import InfoTooltip from '../components/common/InfoTooltip'
import MilestoneTimeline from '../components/common/MilestoneTimeline'
import PageHero from '../components/common/PageHero'
import ScopeBar from '../components/common/ScopeBar'
import useTimelineIntelligence from '../hooks/useTimelineIntelligence'
import { useAllProgramStats } from '../hooks/useProgramStats'
import useSettingsStore from '../store/useSettingsStore'
import useWorkspaceScopedData from '../hooks/useWorkspaceScopedData'

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

const ReviewFocusCard = memo(function ReviewFocusCard({ label, value, detail, tone = 'neutral', icon: Icon, onClick, active = false }) {
  const palette = tone === 'danger'
    ? { background: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)', color: '#ef4444' }
    : tone === 'warning'
      ? { background: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.24)', color: '#f59e0b' }
      : tone === 'accent'
        ? { background: 'rgba(var(--accent-rgb),0.12)', border: 'rgba(var(--accent-rgb),0.2)', color: 'var(--accent)' }
        : { background: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl px-4 py-4 text-left transition-transform hover:-translate-y-0.5"
      style={{
        background: palette.background,
        border: `1px solid ${active ? palette.color : palette.border}`,
        boxShadow: active ? `0 0 0 1px ${palette.color}24` : 'none',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: palette.color }} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold leading-none" style={{ color: palette.color }}>{value}</div>
      <p className="mt-2 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
    </button>
  )
})

const ReviewDetailShell = memo(function ReviewDetailShell({ title, infoText, actions = null, children }) {
  return (
    <GlassCard padding="p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
              Review detail
            </p>
            <InfoTooltip text={infoText} align="right" widthClassName="w-72" />
          </div>
          <h3 className="mt-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap md:justify-end">{actions}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </GlassCard>
  )
})

const InsightRow = memo(function InsightRow({ title, meta, tone = 'default', onClick }) {
  const toneColor = tone === 'danger'
    ? '#ef4444'
    : tone === 'warning'
      ? '#f59e0b'
      : tone === 'accent'
        ? 'var(--accent)'
        : 'var(--text-primary)'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/4"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: toneColor }}>{title}</div>
        {meta && (
          <div className="mt-1 text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {meta}
          </div>
        )}
      </div>
      <ArrowRight size={13} style={{ color: 'var(--text-secondary)' }} />
    </button>
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
  const { programs, projects, milestones, tasks } = useWorkspaceScopedData()
  const setPage   = useSettingsStore((s) => s.setPage)
  const selectTask = useSettingsStore((s) => s.selectTask)
  const setActiveProgram = useSettingsStore((s) => s.setActiveProgram)
  const setActiveProject = useSettingsStore((s) => s.setActiveProject)
  const setGanttConfig = useSettingsStore((s) => s.setGanttConfig)
  const analyticsInsight = useSettingsStore((s) => s.analyticsInsight)
  const setAnalyticsInsight = useSettingsStore((s) => s.setAnalyticsInsight)
  const clearAnalyticsInsight = useSettingsStore((s) => s.clearAnalyticsInsight)
  const setTaskDrilldown = useSettingsStore((s) => s.setTaskDrilldown)
  const clearTaskDrilldown = useSettingsStore((s) => s.clearTaskDrilldown)
  const allStats  = useAllProgramStats({ programs, projects, milestones, tasks })
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const activeInsight = analyticsInsight || 'launch'
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

  const milestoneTimelineItems = useMemo(
    () => scopedMilestones
      .filter((milestone) => milestone.dueDate)
      .map((milestone) => {
        const project = milestone.projectId ? projectById.get(milestone.projectId) : null
        const program = project?.programId ? programs.find((entry) => entry.id === project.programId) : null
        return {
          id: milestone.id,
          name: milestone.name,
          projectId: milestone.projectId,
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
  const flaggedProgramCards = useMemo(
    () => scopedProgramCards.filter(({ stats }) => ['at-risk', 'off-track'].includes(stats.health)),
    [scopedProgramCards]
  )
  const flaggedPrograms = flaggedProgramCards.length
  const scopedOpenTasks = useMemo(
    () => scopedTasks.filter((task) => task.status !== 'done'),
    [scopedTasks]
  )
  const actionQueue = useMemo(
    () => [...scopedOpenTasks]
      .sort((left, right) => {
        const score = (task) => {
          let value = 0
          if (task.status === 'blocked') value += 50
          if (task.priority === 'critical') value += 30
          else if (task.priority === 'high') value += 20
          else if (task.priority === 'medium') value += 10
          if (task.dueDate) value += Math.max(0, 40 - Math.round((new Date(task.dueDate) - new Date()) / 86400000))
          return value
        }
        return score(right) - score(left)
      })
      .slice(0, 8),
    [scopedOpenTasks]
  )

  const openRiskView = () => {
    clearTaskDrilldown()
    setGanttConfig({
      viewMode: 'risk',
      showDependencies: true,
      onlyDelayed: true,
      onlyCritical: true,
      onlyDependencyRisk: true,
    })
    setPage('timeline')
  }

  const expandAllInTimeline = () => {
    clearTaskDrilldown()
    setGanttConfig({
      expandedProjectIds: projects
        .filter((project) => tasks.some((task) => task.projectId === project.id))
        .map((project) => project.id),
    })
    setPage('timeline')
  }

  const openTaskDetails = (taskId) => {
    clearTaskDrilldown()
    selectTask(taskId)
  }

  const openProgramWorkspace = (programId) => {
    clearAnalyticsInsight()
    clearTaskDrilldown()
    setActiveProgram(programId)
    setPage('projects')
  }

  const openProjectWorkspace = (projectId) => {
    clearAnalyticsInsight()
    clearTaskDrilldown()
    setActiveProject(projectId)
    setPage('projects')
  }

  const openTaskList = (drilldown = null) => {
    clearAnalyticsInsight()
    if (drilldown) setTaskDrilldown(drilldown)
    else clearTaskDrilldown()
    setPage('tasks')
  }

  const getTaskContext = (task) => {
    const project = task.projectId ? projectById.get(task.projectId) : null
    const programId = task.programId ?? project?.programId
    const program = programId ? programs.find((entry) => entry.id === programId) : null
    if (project) return `${program?.name ? `${program.name} · ` : ''}${project.name}`
    if (program) return `${program.name} · Program task`
    return 'Standalone task'
  }

  const reviewDetail = useMemo(() => {
    if (activeInsight === 'programs') {
      return {
        title: 'Programs in scope',
        infoText: 'Use this to jump into the specific workstream that needs a structure or delivery review.',
        actions: null,
        content: (
          scopedProgramCards.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {scopedProgramCards.map(({ program, stats }) => (
                <ProgramCard key={program.id} program={program} stats={stats} />
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No programs match the current scope.</div>
          )
        ),
      }
    }

    if (activeInsight === 'tasks') {
      return {
        title: 'Open tasks in scope',
        infoText: 'This queue keeps only live execution items so you can move directly from review into action.',
        actions: (
            <button
              type="button"
              onClick={() => openTaskList('open')}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}
            >
            Open All Tasks
          </button>
        ),
        content: (
          actionQueue.length > 0 ? (
            <div className="space-y-2">
              {actionQueue.map((task) => (
                <QueueRow key={task.id} task={task} context={getTaskContext(task)} onOpen={() => openTaskDetails(task.id)} />
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No open tasks in this scope.</div>
          )
        ),
      }
    }

    if (activeInsight === 'flagged') {
      return {
        title: 'Flagged programs',
        infoText: 'These programs have enough overdue or blocked pressure to warrant a structure-level review.',
        actions: flaggedPrograms > 0 ? (
          <button
            type="button"
            onClick={openRiskView}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#fda4af', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            Open risk view
          </button>
        ) : null,
        content: (
          flaggedProgramCards.length > 0 ? (
            <div className="space-y-2">
              {flaggedProgramCards.map(({ program, stats }) => (
                <InsightRow
                  key={program.id}
                  title={program.name}
                  meta={`${stats.projectCount} projects · ${stats.total} tasks · ${stats.overdue} overdue · ${stats.blocked} blocked`}
                  tone={stats.health === 'off-track' ? 'danger' : 'warning'}
                  onClick={() => openProgramWorkspace(program.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No flagged programs in this scope.</div>
          )
        ),
      }
    }

    if (activeInsight === 'conflicts') {
      return {
        title: 'Schedule conflicts',
        infoText: 'These items have incompatible dates and should be corrected before the plan is trusted.',
        actions: (
          <button
            type="button"
            onClick={openRiskView}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#fda4af', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            Open risk view
          </button>
        ),
        content: (
          insights.scheduleConflicts.length > 0 ? (
            <div className="space-y-2">
              {insights.scheduleConflicts.slice(0, 8).map((issue) => (
                <InsightRow
                  key={issue.id}
                  title={issue.title}
                  meta={issue.detail}
                  tone={issue.severity === 'high' ? 'danger' : 'warning'}
                  onClick={openRiskView}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No schedule conflicts in this scope.</div>
          )
        ),
      }
    }

    if (activeInsight === 'unscheduled') {
      return {
        title: 'Tasks missing dates',
        infoText: 'These tasks are real work but they do not yet have a full planning window, so they will keep weakening the roadmap.',
        actions: (
            <button
              type="button"
              onClick={() => openTaskList('unscheduled')}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.18)' }}
            >
            Open All Tasks
          </button>
        ),
        content: (
          insights.unscheduledTasks.length > 0 ? (
            <div className="space-y-2">
              {insights.unscheduledTasks.slice(0, 8).map((task) => (
                <QueueRow key={task.id} task={task} context={getTaskContext(task)} onOpen={() => openTaskDetails(task.id)} />
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Everything in this scope has both a start and due date.</div>
          )
        ),
      }
    }

    if (activeInsight === 'launch') {
      return {
        title: 'Launch sequence',
        infoText: 'This zoomed-out timeline keeps the next committed checkpoints visible without opening the full Gantt.',
        actions: nextMilestone ? (
          <button
            type="button"
            onClick={() => nextMilestone?.projectId && openProjectWorkspace(nextMilestone.projectId)}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}
          >
            Open project
          </button>
        ) : null,
        content: (
          milestoneTimelineItems.length > 0 ? (
            <MilestoneTimeline milestones={milestoneTimelineItems} />
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No milestone dates available yet.</div>
          )
        ),
      }
    }

    return {
      title: 'Blocked or late work',
      infoText: 'Use this list to move directly into the items most likely to disturb delivery confidence.',
      actions: (
        <button
          type="button"
          onClick={openRiskView}
          className="px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#fda4af', border: '1px solid rgba(239,68,68,0.18)' }}
        >
          Open risk view
        </button>
      ),
      content: (
        insights.blockedOrLateTasks.length > 0 ? (
          <div className="space-y-2">
            {insights.blockedOrLateTasks.slice(0, 8).map((task) => (
              <QueueRow key={task.id} task={task} context={getTaskContext(task)} onOpen={() => openTaskDetails(task.id)} />
            ))}
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No blocked or overdue work in this scope.</div>
        )
      ),
    }
  }, [
    activeInsight,
    scopedProgramCards,
    actionQueue,
    flaggedPrograms,
    flaggedProgramCards,
    insights.scheduleConflicts,
    insights.unscheduledTasks,
    insights.blockedOrLateTasks,
    milestoneTimelineItems,
    nextMilestone,
  ])

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
              title="Review delivery and launch signals"
              infoText="This page should answer what is slipping, what launches next, and which workstream needs attention before you open Gantt or Tasks."
              compact
              stats={[
                { label: 'Programs', value: scopedPrograms.length, tone: 'accent', onClick: () => setAnalyticsInsight('programs'), active: activeInsight === 'programs' },
                { label: 'Open tasks', value: scopedOpenTasks.length, tone: 'default', onClick: () => setAnalyticsInsight('tasks'), active: activeInsight === 'tasks' },
                { label: 'Flagged', value: flaggedPrograms, tone: flaggedPrograms > 0 ? 'danger' : 'default', onClick: () => setAnalyticsInsight('flagged'), active: activeInsight === 'flagged' },
                { label: 'Next launch', value: nextMilestone ? new Date(nextMilestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD', tone: nextMilestone ? 'success' : 'default', onClick: () => setAnalyticsInsight('launch'), active: activeInsight === 'launch' },
              ]}
            />

            <ScopeBar
              eyebrow={null}
              title={null}
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
                onClick={() => setAnalyticsInsight('flagged')}
                active={activeInsight === 'flagged'}
              />
              <ReviewFocusCard
                label="Schedule conflicts"
                value={insights.cards.find((card) => card.id === 'conflicts')?.value ?? 0}
                detail="Dates that invert task or project windows."
                tone={(insights.cards.find((card) => card.id === 'conflicts')?.value ?? 0) > 0 ? 'danger' : 'neutral'}
                icon={AlertTriangle}
                onClick={() => setAnalyticsInsight('conflicts')}
                active={activeInsight === 'conflicts'}
              />
              <ReviewFocusCard
                label="Unscheduled"
                value={insights.cards.find((card) => card.id === 'unscheduled')?.value ?? 0}
                detail="Tasks still missing a full start and due range."
                tone={(insights.cards.find((card) => card.id === 'unscheduled')?.value ?? 0) > 0 ? 'warning' : 'neutral'}
                icon={FolderClock}
                onClick={() => setAnalyticsInsight('unscheduled')}
                active={activeInsight === 'unscheduled'}
              />
              <ReviewFocusCard
                label="Blocked or late"
                value={insights.cards.find((card) => card.id === 'blocked')?.value ?? 0}
                detail="Items that need schedule or dependency intervention."
                tone={(insights.cards.find((card) => card.id === 'blocked')?.value ?? 0) > 0 ? 'danger' : 'neutral'}
                icon={CalendarClock}
                onClick={() => setAnalyticsInsight('blocked')}
                active={activeInsight === 'blocked'}
              />
            </div>

            <ReviewDetailShell title={reviewDetail.title} infoText={reviewDetail.infoText} actions={reviewDetail.actions}>
              {reviewDetail.content}
            </ReviewDetailShell>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                  Program pulse
                </div>
                <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Compare health across the active portfolio
                </div>
              </div>
              <button
                type="button"
                onClick={expandAllInTimeline}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Expand tasks in Gantt
              </button>
            </div>

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
