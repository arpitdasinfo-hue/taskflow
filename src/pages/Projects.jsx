import { memo, useMemo, useState } from 'react'
import { ArrowRight, FolderKanban, FolderPlus, Pencil, Plus, Share2 } from 'lucide-react'
import EmptyState from '../components/common/EmptyState'
import PageHero from '../components/common/PageHero'
import SectionShell from '../components/common/SectionShell'
import { ProgramStatusBadge } from '../components/common/ProgramStatusBadge'
import ProgramFormDrawer from '../components/projects/ProgramFormDrawer'
import ProjectFormDrawer from '../components/projects/ProjectFormDrawer'
import ShareModal from '../components/ShareModal'
import useWorkspaceScopedData from '../hooks/useWorkspaceScopedData'
import { buildProgramSummary, formatShortDate } from '../lib/programWorkspace'
import useProjectStore, { PROGRAM_SCOPE_CONFIG } from '../store/useProjectStore'
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

const ProgramRow = memo(function ProgramRow({
  program,
  summary,
  selected,
  onSelect,
  onOpen,
  onAddProject,
  onEdit,
  onShare,
}) {
  const scopeConfig = PROGRAM_SCOPE_CONFIG[program.scope ?? 'professional'] ?? PROGRAM_SCOPE_CONFIG.professional
  const riskTone = toneForRisk(summary.risk.tone)

  return (
    <div
      onClick={onSelect}
      className="rounded-[28px] px-4 py-4 transition-colors cursor-pointer"
      style={{
        background: selected ? `${program.color}12` : 'rgba(255,255,255,0.024)',
        border: `1px solid ${selected ? `${program.color}55` : 'rgba(255,255,255,0.08)'}`,
        boxShadow: selected ? `0 14px 36px ${program.color}1c` : 'none',
      }}
    >
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-3 w-3 rounded-full flex-shrink-0" style={{ background: program.color, boxShadow: `0 0 12px ${program.color}55` }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {program.name}
                </h3>
                <ProgramStatusBadge status={program.status || 'planning'} />
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: scopeConfig.background, color: scopeConfig.color }}
                >
                  {scopeConfig.label}
                </span>
              </div>
              {program.description ? (
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  {program.description}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <span>{summary.topLevelProjects.length} projects</span>
                <span>{summary.totalTasks} tracked tasks</span>
                <span>{summary.programMilestones.length} milestones</span>
                <span>{summary.scheduleLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span>{summary.doneTasks} of {summary.totalTasks} tasks done</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{summary.completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${summary.completion}%`,
                  background: `linear-gradient(90deg, ${program.color}66, ${program.color})`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricPill label="Progress" value={`${summary.completion}%`} tone="accent" />
          <MetricPill label="Next Milestone" value={formatShortDate(summary.nextMilestone?.dueDate) ?? 'TBD'} />
          <MetricPill label="Blocked" value={String(summary.blockedTasks)} tone={summary.blockedTasks > 0 ? 'warning' : 'default'} />
          <MetricPill label="Due Risk" value={summary.risk.label} tone={riskTone} />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <ActionButton accent onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
          >
            <span className="inline-flex items-center gap-1.5">
              Open
              <ArrowRight size={12} />
            </span>
          </ActionButton>
          <ActionButton onClick={(event) => {
            event.stopPropagation()
            onAddProject()
          }}
          >
            <span className="inline-flex items-center gap-1.5">
              <FolderPlus size={12} />
              Add project
            </span>
          </ActionButton>
          {(program.scope ?? 'professional') === 'professional' ? (
            <ActionButton onClick={(event) => {
              event.stopPropagation()
              onShare()
            }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Share2 size={12} />
                Share
              </span>
            </ActionButton>
          ) : (
            <div
              className="rounded-2xl px-3 py-2 text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Private
            </div>
          )}
          <ActionButton onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Pencil size={12} />
              Edit
            </span>
          </ActionButton>
        </div>
      </div>
    </div>
  )
})

const Projects = memo(function Projects() {
  const { programs, projects, tasks, milestones, workspaceViewScope } = useWorkspaceScopedData()
  const addProgram = useProjectStore((state) => state.addProgram)
  const updateProgram = useProjectStore((state) => state.updateProgram)
  const deleteProgram = useProjectStore((state) => state.deleteProgram)
  const addProject = useProjectStore((state) => state.addProject)
  const activeProgramId = useSettingsStore((state) => state.activeProgramId)
  const setActiveProgram = useSettingsStore((state) => state.setActiveProgram)
  const setPage = useSettingsStore((state) => state.setPage)
  const [programDrawer, setProgramDrawer] = useState(null)
  const [projectDrawer, setProjectDrawer] = useState(null)
  const [shareProgram, setShareProgram] = useState(null)

  const selectedProgramId = programs.some((program) => program.id === activeProgramId)
    ? activeProgramId
    : (programs[0]?.id ?? null)

  const summaryById = useMemo(
    () => new Map(programs.map((program) => [program.id, buildProgramSummary({ program, projects, tasks, milestones })])),
    [milestones, programs, projects, tasks]
  )

  const topLevelProjectCount = projects.filter((project) => !project.parentId).length
  const activeRiskCount = [...summaryById.values()].filter((summary) => summary.risk.tone === 'danger' || summary.risk.tone === 'warning').length
  const standaloneProjectCount = projects.filter((project) => !project.programId).length

  const openProgram = (programId) => {
    setActiveProgram(programId)
    setPage('program-dashboard')
  }

  const handleCreateProgram = (values) => {
    const created = addProgram(values)
    setProgramDrawer(null)
    setActiveProgram(created.id)
    setPage('program-dashboard')
  }

  const handleUpdateProgram = (values) => {
    if (!programDrawer?.program) return
    updateProgram(programDrawer.program.id, values)
    setProgramDrawer(null)
  }

  const handleDeleteProgram = () => {
    if (!programDrawer?.program) return
    const shouldDelete = window.confirm(`Delete "${programDrawer.program.name}" and detach its projects?`)
    if (!shouldDelete) return
    deleteProgram(programDrawer.program.id)
    if (activeProgramId === programDrawer.program.id) setActiveProgram(null)
    setProgramDrawer(null)
  }

  const handleCreateProject = (values) => {
    addProject(values)
    if (values.programId) setActiveProgram(values.programId)
    setProjectDrawer(null)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
      <div className="space-y-4 py-2">
        <PageHero
          eyebrow="Programs"
          title="Choose the workstream, then go deeper"
          description={standaloneProjectCount > 0
            ? `${standaloneProjectCount} standalone project${standaloneProjectCount === 1 ? '' : 's'} still sit outside a program. Keep this page focused on program selection and structure.`
            : 'Use this surface to choose one program, scan delivery health, and jump into the next action.'}
          minimal
          stats={[
            { label: 'Programs', value: programs.length, tone: 'accent' },
            { label: 'Projects', value: topLevelProjectCount },
            { label: 'At risk', value: activeRiskCount, tone: activeRiskCount > 0 ? 'danger' : 'success' },
          ]}
          actions={(
            <button
              type="button"
              onClick={() => setProgramDrawer({ mode: 'create' })}
              className="btn-accent px-3 py-2 text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus size={12} />
                New program
              </span>
            </button>
          )}
        />

        <SectionShell
          eyebrow="Programs list"
          title="One active program at a time"
          description="The row tells you whether to open the program, add structure, or share the leadership-ready view."
          compact
        >
          {programs.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No programs yet"
              description="Create the first program, then add its first project from the detail view."
              action={(
                <button
                  type="button"
                  onClick={() => setProgramDrawer({ mode: 'create' })}
                  className="btn-accent px-4 py-2 text-sm"
                >
                  Create first program
                </button>
              )}
            />
          ) : (
            <div className="space-y-3">
              {programs.map((program) => (
                <ProgramRow
                  key={program.id}
                  program={program}
                  summary={summaryById.get(program.id)}
                  selected={selectedProgramId === program.id}
                  onSelect={() => setActiveProgram(program.id)}
                  onOpen={() => openProgram(program.id)}
                  onAddProject={() => setProjectDrawer({ mode: 'create', lockedProgramId: program.id })}
                  onEdit={() => setProgramDrawer({ mode: 'edit', program })}
                  onShare={() => setShareProgram(program)}
                />
              ))}
            </div>
          )}
        </SectionShell>
      </div>

      <ProgramFormDrawer
        open={Boolean(programDrawer)}
        mode={programDrawer?.mode ?? 'create'}
        initialValues={programDrawer?.program ?? null}
        defaultScope={workspaceViewScope}
        onClose={() => setProgramDrawer(null)}
        onSubmit={programDrawer?.mode === 'edit' ? handleUpdateProgram : handleCreateProgram}
        onDelete={programDrawer?.mode === 'edit' ? handleDeleteProgram : null}
      />

      <ProjectFormDrawer
        open={Boolean(projectDrawer)}
        mode={projectDrawer?.mode ?? 'create'}
        lockedProgramId={projectDrawer?.lockedProgramId ?? null}
        programOptions={programs}
        parentOptions={projects.filter((project) => project.programId === (projectDrawer?.lockedProgramId ?? projectDrawer?.program?.programId ?? null))}
        onClose={() => setProjectDrawer(null)}
        onSubmit={handleCreateProject}
      />

      {shareProgram ? (
        <ShareModal
          resourceType="program"
          resourceId={shareProgram.id}
          resourceName={shareProgram.name}
          onClose={() => setShareProgram(null)}
        />
      ) : null}
    </div>
  )
})

export default Projects
