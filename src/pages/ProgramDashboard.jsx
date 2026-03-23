import { memo, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowRight,
  CalendarRange,
  FolderGit2,
  FolderPlus,
  Pencil,
  Share2,
} from 'lucide-react'
import PageHero from '../components/common/PageHero'
import SectionShell from '../components/common/SectionShell'
import EmptyState from '../components/common/EmptyState'
import { ProgramStatusBadge } from '../components/common/ProgramStatusBadge'
import MilestonePanel from '../components/projects/MilestonePanel'
import ProgramFormDrawer from '../components/projects/ProgramFormDrawer'
import ProjectFormDrawer from '../components/projects/ProjectFormDrawer'
import ShareModal from '../components/ShareModal'
import useWorkspaceScopedData from '../hooks/useWorkspaceScopedData'
import {
  buildProgramSummary,
  buildProjectSummary,
  collectProjectDescendantIds,
  formatShortDate,
} from '../lib/programWorkspace'
import useActivityStore from '../store/useActivityStore'
import useProjectStore from '../store/useProjectStore'
import useSettingsStore from '../store/useSettingsStore'

const METRIC_TONE = {
  default: {
    background: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
  },
  accent: {
    background: 'rgba(var(--accent-rgb),0.12)',
    border: 'rgba(var(--accent-rgb),0.2)',
    color: 'var(--accent)',
  },
  success: {
    background: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.18)',
    color: '#34d399',
  },
  warning: {
    background: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.18)',
    color: '#fbbf24',
  },
  danger: {
    background: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.18)',
    color: '#f87171',
  },
}

const PROJECT_STATUS_META = {
  active: { label: 'Active', color: '#22d3ee', background: 'rgba(34,211,238,0.14)' },
  'on-hold': { label: 'On Hold', color: '#f59e0b', background: 'rgba(245,158,11,0.14)' },
  completed: { label: 'Completed', color: '#10b981', background: 'rgba(16,185,129,0.14)' },
}

const STATUS_LABEL = {
  status: 'Status',
  priority: 'Priority',
  title: 'Title',
  dueDate: 'Due date',
  startDate: 'Start date',
}

const toneForRisk = (tone) => {
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  if (tone === 'success') return 'success'
  return 'default'
}

const MetricPill = memo(function MetricPill({ label, value, tone = 'default' }) {
  const palette = METRIC_TONE[tone] ?? METRIC_TONE.default

  return (
    <div
      className="rounded-2xl px-3 py-2"
      style={{ background: palette.background, border: `1px solid ${palette.border}` }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold" style={{ color: palette.color }}>
        {value}
      </div>
    </div>
  )
})

const ActionButton = memo(function ActionButton({ children, onClick, accent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl px-3 py-2 text-xs font-medium"
      style={accent
        ? { background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }
        : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </button>
  )
})

const RiskRow = memo(function RiskRow({ label, value, detail, tone = 'default', onClick }) {
  const palette = METRIC_TONE[tone] ?? METRIC_TONE.default
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5"
      style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${palette.border}` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {detail}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="rounded-full px-2 py-1 text-[10px] font-semibold"
            style={{ background: palette.background, color: palette.color }}
          >
            {value}
          </span>
          <ArrowRight size={12} style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>
    </button>
  )
})

const formatActivityValue = (field, value) => {
  if (value == null) return '—'
  if ((field === 'dueDate' || field === 'startDate') && value) {
    return formatShortDate(value) ?? String(value)
  }
  return String(value)
}

const describeActivity = (entry) => {
  if (entry.action === 'created') return `"${entry.entityTitle}" was created`
  if (entry.action === 'deleted') return `"${entry.entityTitle}" was moved to trash`
  if (entry.action === 'status_changed') {
    return `"${entry.entityTitle}" status: ${formatActivityValue('status', entry.oldValue)} -> ${formatActivityValue('status', entry.newValue)}`
  }
  if (entry.action === 'updated' && entry.field) {
    return `"${entry.entityTitle}" ${STATUS_LABEL[entry.field] ?? entry.field}: ${formatActivityValue(entry.field, entry.oldValue)} -> ${formatActivityValue(entry.field, entry.newValue)}`
  }
  return `"${entry.entityTitle}" was updated`
}

const ActivityRow = memo(function ActivityRow({ entry, onOpen }) {
  return (
    <div
      className="rounded-2xl px-3 py-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {describeActivity(entry)}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
          </div>
        </div>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="rounded-xl px-2 py-1 text-[11px]"
            style={{ background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}
          >
            Open
          </button>
        ) : null}
      </div>
    </div>
  )
})

const MilestoneRow = memo(function MilestoneRow({ milestone, projectLabel, projectColor, onOpenProject }) {
  const isCompleted = milestone.status === 'completed'
  const isOverdue = milestone.dueDate && new Date(milestone.dueDate) < new Date() && !isCompleted

  return (
    <button
      type="button"
      onClick={onOpenProject}
      className="w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 text-[11px]" style={{ color: projectColor }}>◆</span>
        <div className="min-w-0 flex-1">
          <div
            className="text-sm font-medium"
            style={{
              color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}
          >
            {milestone.name}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {projectLabel}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="rounded-full px-2 py-1 text-[10px] font-semibold"
            style={{
              background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
              color: isOverdue ? '#fca5a5' : 'var(--text-secondary)',
            }}
          >
            {formatShortDate(milestone.dueDate) ?? 'No date'}
          </span>
          <ArrowRight size={12} style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>
    </button>
  )
})

const ProjectTreeRow = memo(function ProjectTreeRow({
  project,
  summaryById,
  selectedProjectId,
  onSelect,
  onOpenTasks,
  onOpenGantt,
  onAddChild,
  onEdit,
  level = 0,
}) {
  const summary = summaryById.get(project.id)
  const statusMeta = PROJECT_STATUS_META[project.status ?? 'active'] ?? PROJECT_STATUS_META.active
  const selected = selectedProjectId === project.id

  return (
    <div className="space-y-2">
      <div
        onClick={() => onSelect(project.id)}
        className="rounded-[26px] px-4 py-4 transition-colors cursor-pointer"
        style={{
          marginLeft: `${level * 18}px`,
          background: selected ? `${project.color}12` : 'rgba(255,255,255,0.024)',
          border: `1px solid ${selected ? `${project.color}55` : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-3 w-3 rounded-full flex-shrink-0" style={{ background: project.color, boxShadow: `0 0 10px ${project.color}55` }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {project.name}
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: statusMeta.background, color: statusMeta.color }}
                  >
                    {statusMeta.label}
                  </span>
                  {level > 0 ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
                    >
                      Sub-project
                    </span>
                  ) : null}
                </div>
                {project.description ? (
                  <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    {project.description}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  <span>{summary.scheduleLabel}</span>
                  <span>{summary.childProjects.length} child {summary.childProjects.length === 1 ? 'project' : 'projects'}</span>
                  <span>{summary.scopedMilestones.length} milestones</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <MetricPill label="Open" value={String(summary.openTasks)} tone="accent" />
            <MetricPill label="Next Milestone" value={formatShortDate(summary.nextMilestone?.dueDate) ?? 'TBD'} />
            <MetricPill label="Risk" value={summary.risk.label} tone={toneForRisk(summary.risk.tone)} />
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <ActionButton onClick={(event) => {
              event.stopPropagation()
              onOpenTasks(project.id)
            }}
            >
              Tasks
            </ActionButton>
            <ActionButton onClick={(event) => {
              event.stopPropagation()
              onOpenGantt(project.id)
            }}
            >
              Gantt
            </ActionButton>
            <ActionButton onClick={(event) => {
              event.stopPropagation()
              onAddChild(project.id)
            }}
            >
              Add sub-project
            </ActionButton>
            <ActionButton onClick={(event) => {
              event.stopPropagation()
              onEdit(project)
            }}
            >
              Edit
            </ActionButton>
          </div>
        </div>
      </div>

      {summary.childProjects.map((childProject) => (
        <ProjectTreeRow
          key={childProject.id}
          project={childProject}
          summaryById={summaryById}
          selectedProjectId={selectedProjectId}
          onSelect={onSelect}
          onOpenTasks={onOpenTasks}
          onOpenGantt={onOpenGantt}
          onAddChild={onAddChild}
          onEdit={onEdit}
          level={level + 1}
        />
      ))}
    </div>
  )
})

const ProgramDashboard = memo(function ProgramDashboard() {
  const { programs, projects, milestones, tasks, programById, projectById } = useWorkspaceScopedData()
  const activities = useActivityStore((state) => state.activities)
  const addProgram = useProjectStore((state) => state.addProgram)
  const updateProgram = useProjectStore((state) => state.updateProgram)
  const deleteProgram = useProjectStore((state) => state.deleteProgram)
  const addProject = useProjectStore((state) => state.addProject)
  const updateProject = useProjectStore((state) => state.updateProject)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const activeProgramId = useSettingsStore((state) => state.activeProgramId)
  const activeProjectId = useSettingsStore((state) => state.activeProjectId)
  const setActiveProgram = useSettingsStore((state) => state.setActiveProgram)
  const setActiveProject = useSettingsStore((state) => state.setActiveProject)
  const setPage = useSettingsStore((state) => state.setPage)
  const selectTask = useSettingsStore((state) => state.selectTask)
  const clearTaskDrilldown = useSettingsStore((state) => state.clearTaskDrilldown)
  const setTaskDrilldown = useSettingsStore((state) => state.setTaskDrilldown)
  const setGanttConfig = useSettingsStore((state) => state.setGanttConfig)
  const [programDrawer, setProgramDrawer] = useState(null)
  const [projectDrawer, setProjectDrawer] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [milestoneProjectId, setMilestoneProjectId] = useState('')

  const selectedProgram = useMemo(() => {
    if (!programs.length) return null

    if (activeProjectId) {
      const activeProject = projectById.get(activeProjectId)
      if (activeProject?.programId) return programById.get(activeProject.programId) ?? programs[0]
    }

    if (activeProgramId && programById.has(activeProgramId)) {
      return programById.get(activeProgramId)
    }

    return programs[0]
  }, [activeProgramId, activeProjectId, programById, programs, projectById])

  const programSummary = useMemo(
    () => (selectedProgram ? buildProgramSummary({ program: selectedProgram, projects, tasks, milestones }) : null),
    [milestones, projects, selectedProgram, tasks]
  )

  const programProjects = useMemo(
    () => programSummary?.programProjects ?? [],
    [programSummary]
  )
  const topLevelProjects = useMemo(
    () => programSummary?.topLevelProjects ?? [],
    [programSummary]
  )
  const projectSummaryById = useMemo(
    () => new Map(programProjects.map((project) => [project.id, buildProjectSummary({ project, allProjects: programProjects, tasks, milestones })])),
    [milestones, programProjects, tasks]
  )

  const selectedProjectInProgram = programProjects.some((project) => project.id === activeProjectId)
    ? activeProjectId
    : (milestoneProjectId || topLevelProjects[0]?.id || programProjects[0]?.id || null)

  useEffect(() => {
    if (!selectedProgram) return
    if (activeProgramId !== selectedProgram.id && !activeProjectId) {
      setActiveProgram(selectedProgram.id)
    }
  }, [activeProgramId, activeProjectId, selectedProgram, setActiveProgram])

  useEffect(() => {
    if (!programProjects.length) {
      setMilestoneProjectId('')
      return
    }

    if (selectedProjectInProgram && programProjects.some((project) => project.id === selectedProjectInProgram)) {
      setMilestoneProjectId(selectedProjectInProgram)
      return
    }

    setMilestoneProjectId(topLevelProjects[0]?.id ?? programProjects[0]?.id ?? '')
  }, [programProjects, selectedProjectInProgram, topLevelProjects])

  const recentActivity = useMemo(() => {
    if (!programSummary) return []
    const taskIds = new Set(programSummary.programTasks.map((task) => task.id))
    return activities.filter((entry) => entry.taskId && taskIds.has(entry.taskId)).slice(0, 6)
  }, [activities, programSummary])

  const overdueMilestones = programSummary?.programMilestones.filter((milestone) =>
    milestone.status !== 'completed' &&
    milestone.dueDate &&
    new Date(milestone.dueDate) < new Date()
  ).length ?? 0

  const openProgramTasks = (drilldown = null) => {
    if (!selectedProgram) return
    clearTaskDrilldown()
    setActiveProject(null)
    setActiveProgram(selectedProgram.id)
    if (drilldown) setTaskDrilldown(drilldown)
    setPage('tasks')
  }

  const openProjectTasks = (projectId, drilldown = null) => {
    clearTaskDrilldown()
    setActiveProject(projectId)
    if (drilldown) setTaskDrilldown(drilldown)
    setPage('tasks')
  }

  const openPlanner = (projectId = null) => {
    clearTaskDrilldown()
    if (projectId) {
      setActiveProject(projectId)
    } else if (selectedProgram) {
      setActiveProject(null)
      setActiveProgram(selectedProgram.id)
    }
    setPage('today')
  }

  const openGantt = (projectId = null) => {
    if (!selectedProgram) return
    clearTaskDrilldown()
    if (projectId) setActiveProject(projectId)
    else {
      setActiveProject(null)
      setActiveProgram(selectedProgram.id)
    }
    setGanttConfig({
      viewMode: 'roadmap',
      onlyDelayed: false,
      onlyCritical: false,
      onlyDependencyRisk: false,
      filteredProgramIds: [selectedProgram.id],
      filteredProjectIds: projectId ? [projectId] : [],
      filteredSubProjectIds: [],
      expandedProjectIds: projectId ? [...collectProjectDescendantIds(programProjects, projectId)] : programProjects.map((project) => project.id),
    })
    setPage('timeline')
  }

  const openActivityTask = (entry) => {
    if (!entry?.taskId) return
    const task = programSummary?.programTasks.find((candidate) => candidate.id === entry.taskId)
    if (task?.projectId) setActiveProject(task.projectId)
    else if (selectedProgram) {
      setActiveProject(null)
      setActiveProgram(selectedProgram.id)
    }
    setPage('tasks')
    selectTask(entry.taskId)
  }

  const handleProgramSubmit = (values) => {
    if (programDrawer?.mode === 'edit' && programDrawer.program) {
      updateProgram(programDrawer.program.id, values)
    } else {
      const created = addProgram(values)
      setActiveProgram(created.id)
    }
    setProgramDrawer(null)
  }

  const handleProgramDelete = () => {
    if (!programDrawer?.program) return
    const shouldDelete = window.confirm(`Delete "${programDrawer.program.name}" and detach its projects?`)
    if (!shouldDelete) return
    deleteProgram(programDrawer.program.id)
    setProgramDrawer(null)
    setPage('projects')
  }

  const handleProjectSubmit = (values) => {
    if (projectDrawer?.mode === 'edit' && projectDrawer.project) {
      updateProject(projectDrawer.project.id, values)
      if (values.parentId) setMilestoneProjectId(values.parentId)
      else setMilestoneProjectId(projectDrawer.project.id)
    } else {
      const created = addProject(values)
      setMilestoneProjectId(created.id)
      setActiveProject(created.id)
    }
    setProjectDrawer(null)
  }

  const handleProjectDelete = () => {
    if (!projectDrawer?.project) return
    const shouldDelete = window.confirm(`Delete "${projectDrawer.project.name}" and its sub-projects?`)
    if (!shouldDelete) return
    deleteProject(projectDrawer.project.id)
    if (activeProjectId === projectDrawer.project.id) setActiveProject(null)
    setProjectDrawer(null)
  }

  const projectParentsForDrawer = useMemo(() => {
    if (!projectDrawer?.project) return programProjects
    const blockedIds = collectProjectDescendantIds(programProjects, projectDrawer.project.id)
    return programProjects.filter((project) => !blockedIds.has(project.id))
  }, [programProjects, projectDrawer])

  if (!programs.length) {
    return (
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
        <EmptyState
          icon={FolderGit2}
          title="No program selected"
          description="Create a program first, then come back here to review structure, milestones, and delivery risk."
          action={(
            <button
              type="button"
              onClick={() => setPage('projects')}
              className="btn-accent px-4 py-2 text-sm"
            >
              Open programs
            </button>
          )}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
      <div className="space-y-4 py-2">
        <PageHero
          eyebrow="Program detail"
          title={selectedProgram?.name ?? 'Program'}
          description={selectedProgram?.description || `Structure, milestone delivery, and risks for ${selectedProgram?.name ?? 'this program'}.`}
          minimal
          stats={[
            { label: 'Progress', value: `${programSummary?.completion ?? 0}%`, tone: 'accent' },
            { label: 'Next Milestone', value: formatShortDate(programSummary?.nextMilestone?.dueDate) ?? 'TBD' },
            { label: 'Blocked', value: String(programSummary?.blockedTasks ?? 0), tone: (programSummary?.blockedTasks ?? 0) > 0 ? 'warning' : 'default' },
            { label: 'Overdue', value: String(programSummary?.overdueTasks ?? 0), tone: (programSummary?.overdueTasks ?? 0) > 0 ? 'danger' : 'default' },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton onClick={() => setPage('projects')}>Back to programs</ActionButton>
              <ActionButton accent onClick={() => openProgramTasks('open')}>Open tasks</ActionButton>
              <ActionButton onClick={() => openPlanner()}>Open planner</ActionButton>
              <ActionButton onClick={() => openGantt()}>Open gantt</ActionButton>
              {(selectedProgram?.scope ?? 'professional') === 'professional' ? (
                <ActionButton onClick={() => setShareOpen(true)}>
                  <span className="inline-flex items-center gap-1.5">
                    <Share2 size={12} />
                    Share
                  </span>
                </ActionButton>
              ) : null}
              <ActionButton onClick={() => setProgramDrawer({ mode: 'edit', program: selectedProgram })}>
                <span className="inline-flex items-center gap-1.5">
                  <Pencil size={12} />
                  Edit program
                </span>
              </ActionButton>
            </div>
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProgram?.id ?? ''}
              onChange={(event) => {
                setActiveProject(null)
                setActiveProgram(event.target.value || null)
              }}
              className="min-w-[220px] rounded-2xl px-3 py-2 text-xs"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
            <ProgramStatusBadge status={selectedProgram?.status || 'planning'} />
            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {programSummary?.scheduleLabel}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {programSummary?.risk.detail}
            </span>
          </div>
        </PageHero>

        <SectionShell
          eyebrow="Structure"
          title="Projects and sub-projects"
          description="Keep the program surface focused on structure and delivery ownership. Use Tasks and Gantt for deeper execution and schedule work."
          compact
          actions={(
            <button
              type="button"
              onClick={() => setProjectDrawer({ mode: 'create', lockedProgramId: selectedProgram.id })}
              className="btn-accent px-3 py-2 text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <FolderPlus size={12} />
                Add project
              </span>
            </button>
          )}
        >
          {topLevelProjects.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title="No projects in this program yet"
              description="Create the first project, then split into sub-projects only when the hierarchy helps execution."
              action={(
                <button
                  type="button"
                  onClick={() => setProjectDrawer({ mode: 'create', lockedProgramId: selectedProgram.id })}
                  className="btn-accent px-4 py-2 text-sm"
                >
                  Add first project
                </button>
              )}
            />
          ) : (
            <div className="space-y-3">
              {topLevelProjects.map((project) => (
                <ProjectTreeRow
                  key={project.id}
                  project={project}
                  summaryById={projectSummaryById}
                  selectedProjectId={selectedProjectInProgram}
                  onSelect={(projectId) => {
                    setActiveProject(projectId)
                    setMilestoneProjectId(projectId)
                  }}
                  onOpenTasks={(projectId) => openProjectTasks(projectId, 'open')}
                  onOpenGantt={(projectId) => openGantt(projectId)}
                  onAddChild={(projectId) => setProjectDrawer({
                    mode: 'create',
                    lockedProgramId: selectedProgram.id,
                    initialValues: { parentId: projectId, programId: selectedProgram.id },
                  })}
                  onEdit={(projectToEdit) => setProjectDrawer({ mode: 'edit', project: projectToEdit })}
                />
              ))}
            </div>
          )}
        </SectionShell>

        <SectionShell
          eyebrow="Milestones"
          title="Rollup and management"
          description="Roll up milestone visibility across the program, then manage add, edit, and complete flows inside the selected project."
          compact
          actions={(
            <ActionButton onClick={() => openGantt()}>
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange size={12} />
                Open gantt
              </span>
            </ActionButton>
          )}
        >
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <MetricPill label="Milestones" value={String(programSummary?.programMilestones.length ?? 0)} tone="accent" />
                <MetricPill label="Overdue" value={String(overdueMilestones)} tone={overdueMilestones > 0 ? 'danger' : 'default'} />
                <MetricPill label="Completed" value={String(programSummary?.completedMilestones ?? 0)} tone="success" />
              </div>

              {programSummary?.programMilestones.length ? (
                <div className="space-y-2">
                  {programSummary.programMilestones.slice(0, 8).map((milestone) => {
                    const project = milestone.projectId ? projectById.get(milestone.projectId) : null
                    return (
                      <MilestoneRow
                        key={milestone.id}
                        milestone={milestone}
                        projectLabel={project?.name ?? 'Project'}
                        projectColor={project?.color ?? selectedProgram.color}
                        onOpenProject={() => {
                          if (!project) return
                          setActiveProject(project.id)
                          setMilestoneProjectId(project.id)
                        }}
                      />
                    )
                  })}
                </div>
              ) : (
                <div
                  className="rounded-2xl px-3 py-4 text-sm"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
                >
                  No milestones yet. Pick a project on the right and add the first checkpoint.
                </div>
              )}
            </div>

            <div className="rounded-[26px] px-4 py-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {programProjects.length ? (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                    Manage project milestones
                  </div>
                  <select
                    value={milestoneProjectId}
                    onChange={(event) => {
                      setMilestoneProjectId(event.target.value)
                      setActiveProject(event.target.value || null)
                    }}
                    className="mt-3 w-full rounded-2xl px-3 py-2 text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                    {programProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  {milestoneProjectId ? (
                    <MilestonePanel
                      projectId={milestoneProjectId}
                      projectColor={projectById.get(milestoneProjectId)?.color ?? selectedProgram.color}
                    />
                  ) : null}
                </>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Add a project first before you manage milestones.
                </div>
              )}
            </div>
          </div>
        </SectionShell>

        <SectionShell
          eyebrow="Delivery"
          title="Risks and recent activity"
          description="The goal here is to decide where to drill next, not to rebuild the Tasks or Activity pages inside the program screen."
          compact
        >
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-2">
              <RiskRow
                label="Blocked work"
                value={String(programSummary?.blockedTasks ?? 0)}
                detail="Open the task list with only blocked work in this program."
                tone={(programSummary?.blockedTasks ?? 0) > 0 ? 'warning' : 'default'}
                onClick={() => openProgramTasks('blocked')}
              />
              <RiskRow
                label="Overdue tasks"
                value={String(programSummary?.overdueTasks ?? 0)}
                detail="Review slipped deadlines before updating the roadmap."
                tone={(programSummary?.overdueTasks ?? 0) > 0 ? 'danger' : 'default'}
                onClick={() => openProgramTasks('overdue')}
              />
              <RiskRow
                label="Unscheduled tasks"
                value={String(programSummary?.unscheduledTasks ?? 0)}
                detail="Fill in start and due dates for work the roadmap still cannot place."
                tone={(programSummary?.unscheduledTasks ?? 0) > 0 ? 'warning' : 'default'}
                onClick={() => openProgramTasks('unscheduled')}
              />
              <RiskRow
                label="Critical tasks"
                value={String(programSummary?.criticalTasks ?? 0)}
                detail="Go straight to the highest-risk tasks in this program."
                tone={(programSummary?.criticalTasks ?? 0) > 0 ? 'danger' : 'default'}
                onClick={() => openProgramTasks('critical')}
              />
            </div>

            <div className="space-y-2">
              {recentActivity.length ? (
                recentActivity.map((entry) => (
                  <ActivityRow
                    key={entry.id}
                    entry={entry}
                    onOpen={() => openActivityTask(entry)}
                  />
                ))
              ) : (
                <div
                  className="rounded-2xl px-3 py-4 text-sm"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
                >
                  No recent activity in this program yet.
                </div>
              )}
            </div>
          </div>
        </SectionShell>
      </div>

      <ProgramFormDrawer
        open={Boolean(programDrawer)}
        mode={programDrawer?.mode ?? 'edit'}
        initialValues={programDrawer?.program ?? null}
        defaultScope={selectedProgram?.scope ?? 'professional'}
        onClose={() => setProgramDrawer(null)}
        onSubmit={handleProgramSubmit}
        onDelete={programDrawer?.mode === 'edit' ? handleProgramDelete : null}
      />

      <ProjectFormDrawer
        open={Boolean(projectDrawer)}
        mode={projectDrawer?.mode ?? 'create'}
        initialValues={projectDrawer?.project ?? projectDrawer?.initialValues ?? null}
        lockedProgramId={projectDrawer?.lockedProgramId ?? selectedProgram?.id ?? null}
        programOptions={programs}
        parentOptions={projectDrawer?.mode === 'edit' ? projectParentsForDrawer : programProjects}
        onClose={() => setProjectDrawer(null)}
        onSubmit={handleProjectSubmit}
        onDelete={projectDrawer?.mode === 'edit' ? handleProjectDelete : null}
      />

      {shareOpen && selectedProgram ? (
        <ShareModal
          resourceType="program"
          resourceId={selectedProgram.id}
          resourceName={selectedProgram.name}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </div>
  )
})

export default ProgramDashboard
