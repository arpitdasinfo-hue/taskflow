import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  ExternalLink,
  FolderKanban,
  Lock,
  ShieldCheck,
  Target,
} from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import InfoTooltip from '../components/common/InfoTooltip'
import MilestoneTimeline from '../components/common/MilestoneTimeline'
import ScopeBar from '../components/common/ScopeBar'
import { supabase } from '../lib/supabase'
import {
  DEFAULT_SHARE_CONFIG,
  isShareLinkActive,
  normalizeShareConfig,
} from '../lib/share'
import TimelineToolbar from '../components/timeline/TimelineToolbar'
import TimelineFilterBar from '../components/timeline/TimelineFilterBar'
import TimelineGrid from '../components/timeline/TimelineGrid'
import TimelineLegend from '../components/timeline/TimelineLegend'
import useTimelineScale from '../hooks/useTimelineScale'
import useTimelineRows from '../hooks/useTimelineRows'
import useElementFullscreen from '../hooks/useElementFullscreen'
import { TIMELINE_VIEW_MODES } from '../components/timeline/timelineConfig'
import { getTaskProgramId } from '../lib/taskScope'
import {
  filterMilestonesByWorkspaceScope,
  filterProgramsByWorkspaceScope,
  filterProjectsByWorkspaceScope,
  filterTasksByWorkspaceScope,
} from '../lib/workspaceScope'

const isValidDate = (value) => {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

const fmtDate = (value) => {
  if (!isValidDate(value)) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const startOfDayTs = (value) => {
  const date = new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const normalizeScopeType = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'workspace' || raw === 'program' || raw === 'project') return raw
  if (['workspace_view', 'workspace-view', 'dashboard', 'manager', 'manager-view', 'global', 'all'].includes(raw)) {
    return 'workspace'
  }
  if (['program_view', 'program-view', 'programs'].includes(raw)) return 'program'
  if (['project_view', 'project-view', 'projects'].includes(raw)) return 'project'
  return null
}

const mapProgram = (row) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  color: row.color || '#22d3ee',
  scope: row.scope ?? 'professional',
  description: row.description || '',
  status: row.status || 'planning',
  startDate: row.start_date || '',
  endDate: row.end_date || '',
})

const mapProject = (row) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  programId: row.program_id || null,
  parentId: row.parent_id || null,
  scope: row.scope ?? 'professional',
  name: row.name,
  color: row.color || '#22d3ee',
  description: row.description || '',
  status: row.status || 'active',
  startDate: row.start_date || '',
  dueDate: row.due_date || '',
})

const mapTask = (row) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  programId: row.program_id || null,
  projectId: row.project_id || null,
  scope: row.scope ?? 'professional',
  title: row.title,
  description: row.description || '',
  status: row.status || 'todo',
  priority: row.priority || 'medium',
  startDate: row.start_date || '',
  dueDate: row.due_date || '',
  dependsOn: row.depends_on || [],
  createdAt: row.created_at || '',
})

const mapMilestone = (row) => ({
  id: row.id,
  projectId: row.project_id || null,
  taskId: row.task_id || null,
  name: row.name,
  description: row.description || '',
  dueDate: row.due_date || '',
  status: row.status || 'pending',
  completed: Boolean(row.completed),
})

const isPersonalProgramRow = (row) => (row?.scope ?? 'professional') === 'personal'
const DAY_MS = 1000 * 60 * 60 * 24
const HEALTH_PRIORITY = {
  'Off track': 0,
  'At risk': 1,
  'Setting up': 2,
  'On track': 3,
  Complete: 4,
}
const SECTION_ANCHORS = {
  overview: 'share-section-overview',
  analytics: 'share-section-portfolio',
  delivery: 'share-section-delivery',
  tasks: 'share-section-watchlist',
  milestones: 'share-section-milestones',
  gantt: 'share-section-timeline',
}

const fmtDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const countLabel = (count, label) => `${count} ${label}${count === 1 ? '' : 's'}`

const sortDateValue = (value) => (isValidDate(value) ? startOfDayTs(value) : Number.POSITIVE_INFINITY)

const daysUntilDate = (value) => {
  if (!isValidDate(value)) return null
  return Math.round((startOfDayTs(value) - startOfDayTs(new Date())) / DAY_MS)
}

const getNextMilestone = (milestones = []) =>
  (milestones ?? [])
    .filter((milestone) => !milestone?.completed && isValidDate(milestone?.dueDate))
    .sort((left, right) => startOfDayTs(left.dueDate) - startOfDayTs(right.dueDate))[0] ?? null

const collectProjectTreeIds = (projectId, projects = []) => {
  const ids = new Set([projectId])
  let changed = true

  while (changed) {
    changed = false
    ;(projects ?? []).forEach((project) => {
      if (project.parentId && ids.has(project.parentId) && !ids.has(project.id)) {
        ids.add(project.id)
        changed = true
      }
    })
  }

  return ids
}

const getDeliveryHealth = ({ blocked = 0, overdue = 0, nextDate = '', totalTasks = 0, completion = 0, status = '' }) => {
  const normalizedStatus = String(status || '').trim().toLowerCase()
  const horizonDays = daysUntilDate(nextDate)

  if (['completed', 'done', 'closed'].includes(normalizedStatus) || (totalTasks > 0 && completion === 100 && blocked === 0 && overdue === 0)) {
    return { label: 'Complete', color: '#10b981', note: 'All tracked work is complete.' }
  }

  if (overdue > 0 || (horizonDays !== null && horizonDays < 0)) {
    return {
      label: 'Off track',
      color: '#ef4444',
      note: overdue > 0 ? `${countLabel(overdue, 'overdue item')} need recovery.` : 'A key checkpoint has already slipped.',
    }
  }

  if (blocked > 0 || (horizonDays !== null && horizonDays <= 7 && completion < 85)) {
    return {
      label: 'At risk',
      color: '#f59e0b',
      note: blocked > 0 ? `${countLabel(blocked, 'blocked item')} may need leadership help.` : 'A key checkpoint is approaching soon.',
    }
  }

  if (totalTasks === 0 && horizonDays === null) {
    return { label: 'Setting up', color: '#94a3b8', note: 'Scope exists, but delivery signals are still light.' }
  }

  if (horizonDays === 0) {
    return { label: 'On track', color: '#10b981', note: 'A checkpoint lands today and the plan still looks healthy.' }
  }

  return {
    label: 'On track',
    color: '#10b981',
    note: horizonDays !== null ? `Next checkpoint is in ${countLabel(horizonDays, 'day')}.` : 'Delivery signals look healthy.',
  }
}

const getConfidenceState = (healthLabel) => {
  if (healthLabel === 'Off track') return { label: 'Low', color: '#ef4444' }
  if (healthLabel === 'At risk') return { label: 'Medium', color: '#f59e0b' }
  if (healthLabel === 'Complete') return { label: 'Complete', color: '#10b981' }
  if (healthLabel === 'Setting up') return { label: 'Pending', color: '#94a3b8' }
  return { label: 'High', color: '#10b981' }
}

const getTaskWatchSignal = (task) => {
  const overdue = Boolean(task?.dueDate) && startOfDayTs(task.dueDate) < startOfDayTs(new Date()) && task.status !== 'done'
  const dueInDays = daysUntilDate(task?.dueDate)

  if (task?.status === 'blocked' && overdue) {
    return { score: 180, label: 'Critical', note: `Blocked and overdue since ${fmtDate(task.dueDate)}.`, color: '#ef4444' }
  }
  if (overdue) {
    return { score: 160, label: 'Overdue', note: `Due date passed on ${fmtDate(task.dueDate)}.`, color: '#f97316' }
  }
  if (task?.status === 'blocked') {
    return { score: 140, label: 'Blocked', note: 'Progress is currently blocked.', color: '#ef4444' }
  }
  if (task?.priority === 'critical') {
    return { score: 110, label: 'Critical', note: 'Critical-priority work in active delivery.', color: '#fb7185' }
  }
  if (dueInDays !== null && dueInDays >= 0 && dueInDays <= 7 && task?.status !== 'done') {
    return { score: 95, label: 'Due soon', note: `Due in ${countLabel(dueInDays, 'day')}.`, color: '#22d3ee' }
  }
  if (task?.priority === 'high') {
    return { score: 75, label: 'High priority', note: 'Important work worth watching closely.', color: '#f59e0b' }
  }
  if (task?.status === 'review') {
    return { score: 60, label: 'In review', note: 'Awaiting review or approval.', color: '#a78bfa' }
  }
  if (task?.status === 'in-progress') {
    return { score: 45, label: 'In progress', note: 'Active execution item.', color: '#38bdf8' }
  }
  return { score: 20, label: 'Monitor', note: 'Keep an eye on this task.', color: '#94a3b8' }
}

const compareDeliveryPriority = (left, right) => {
  const leftRank = HEALTH_PRIORITY[left.health?.label] ?? 99
  const rightRank = HEALTH_PRIORITY[right.health?.label] ?? 99
  if (leftRank !== rightRank) return leftRank - rightRank
  if ((right.overdue ?? 0) !== (left.overdue ?? 0)) return (right.overdue ?? 0) - (left.overdue ?? 0)
  if ((right.blocked ?? 0) !== (left.blocked ?? 0)) return (right.blocked ?? 0) - (left.blocked ?? 0)
  if ((right.tasks ?? right.projectTasks?.length ?? 0) !== (left.tasks ?? left.projectTasks?.length ?? 0)) {
    return (right.tasks ?? right.projectTasks?.length ?? 0) - (left.tasks ?? left.projectTasks?.length ?? 0)
  }
  return sortDateValue(left.nextMilestone?.dueDate || left.nextCheckpoint?.dueDate || left.dueDate) -
    sortDateValue(right.nextMilestone?.dueDate || right.nextCheckpoint?.dueDate || right.dueDate)
}

const getMilestoneHealth = (milestone) => {
  if (milestone?.completed || milestone?.status === 'completed') {
    return { label: 'Completed', color: '#10b981', note: 'Checkpoint already reached.' }
  }

  const days = daysUntilDate(milestone?.dueDate)
  if (days !== null && days < 0) {
    return { label: 'Late', color: '#ef4444', note: `Due ${fmtDate(milestone.dueDate)}.` }
  }
  if (days !== null && days <= 7) {
    return { label: 'Upcoming', color: '#f59e0b', note: `Due ${fmtDate(milestone.dueDate)}.` }
  }

  return { label: 'Planned', color: '#22d3ee', note: milestone?.dueDate ? `Due ${fmtDate(milestone.dueDate)}.` : 'No date set.' }
}

const StatCard = ({ label, value, color }) => (
  <div
    className="rounded-2xl px-4 py-3"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
  >
    <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    <p className="text-2xl font-bold mt-2" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
  </div>
)

const MetaCard = ({ label, value, meta = '', color = 'var(--text-primary)' }) => (
  <div
    className="rounded-2xl px-4 py-3"
    style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
  >
    <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    <p className="text-sm font-semibold mt-2" style={{ color }}>{value}</p>
    {meta ? (
      <p className="text-[11px] mt-1.5 leading-5" style={{ color: 'var(--text-secondary)' }}>{meta}</p>
    ) : null}
  </div>
)

const JumpChip = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors"
    style={{
      background: 'rgba(255,255,255,0.04)',
      color: 'var(--text-secondary)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <Icon size={13} />
    <span>{label}</span>
  </button>
)

const HeroMetricCard = ({ label, value, meta, color = 'var(--text-primary)', onClick }) => {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left ${onClick ? 'transition-colors hover:bg-white/5' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="mt-2 text-xl font-bold leading-tight" style={{ color }}>{value}</p>
      <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>{meta}</p>
    </Component>
  )
}

const CompactNote = ({ label, value }) => (
  <div
    className="rounded-full px-3 py-2"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
  >
    <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span className="ml-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
  </div>
)

const ActionButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors"
    style={{
      background: 'rgba(255,255,255,0.04)',
      color: 'var(--text-primary)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <span>{label}</span>
    <ArrowRight size={12} />
  </button>
)

const HealthPill = ({ health }) => (
  <span
    className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
    style={{ background: `${health.color}20`, color: health.color, border: `1px solid ${health.color}33` }}
  >
    {health.label}
  </span>
)

const Section = ({ title, description, icon: Icon, action = null, padding = 'p-5', children }) => (
  <GlassCard padding={padding}>
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}
        >
          <Icon size={14} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <InfoTooltip text={description} widthClassName="w-64" />
        </div>
      </div>
      {action}
    </div>
    {children}
  </GlassCard>
)

const ManagerGantt = ({ programs, projects, tasks, milestones }) => {
  const { targetRef: fullscreenRef, isFullscreen, toggleFullscreen } = useElementFullscreen()
  const [filteredProgramIds, setFilteredProgramIds] = useState(() => new Set())
  const [filteredProjectIds, setFilteredProjectIds] = useState(() => new Set())
  const [filteredSubProjectIds, setFilteredSubProjectIds] = useState(() => new Set())
  const [expandedProjectIds, setExpandedProjectIds] = useState(() => new Set())
  const [viewMode, setViewMode] = useState('roadmap')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyDelayed, setOnlyDelayed] = useState(false)
  const [onlyCritical, setOnlyCritical] = useState(false)
  const [onlyDependencyRisk, setOnlyDependencyRisk] = useState(false)
  const [showDependencies, setShowDependencies] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const {
    zoom,
    config,
    startDate,
    endDate,
    rangeLabel,
    isCustomRange,
    customRangeStart,
    customRangeEnd,
    changeZoom,
    shiftRange,
    resetToToday,
    applyCustomRange,
  } = useTimelineScale({ initialZoom: 'month' })
  const [customStartInput, setCustomStartInput] = useState('')
  const [customEndInput, setCustomEndInput] = useState('')

  const { rows, stats } = useTimelineRows({
    programs,
    projects,
    tasks,
    milestones,
    filteredProgramIds,
    filteredProjectIds,
    filteredSubProjectIds,
    expandedProjectIds,
    onlyDelayed,
    onlyCritical,
    onlyDependencyRisk,
    searchQuery,
  })

  const selectedProgramId = [...filteredProgramIds][0] ?? ''
  const visibleProjects = projects.filter((project) => !project.parentId && (!selectedProgramId || project.programId === selectedProgramId))
  const selectedProjectId = [...filteredProjectIds][0] ?? ''
  const visibleSubProjects = selectedProjectId
    ? projects.filter((project) => project.parentId === selectedProjectId)
    : projects.filter((project) => project.parentId && (!selectedProgramId || project.programId === selectedProgramId))
  const selectedSubProjectId = [...filteredSubProjectIds][0] ?? ''

  useEffect(() => {
    if (isCustomRange) {
      setCustomStartInput(customRangeStart)
      setCustomEndInput(customRangeEnd)
    } else if (!customStartInput && !customEndInput) {
      setCustomStartInput(startDate.toISOString().slice(0, 10))
      setCustomEndInput(endDate.toISOString().slice(0, 10))
    }
  }, [isCustomRange, customRangeStart, customRangeEnd, startDate, endDate, customStartInput, customEndInput])

  useEffect(() => {
    if (!selectedProjectId) return
    if (!visibleProjects.some((project) => project.id === selectedProjectId)) {
      setFilteredProjectIds(new Set())
      setFilteredSubProjectIds(new Set())
    }
  }, [selectedProjectId, visibleProjects])

  useEffect(() => {
    if (!selectedSubProjectId) return
    if (!visibleSubProjects.some((project) => project.id === selectedSubProjectId)) {
      setFilteredSubProjectIds(new Set())
    }
  }, [selectedSubProjectId, visibleSubProjects])

  const setProgramScope = (id) => {
    setFilteredProgramIds(id ? new Set([id]) : new Set())
    setFilteredProjectIds(new Set())
    setFilteredSubProjectIds(new Set())
  }

  const setProjectScope = (id) => {
    if (!id) {
      setFilteredProjectIds(new Set())
      setFilteredSubProjectIds(new Set())
      return
    }
    setFilteredProjectIds(new Set([id]))
    setFilteredSubProjectIds(new Set())
  }

  const setSubProjectScope = (id) => {
    setFilteredSubProjectIds(id ? new Set([id]) : new Set())
  }

  const toggleExpandedProject = (projectId) => {
    setExpandedProjectIds((previous) => {
      const next = new Set(previous)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const expandableProjectIds = rows
    .filter((row) => row.type === 'project' && row.expandable && row.projectId)
    .map((row) => row.projectId)

  const visibleCounts = {
    programs: rows.filter((row) => row.type === 'program').length,
    projects: rows.filter((row) => row.type === 'project').length,
    tasks: rows.filter((row) => row.type === 'task').length,
  }

  const clearFilters = () => {
    setOnlyDelayed(false)
    setOnlyCritical(false)
    setOnlyDependencyRisk(false)
    setShowDependencies(true)
  }

  const applyViewMode = (nextViewMode) => {
    if (!TIMELINE_VIEW_MODES[nextViewMode]) return
    setViewMode(nextViewMode)
    const projectIdsWithTasks = new Set(tasks.map((task) => task.projectId).filter(Boolean))

    if (nextViewMode === 'roadmap') {
      setOnlyDelayed(false)
      setOnlyCritical(false)
      setOnlyDependencyRisk(false)
      setShowDependencies(false)
      setExpandedProjectIds(new Set())
      return
    }

    if (nextViewMode === 'delivery') {
      setOnlyDelayed(false)
      setOnlyCritical(false)
      setOnlyDependencyRisk(false)
      setShowDependencies(true)
      setExpandedProjectIds(projectIdsWithTasks)
      return
    }

    setOnlyDelayed(true)
    setOnlyCritical(true)
    setOnlyDependencyRisk(true)
    setShowDependencies(true)
    setExpandedProjectIds(projectIdsWithTasks)
  }

  const filtered =
    filteredProgramIds.size > 0 ||
    filteredProjectIds.size > 0 ||
    filteredSubProjectIds.size > 0 ||
    onlyDelayed ||
    onlyCritical ||
    onlyDependencyRisk ||
    searchQuery.trim().length > 0

  const activeFilterCount =
    Number(onlyDelayed) +
    Number(onlyCritical) +
    Number(onlyDependencyRisk) +
    Number(!showDependencies)

  const applyCustomTimelineRange = () => {
    const didApply = applyCustomRange(customStartInput, customEndInput)
    if (!didApply) return
  }

  return (
    <div ref={fullscreenRef} className={`gantt-fullscreen-shell space-y-2.5 ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <TimelineToolbar
        zoom={zoom}
        rangeLabel={rangeLabel}
        stats={stats}
        selectedProgramId={selectedProgramId}
        selectedProjectId={selectedProjectId}
        selectedSubProjectId={selectedSubProjectId}
        visiblePrograms={programs}
        visibleProjects={visibleProjects}
        visibleSubProjects={visibleSubProjects}
        viewMode={viewMode}
        searchQuery={searchQuery}
        isCustomRange={isCustomRange}
        customRangeStart={customStartInput}
        customRangeEnd={customEndInput}
        visibleCounts={visibleCounts}
        expandableProjectCount={expandableProjectIds.length}
        activeFilterCount={activeFilterCount}
        filterPanelOpen={showFilterPanel}
        readOnly
        compact
        hideScopeControls
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onChangeProgram={setProgramScope}
        onChangeProject={setProjectScope}
        onChangeSubProject={setSubProjectScope}
        onChangeViewMode={applyViewMode}
        onSearchChange={setSearchQuery}
        onChangeZoom={changeZoom}
        onChangeCustomRangeStart={setCustomStartInput}
        onChangeCustomRangeEnd={setCustomEndInput}
        onApplyCustomRange={applyCustomTimelineRange}
        onShiftRange={shiftRange}
        onResetToToday={resetToToday}
        onExpandAll={() => setExpandedProjectIds(new Set(expandableProjectIds))}
        onCollapseAll={() => setExpandedProjectIds(new Set())}
        onToggleFilterPanel={() => setShowFilterPanel((value) => !value)}
      />

      {showFilterPanel && (
        <TimelineFilterBar
          onlyDelayed={onlyDelayed}
          onlyCritical={onlyCritical}
          onlyDependencyRisk={onlyDependencyRisk}
          showDependencies={showDependencies}
          onToggleOnlyDelayed={() => setOnlyDelayed((value) => !value)}
          onToggleOnlyCritical={() => setOnlyCritical((value) => !value)}
          onToggleOnlyDependencyRisk={() => setOnlyDependencyRisk((value) => !value)}
          onToggleShowDependencies={() => setShowDependencies((value) => !value)}
          onClear={clearFilters}
          onClose={() => setShowFilterPanel(false)}
        />
      )}

      <TimelineLegend readOnly />

      {rows.length === 0 ? (
        <div className="px-2 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {filtered ? 'No timeline items match the selected filters.' : 'No timeline data available for this scope.'}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
        >
          <TimelineGrid
            rows={rows}
            startDate={startDate}
            days={config.days}
            cellWidth={config.cellWidth}
            zoom={zoom}
            onToggleProject={toggleExpandedProject}
            onSelectTask={() => {}}
            onUpdateTaskSchedule={() => {}}
            onUpdateProjectSchedule={() => {}}
            showDependencies={showDependencies}
            onlyDependencyRisk={onlyDependencyRisk}
            readOnly
            compact
            isFullscreen={isFullscreen}
          />
        </div>
      )}
    </div>
  )
}

export default function ShareView({ token }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [link, setLink] = useState(null)
  const [shareConfig, setShareConfig] = useState(() => normalizeShareConfig(DEFAULT_SHARE_CONFIG))
  const [snapshotLoadedAt, setSnapshotLoadedAt] = useState('')
  const [programs, setPrograms] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [milestones, setMilestones] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedSubProjectId, setSelectedSubProjectId] = useState('')
  const viewerTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'
    } catch {
      return 'Local time'
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      const { data: sharedLink, error: linkError } = await supabase
        .from('share_links')
        .select('*')
        .eq('token', token)
        .maybeSingle()

      if (linkError || !sharedLink) {
        if (!cancelled) {
          setError(linkError?.message || 'Invalid share link.')
          setLoading(false)
        }
        return
      }

      if (!isShareLinkActive(sharedLink)) {
        if (!cancelled) {
          setError('This link is disabled, revoked, or expired.')
          setLoading(false)
        }
        return
      }

      void supabase.from('share_view_events').insert({
        share_link_id: sharedLink.id,
        token: sharedLink.token,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })

      const config = normalizeShareConfig(sharedLink.config)
      if (!cancelled) {
        setShareConfig(config)
      }

      let scopeType = normalizeScopeType(sharedLink.resource_type)
      let scopeId = sharedLink.resource_id
      let workspaceId = sharedLink.workspace_id

      // Backward-compatible: older links may store legacy scope names.
      if (!scopeType && scopeId) {
        const [programProbe, projectProbe] = await Promise.all([
          supabase.from('programs').select('id, workspace_id').eq('id', scopeId).maybeSingle(),
          supabase.from('projects').select('id, workspace_id').eq('id', scopeId).maybeSingle(),
        ])
        if (programProbe.data) {
          scopeType = 'program'
          workspaceId = programProbe.data.workspace_id || workspaceId
        } else if (projectProbe.data) {
          scopeType = 'project'
          workspaceId = projectProbe.data.workspace_id || workspaceId
        }
      }

      if (!scopeType && workspaceId) {
        scopeType = 'workspace'
        scopeId = workspaceId
      }
      if (!scopeType && scopeId) {
        scopeType = 'workspace'
        workspaceId = workspaceId || scopeId
      }

      if (scopeType && !cancelled) {
        setLink({ ...sharedLink, resource_type: scopeType, resource_id: scopeId, workspace_id: workspaceId })
      }

      let programRows = []
      let projectRows = []
      let taskRows = []
      let milestoneRows = []

      if (scopeType === 'workspace') {
        if (!workspaceId) {
          if (!cancelled) {
            setError('Workspace share link is missing workspace context.')
            setLoading(false)
          }
          return
        }
        const [programRes, projectRes, taskRes] = await Promise.all([
          supabase.from('programs').select('*').eq('workspace_id', workspaceId),
          supabase.from('projects').select('*').eq('workspace_id', workspaceId),
          supabase.from('tasks').select('*').eq('workspace_id', workspaceId).is('deleted_at', null),
        ])
        if (programRes.error || projectRes.error || taskRes.error) {
          if (!cancelled) {
            setError(programRes.error?.message || projectRes.error?.message || taskRes.error?.message || 'Unable to load workspace data.')
            setLoading(false)
          }
          return
        }
        programRows = programRes.data ?? []
        projectRows = projectRes.data ?? []
        taskRows = taskRes.data ?? []
      } else if (scopeType === 'program') {
        const { data: program, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', scopeId)
          .maybeSingle()
        if (programError || !program) {
          if (!cancelled) {
            setError(programError?.message || 'Program not found.')
            setLoading(false)
          }
          return
        }
        if (isPersonalProgramRow(program)) {
          if (!cancelled) {
            setError('Personal programs stay private and cannot be opened through shared links.')
            setLoading(false)
          }
          return
        }
        programRows = [program]
        const projectRes = await supabase.from('projects').select('*').eq('program_id', program.id)
        if (projectRes.error) {
          if (!cancelled) {
            setError(projectRes.error.message)
            setLoading(false)
          }
          return
        }
        projectRows = projectRes.data ?? []
        const projectIds = projectRows.map((row) => row.id)
        const [directTaskRes, projectTaskRes] = await Promise.all([
          supabase.from('tasks').select('*').eq('program_id', program.id).is('project_id', null).is('deleted_at', null),
          projectIds.length > 0
            ? supabase.from('tasks').select('*').in('project_id', projectIds).is('deleted_at', null)
            : Promise.resolve({ data: [], error: null }),
        ])
        if (directTaskRes.error || projectTaskRes.error) {
          if (!cancelled) {
            setError(directTaskRes.error?.message || projectTaskRes.error?.message || 'Unable to load program tasks.')
            setLoading(false)
          }
          return
        }
        const mergedTasks = [...(directTaskRes.data ?? []), ...(projectTaskRes.data ?? [])]
        taskRows = mergedTasks.filter((row, index, list) =>
          list.findIndex((candidate) => candidate.id === row.id) === index
        )
      } else if (scopeType === 'project') {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', scopeId)
          .maybeSingle()
        if (projectError || !project) {
          if (!cancelled) {
            setError(projectError?.message || 'Project not found.')
            setLoading(false)
          }
          return
        }

        if (!project.program_id && (project.scope ?? 'professional') === 'personal') {
          if (!cancelled) {
            setError('Personal standalone projects stay private and cannot be opened through shared links.')
            setLoading(false)
          }
          return
        }

        if (project.program_id) {
          const programRes = await supabase.from('programs').select('*').eq('id', project.program_id).maybeSingle()
          if (programRes.error) {
            if (!cancelled) {
              setError(programRes.error.message || 'Unable to verify whether this project can be opened through a shared link.')
              setLoading(false)
            }
            return
          }
          if (programRes.data) {
            if (isPersonalProgramRow(programRes.data)) {
              if (!cancelled) {
                setError('Projects inside personal programs stay private and cannot be opened through shared links.')
                setLoading(false)
              }
              return
            }
            programRows = [programRes.data]
          }
        }

        const workspaceRes = await supabase
          .from('projects')
          .select('*')
          .eq('workspace_id', project.workspace_id)
        if (workspaceRes.error) {
          if (!cancelled) {
            setError(workspaceRes.error.message)
            setLoading(false)
          }
          return
        }
        const allProjects = workspaceRes.data ?? []
        const projectById = new Map(allProjects.map((row) => [row.id, row]))
        const descendantIds = new Set([project.id])
        let changed = true
        while (changed) {
          changed = false
          allProjects.forEach((candidate) => {
            if (candidate.parent_id && descendantIds.has(candidate.parent_id) && !descendantIds.has(candidate.id)) {
              descendantIds.add(candidate.id)
              changed = true
            }
          })
        }
        projectRows = [...descendantIds].map((id) => projectById.get(id)).filter(Boolean)
        const taskRes = await supabase.from('tasks').select('*').in('project_id', [...descendantIds]).is('deleted_at', null)
        if (taskRes.error) {
          if (!cancelled) {
            setError(taskRes.error.message)
            setLoading(false)
          }
          return
        }
        taskRows = taskRes.data ?? []
      } else {
        if (!cancelled) {
          setError('Unsupported share scope.')
          setLoading(false)
        }
        return
      }

      const mappedPrograms = filterProgramsByWorkspaceScope(programRows.map(mapProgram), 'professional')
      const visibleProgramIds = new Set(mappedPrograms.map((program) => program.id))

      const mappedProjects = filterProjectsByWorkspaceScope(projectRows.map(mapProject), mappedPrograms, 'professional')
        .filter((project) => !project.programId || visibleProgramIds.has(project.programId))
      const visibleProjectIds = new Set(mappedProjects.map((project) => project.id))

      const mappedTasks = filterTasksByWorkspaceScope(taskRows.map(mapTask), mappedPrograms, mappedProjects, 'professional')
        .filter((task) => {
          if (task.programId && !visibleProgramIds.has(task.programId)) return false
          if (task.projectId && !visibleProjectIds.has(task.projectId)) return false
          return true
        })

      if (config.modules.milestones) {
        const projectIds = mappedProjects.map((project) => project.id)
        if (projectIds.length > 0) {
          const milestoneRes = await supabase.from('milestones').select('*').in('project_id', projectIds)
          if (!milestoneRes.error) {
            milestoneRows = filterMilestonesByWorkspaceScope(
              (milestoneRes.data ?? []).map(mapMilestone),
              mappedProjects,
              mappedPrograms,
              'professional'
            )
          }
        }
      }

      const statusFilter = new Set(config.filters.status || [])
      const priorityFilter = new Set(config.filters.priority || [])
      const fromTs = config.filters.dueFrom ? startOfDayTs(config.filters.dueFrom) : null
      const toTs = config.filters.dueTo ? startOfDayTs(config.filters.dueTo) : null

      const filteredTasks = mappedTasks.filter((task) => {
        if (!config.filters.includeCompleted && task.status === 'done') return false
        if (statusFilter.size > 0 && !statusFilter.has(task.status)) return false
        if (priorityFilter.size > 0 && !priorityFilter.has(task.priority)) return false
        if (fromTs || toTs) {
          const dueTs = isValidDate(task.dueDate) ? startOfDayTs(task.dueDate) : null
          if (fromTs && dueTs && dueTs < fromTs) return false
          if (toTs && dueTs && dueTs > toTs) return false
        }
        return true
      })

      if (!cancelled) {
        setPrograms(mappedPrograms)
        setProjects(mappedProjects)
        setTasks(filteredTasks)
        setMilestones(milestoneRows)
        setSnapshotLoadedAt(new Date().toISOString())
        setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [token])

  const topLevelProjects = useMemo(
    () => projects.filter((project) => !project.parentId),
    [projects]
  )
  const allSubProjects = useMemo(
    () => projects.filter((project) => Boolean(project.parentId)),
    [projects]
  )

  const visibleTopProjects = useMemo(() => {
    if (!selectedProgramId) return topLevelProjects
    return topLevelProjects.filter((project) => project.programId === selectedProgramId)
  }, [topLevelProjects, selectedProgramId])

  const visibleSubProjects = useMemo(() => {
    let next = allSubProjects
    if (selectedProgramId) next = next.filter((project) => project.programId === selectedProgramId)
    if (selectedProjectId) next = next.filter((project) => project.parentId === selectedProjectId)
    return next
  }, [allSubProjects, selectedProgramId, selectedProjectId])

  useEffect(() => {
    if (!selectedProgramId) return
    if (!programs.some((program) => program.id === selectedProgramId)) {
      setSelectedProgramId('')
    }
  }, [selectedProgramId, programs])

  useEffect(() => {
    if (!selectedProjectId) return
    if (!visibleTopProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId('')
    }
  }, [selectedProjectId, visibleTopProjects])

  useEffect(() => {
    if (!selectedSubProjectId) return
    if (!visibleSubProjects.some((project) => project.id === selectedSubProjectId)) {
      setSelectedSubProjectId('')
    }
  }, [selectedSubProjectId, visibleSubProjects])

  const filteredProjects = useMemo(() => {
    let scoped = projects
    if (selectedProgramId) {
      scoped = scoped.filter((project) => project.programId === selectedProgramId)
    }

    if (selectedSubProjectId) {
      const subProject = scoped.find((project) => project.id === selectedSubProjectId)
      if (!subProject) return []
      return scoped.filter((project) => project.id === subProject.id || project.id === subProject.parentId)
    }

    if (selectedProjectId) {
      const selectedIds = new Set([selectedProjectId])
      scoped
        .filter((project) => project.parentId === selectedProjectId)
        .forEach((project) => selectedIds.add(project.id))
      return scoped.filter((project) => selectedIds.has(project.id))
    }

    return scoped
  }, [projects, selectedProgramId, selectedProjectId, selectedSubProjectId])

  const taskProjectIds = useMemo(() => {
    if (selectedSubProjectId) return new Set([selectedSubProjectId])
    return new Set(filteredProjects.map((project) => project.id))
  }, [filteredProjects, selectedSubProjectId])

  const filteredTasks = useMemo(
    () => {
      if (!selectedProgramId && !selectedProjectId && !selectedSubProjectId) return tasks
      if (selectedSubProjectId) return tasks.filter((task) => task.projectId === selectedSubProjectId)
      if (selectedProjectId) return tasks.filter((task) => task.projectId && taskProjectIds.has(task.projectId))
      if (selectedProgramId) return tasks.filter((task) => getTaskProgramId(task, projects) === selectedProgramId)
      return tasks
    },
    [tasks, taskProjectIds, selectedProgramId, selectedProjectId, selectedSubProjectId, projects]
  )

  const filteredMilestones = useMemo(
    () => milestones.filter((milestone) => milestone.projectId && taskProjectIds.has(milestone.projectId)),
    [milestones, taskProjectIds]
  )

  const filteredPrograms = useMemo(() => {
    if (selectedProgramId) {
      return programs.filter((program) => program.id === selectedProgramId)
    }
    if (!selectedProjectId && !selectedSubProjectId) {
      return programs
    }
    const scopedProgramIds = new Set(filteredProjects.map((project) => project.programId).filter(Boolean))
    return programs.filter((program) => scopedProgramIds.has(program.id))
  }, [programs, filteredProjects, selectedProgramId, selectedProjectId, selectedSubProjectId])

  const allProjectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const projectById = useMemo(() => new Map(filteredProjects.map((project) => [project.id, project])), [filteredProjects])
  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs])
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const milestoneTimelineItems = useMemo(
    () => filteredMilestones.map((milestone) => {
      const project = milestone.projectId ? projectById.get(milestone.projectId) : null
      const program = project?.programId ? programById.get(project.programId) : null
      return {
        id: milestone.id,
        name: milestone.name,
        dueDate: milestone.dueDate,
        completed: milestone.completed || milestone.status === 'completed',
        color: project?.color || program?.color || '#38bdf8',
        context: project ? `${program?.name ? `${program.name} · ` : ''}${project.name}` : program?.name || 'Unassigned',
      }
    }),
    [filteredMilestones, projectById, programById]
  )

  const stats = useMemo(() => {
    const total = filteredTasks.length
    const done = filteredTasks.filter((task) => task.status === 'done').length
    const blocked = filteredTasks.filter((task) => task.status === 'blocked').length
    const inProgress = filteredTasks.filter((task) => task.status === 'in-progress').length
    const overdue = filteredTasks.filter((task) => task.dueDate && startOfDayTs(task.dueDate) < startOfDayTs(new Date()) && task.status !== 'done').length
    const completion = total ? Math.round((done / total) * 100) : 0
    return { total, done, blocked, inProgress, overdue, completion }
  }, [filteredTasks])

  const shareScopeLabel = (() => {
    if (!link?.resource_type) return 'Shared view'
    if (link.resource_type === 'workspace') return 'Workspace'
    if (link.resource_type === 'program') return 'Program'
    if (link.resource_type === 'project') return 'Project'
    return 'Shared view'
  })()

  const nextMilestone = useMemo(() => getNextMilestone(filteredMilestones), [filteredMilestones])
  const portfolioHealth = useMemo(
    () => getDeliveryHealth({
      blocked: stats.blocked,
      overdue: stats.overdue,
      nextDate: nextMilestone?.dueDate,
      totalTasks: stats.total,
      completion: stats.completion,
    }),
    [nextMilestone, stats.blocked, stats.completion, stats.overdue, stats.total]
  )

  const currentScopeLabel = useMemo(() => {
    const labels = ['All shared work']
    const selectedProgram = selectedProgramId ? programs.find((program) => program.id === selectedProgramId) : null
    const selectedProject = selectedProjectId ? projects.find((project) => project.id === selectedProjectId) : null
    const selectedSubProject = selectedSubProjectId ? projects.find((project) => project.id === selectedSubProjectId) : null

    if (selectedProgram?.name) labels.push(selectedProgram.name)
    if (selectedProject?.name) labels.push(selectedProject.name)
    if (selectedSubProject?.name) labels.push(selectedSubProject.name)

    return labels.join(' / ')
  }, [programs, projects, selectedProgramId, selectedProjectId, selectedSubProjectId])

  const headerNotes = useMemo(() => {
    const accessValue = link?.expires_at ? `Expires ${fmtDateTime(link.expires_at)}` : 'No expiry'
    return [
      {
        label: 'Scope',
        value: `${shareScopeLabel} · ${currentScopeLabel}`,
      },
      {
        label: 'Privacy',
        value: 'Professional only',
      },
      {
        label: 'Viewed',
        value: snapshotLoadedAt ? `${fmtDateTime(snapshotLoadedAt)} · ${viewerTimeZone}` : 'Loading…',
      },
      {
        label: 'Access',
        value: accessValue,
      },
    ]
  }, [currentScopeLabel, link?.expires_at, shareScopeLabel, snapshotLoadedAt, viewerTimeZone])

  const programStats = useMemo(() => {
    const rows = filteredPrograms.map((program) => {
      const programProjects = filteredProjects.filter((project) => project.programId === program.id)
      const projectIds = new Set(programProjects.map((project) => project.id))
      const programTasks = filteredTasks.filter((task) =>
        getTaskProgramId(task, projects) === program.id &&
        (!task.projectId || projectIds.has(task.projectId))
      )
      const programMilestones = filteredMilestones.filter((milestone) => milestone.projectId && projectIds.has(milestone.projectId))
      const done = programTasks.filter((task) => task.status === 'done').length
      const blocked = programTasks.filter((task) => task.status === 'blocked').length
      const overdue = programTasks.filter((task) => task.dueDate && startOfDayTs(task.dueDate) < startOfDayTs(new Date()) && task.status !== 'done').length
      const completion = programTasks.length ? Math.round((done / programTasks.length) * 100) : 0
      const upcomingMilestone = getNextMilestone(programMilestones)
      return {
        id: program.id,
        name: program.name,
        color: program.color,
        projects: programProjects.length,
        tasks: programTasks.length,
        done,
        blocked,
        overdue,
        completion,
        nextMilestone: upcomingMilestone,
        health: getDeliveryHealth({
          blocked,
          overdue,
          nextDate: upcomingMilestone?.dueDate,
          totalTasks: programTasks.length,
          completion,
          status: program.status,
        }),
      }
    })

    const standaloneRootProjects = filteredProjects.filter((project) => !project.programId && !project.parentId)
    const standaloneProjectIds = standaloneRootProjects.flatMap((project) => [...collectProjectTreeIds(project.id, filteredProjects)])
    const standaloneProjectIdSet = new Set(standaloneProjectIds)
    const standaloneTasks = filteredTasks.filter((task) =>
      (task.projectId && standaloneProjectIdSet.has(task.projectId)) ||
      (!task.projectId && !task.programId)
    )
    if (standaloneRootProjects.length > 0 || standaloneTasks.length > 0) {
      const standaloneMilestones = filteredMilestones.filter((milestone) => milestone.projectId && standaloneProjectIdSet.has(milestone.projectId))
      const done = standaloneTasks.filter((task) => task.status === 'done').length
      const blocked = standaloneTasks.filter((task) => task.status === 'blocked').length
      const overdue = standaloneTasks.filter((task) => task.dueDate && startOfDayTs(task.dueDate) < startOfDayTs(new Date()) && task.status !== 'done').length
      const completion = standaloneTasks.length ? Math.round((done / standaloneTasks.length) * 100) : 0
      const upcomingMilestone = getNextMilestone(standaloneMilestones)
      rows.push({
        id: 'standalone-work',
        name: 'Standalone work',
        color: '#94a3b8',
        projects: standaloneRootProjects.length,
        tasks: standaloneTasks.length,
        done,
        blocked,
        overdue,
        completion,
        nextMilestone: upcomingMilestone,
        health: getDeliveryHealth({
          blocked,
          overdue,
          nextDate: upcomingMilestone?.dueDate,
          totalTasks: standaloneTasks.length,
          completion,
        }),
      })
    }

    return rows.sort(compareDeliveryPriority)
  }, [filteredMilestones, filteredPrograms, filteredProjects, filteredTasks, projects])

  const availableSections = useMemo(() => {
    const sections = []
    if (shareConfig.modules.overview) {
      sections.push({
        id: 'overview',
        label: 'Summary',
        icon: ShieldCheck,
        meta: 'Executive summary, delivery health, and manager attention items.',
        anchorId: SECTION_ANCHORS.overview,
      })
    }
    if (shareConfig.modules.analytics) {
      sections.push({
        id: 'analytics',
        label: 'Portfolio',
        icon: BarChart3,
        meta: 'Program roll-ups, completion signals, and delivery load.',
        anchorId: SECTION_ANCHORS.analytics,
      })
    }
    if (shareConfig.modules.projects) {
      sections.push({
        id: 'delivery',
        label: 'Delivery',
        icon: FolderKanban,
        meta: 'Project-level execution cards with progress, blocked work, and dates.',
        anchorId: SECTION_ANCHORS.delivery,
      })
    }
    if (shareConfig.modules.tasks) {
      sections.push({
        id: 'tasks',
        label: 'Watchlist',
        icon: Lock,
        meta: 'Highest-signal tasks that may require follow-up or escalation.',
        anchorId: SECTION_ANCHORS.tasks,
      })
    }
    if (shareConfig.modules.milestones) {
      sections.push({
        id: 'milestones',
        label: 'Milestones',
        icon: CalendarClock,
        meta: 'Upcoming and completed checkpoints in the selected scope.',
        anchorId: SECTION_ANCHORS.milestones,
      })
    }
    if (shareConfig.modules.gantt) {
      sections.push({
        id: 'gantt',
        label: 'Timeline',
        icon: Target,
        meta: 'Milestone-first timeline with optional detailed schedule below.',
        anchorId: SECTION_ANCHORS.gantt,
      })
    }
    return sections
  }, [shareConfig.modules])

  const attentionItems = useMemo(() => {
    const overdueTasks = filteredTasks
      .filter((task) => task.dueDate && startOfDayTs(task.dueDate) < startOfDayTs(new Date()) && task.status !== 'done')
      .sort((left, right) => startOfDayTs(left.dueDate) - startOfDayTs(right.dueDate))
      .slice(0, 3)
      .map((task) => ({
        id: `task-overdue-${task.id}`,
        label: task.title,
        meta: `Overdue since ${fmtDate(task.dueDate)}`,
        color: '#f97316',
      }))

    const blockedTasks = filteredTasks
      .filter((task) => task.status === 'blocked')
      .slice(0, 2)
      .map((task) => ({
        id: `task-blocked-${task.id}`,
        label: task.title,
        meta: 'Currently blocked',
        color: '#ef4444',
      }))

    const upcomingMilestones = filteredMilestones
      .filter((milestone) => !milestone.completed && isValidDate(milestone.dueDate))
      .sort((left, right) => startOfDayTs(left.dueDate) - startOfDayTs(right.dueDate))
      .slice(0, 2)
      .map((milestone) => ({
        id: `milestone-${milestone.id}`,
        label: milestone.name,
        meta: `Milestone due ${fmtDate(milestone.dueDate)}`,
        color: '#22d3ee',
      }))

    return [...overdueTasks, ...blockedTasks, ...upcomingMilestones].slice(0, 5)
  }, [filteredMilestones, filteredTasks])

  const leadershipSummary = useMemo(() => {
    const topRisk = attentionItems[0]
    const managerAttention = stats.overdue > 0
      ? `Review recovery plans for ${countLabel(stats.overdue, 'overdue task')}.`
      : stats.blocked > 0
        ? `Help unblock ${countLabel(stats.blocked, 'task')} that is stuck.`
        : nextMilestone && daysUntilDate(nextMilestone.dueDate) !== null && daysUntilDate(nextMilestone.dueDate) <= 7
          ? `Confirm readiness for ${nextMilestone.name}.`
          : 'No immediate escalation is needed.'

    return [
      {
        label: 'Overall status',
        value: portfolioHealth.label,
        meta: portfolioHealth.note,
        color: portfolioHealth.color,
      },
      {
        label: 'Next milestone',
        value: nextMilestone ? nextMilestone.name : 'No checkpoint set',
        meta: nextMilestone ? `Due ${fmtDate(nextMilestone.dueDate)}` : 'No checkpoint is currently visible in this scope.',
        color: nextMilestone ? '#22d3ee' : '#94a3b8',
      },
      {
        label: 'Top risk',
        value: topRisk ? topRisk.label : 'No urgent risks',
        meta: topRisk?.meta || 'Nothing currently stands out as a delivery risk.',
        color: topRisk?.color || '#10b981',
      },
      {
        label: 'Manager attention',
        value: managerAttention,
        meta: `${countLabel(filteredPrograms.length, 'program')} and ${countLabel(filteredProjects.filter((project) => !project.parentId).length, 'project')} in scope.`,
        color: stats.overdue > 0 || stats.blocked > 0 ? '#f59e0b' : '#10b981',
      },
    ]
  }, [attentionItems, filteredPrograms.length, filteredProjects, nextMilestone, portfolioHealth, stats.blocked, stats.overdue])

  const projectSummaries = useMemo(
    () => filteredProjects
      .filter((project) => !project.parentId)
      .map((project) => {
        const scopedIds = collectProjectTreeIds(project.id, filteredProjects)
        const projectTasks = filteredTasks.filter((task) => task.projectId && scopedIds.has(task.projectId))
        const projectMilestones = filteredMilestones.filter((milestone) => milestone.projectId && scopedIds.has(milestone.projectId))
        const done = projectTasks.filter((task) => task.status === 'done').length
        const blocked = projectTasks.filter((task) => task.status === 'blocked').length
        const overdue = projectTasks.filter((task) => task.dueDate && startOfDayTs(task.dueDate) < startOfDayTs(new Date()) && task.status !== 'done').length
        const completion = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0
        const nextCheckpoint = getNextMilestone(projectMilestones)
        const health = getDeliveryHealth({
          blocked,
          overdue,
          nextDate: nextCheckpoint?.dueDate || project.dueDate,
          totalTasks: projectTasks.length,
          completion,
          status: project.status,
        })
        const confidence = getConfidenceState(health.label)
        const managerAttention = overdue > 0
          ? 'Recovery plan needed'
          : blocked > 0
            ? 'Needs unblock decision'
            : nextCheckpoint && daysUntilDate(nextCheckpoint.dueDate) !== null && daysUntilDate(nextCheckpoint.dueDate) <= 7
              ? 'Checkpoint prep needed'
              : 'No escalation needed'

        return {
          ...project,
          projectTasks,
          done,
          blocked,
          overdue,
          completion,
          nextCheckpoint,
          health,
          confidence,
          managerAttention,
          programName: project.programId ? programById.get(project.programId)?.name : 'Standalone project',
        }
      })
      .sort(compareDeliveryPriority),
    [filteredMilestones, filteredProjects, filteredTasks, programById]
  )

  const watchlistItems = useMemo(() => {
    const activeTasks = filteredTasks.filter((task) => task.status !== 'done')
    const sourceTasks = activeTasks.length > 0 ? activeTasks : filteredTasks
    const enriched = sourceTasks
      .map((task) => ({
        task,
        signal: getTaskWatchSignal(task),
      }))
      .sort((left, right) => {
        if (right.signal.score !== left.signal.score) return right.signal.score - left.signal.score
        const leftDue = isValidDate(left.task.dueDate) ? startOfDayTs(left.task.dueDate) : Number.POSITIVE_INFINITY
        const rightDue = isValidDate(right.task.dueDate) ? startOfDayTs(right.task.dueDate) : Number.POSITIVE_INFINITY
        return leftDue - rightDue
      })

    const prioritized = enriched.filter((item) => item.signal.score >= 60)
    return (prioritized.length > 0 ? prioritized : enriched).slice(0, 10)
  }, [filteredTasks])

  const hiddenWatchlistCount = useMemo(() => {
    const activeCount = filteredTasks.filter((task) => task.status !== 'done').length
    const baseline = activeCount > 0 ? activeCount : filteredTasks.length
    return Math.max(baseline - watchlistItems.length, 0)
  }, [filteredTasks, watchlistItems.length])

  const sortedMilestones = useMemo(
    () => [...filteredMilestones].sort((left, right) => {
      const leftHealth = getMilestoneHealth(left)
      const rightHealth = getMilestoneHealth(right)
      const leftRank = HEALTH_PRIORITY[leftHealth.label === 'Late' ? 'Off track' : leftHealth.label === 'Upcoming' ? 'At risk' : leftHealth.label === 'Completed' ? 'Complete' : 'On track'] ?? 99
      const rightRank = HEALTH_PRIORITY[rightHealth.label === 'Late' ? 'Off track' : rightHealth.label === 'Upcoming' ? 'At risk' : rightHealth.label === 'Completed' ? 'Complete' : 'On track'] ?? 99
      if (leftRank !== rightRank) return leftRank - rightRank
      return sortDateValue(left.dueDate) - sortDateValue(right.dueDate)
    }),
    [filteredMilestones]
  )

  const clearScopeFilters = () => {
    setSelectedProgramId('')
    setSelectedProjectId('')
    setSelectedSubProjectId('')
  }

  const scrollToSection = (anchorId) => {
    if (typeof document === 'undefined') return
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const jumpToFirstAvailableSection = (...sectionIds) => {
    const match = sectionIds
      .map((sectionId) => availableSections.find((section) => section.id === sectionId))
      .find(Boolean)

    if (match?.anchorId) {
      scrollToSection(match.anchorId)
    }
  }

  const focusProgram = (programId) => {
    setSelectedProgramId(programId || '')
    setSelectedProjectId('')
    setSelectedSubProjectId('')
  }

  const focusProject = (project) => {
    if (!project) return
    setSelectedProgramId(project.programId || '')
    if (project.parentId) {
      setSelectedProjectId(project.parentId)
      setSelectedSubProjectId(project.id)
      return
    }
    setSelectedProjectId(project.id)
    setSelectedSubProjectId('')
  }

  const focusTaskScope = (task) => {
    if (!task) return
    const project = task.projectId ? allProjectById.get(task.projectId) : null
    if (project) {
      focusProject(project)
      return
    }
    focusProgram(task.programId || '')
  }

  const openWorkCount = Math.max(stats.total - stats.done, 0)
  const rootProjectCount = filteredProjects.filter((project) => !project.parentId).length
  const heroMetrics = [
    {
      label: 'Open work',
      value: openWorkCount,
      meta: `${stats.inProgress} in progress`,
      color: 'var(--text-primary)',
      onClick: () => jumpToFirstAvailableSection('delivery', 'tasks', 'overview'),
    },
    {
      label: 'Next checkpoint',
      value: nextMilestone ? fmtDate(nextMilestone.dueDate) : 'No checkpoint',
      meta: nextMilestone ? nextMilestone.name : 'No checkpoint visible in this scope.',
      color: nextMilestone ? '#22d3ee' : 'var(--text-primary)',
      onClick: () => jumpToFirstAvailableSection('milestones', 'gantt', 'overview'),
    },
    {
      label: 'Blocked',
      value: stats.blocked,
      meta: stats.blocked > 0 ? 'Work waiting on an unblock.' : 'No blocked work in view.',
      color: stats.blocked > 0 ? '#ef4444' : 'var(--text-primary)',
      onClick: () => jumpToFirstAvailableSection('tasks', 'delivery', 'overview'),
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      meta: stats.overdue > 0 ? 'Past due and not complete.' : 'Nothing currently overdue.',
      color: stats.overdue > 0 ? '#f97316' : 'var(--text-primary)',
      onClick: () => jumpToFirstAvailableSection('tasks', 'delivery', 'overview'),
    },
  ]

  return (
    <div className="min-h-dvh px-4 py-6 md:py-8" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-7xl mx-auto space-y-4">
        {(loading || error) && (
          <GlassCard padding="p-5">
            {loading ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading shared view…</p>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} style={{ color: '#ef4444', marginTop: 2 }} />
                <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}
          </GlassCard>
        )}

        {!loading && !error && (
          <>
            <GlassCard padding="p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
                    Professional Delivery View
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {link?.name || 'Shared View'}
                    </h2>
                    <HealthPill health={portfolioHealth} />
                    <InfoTooltip
                      text="Professional-only delivery snapshot with current progress, milestone health, and optional execution detail."
                      widthClassName="w-72"
                    />
                  </div>
                  <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
                    Clean, manager-ready delivery snapshot for <span style={{ color: 'var(--text-primary)' }}>{currentScopeLabel}</span>.
                    Use the scope controls below to narrow the report, then jump straight to the section you need.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {headerNotes.map((note) => (
                      <CompactNote key={note.label} label={note.label} value={note.value} />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:w-[460px]">
                  {heroMetrics.map((metric) => (
                    <HeroMetricCard
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      meta={metric.meta}
                      color={metric.color}
                      onClick={metric.onClick}
                    />
                  ))}
                </div>
              </div>
            </GlassCard>

            <ScopeBar
              eyebrow="Review scope"
              title="Focus the report without leaving the page"
              infoText="Narrow the shared view to one program or project. Every section below updates together."
              compact
              controls={
                <>
                  <select
                    value={selectedProgramId}
                    onChange={(event) => {
                      setSelectedProgramId(event.target.value)
                      setSelectedProjectId('')
                      setSelectedSubProjectId('')
                    }}
                    className="text-xs px-3 py-2 rounded-xl min-w-[170px]"
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
                      setSelectedProjectId(event.target.value)
                      setSelectedSubProjectId('')
                    }}
                    className="text-xs px-3 py-2 rounded-xl min-w-[190px]"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                    <option value="">All projects</option>
                    {visibleTopProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  {selectedProjectId && visibleSubProjects.length > 0 && (
                    <select
                      value={selectedSubProjectId}
                      onChange={(event) => setSelectedSubProjectId(event.target.value)}
                      className="text-xs px-3 py-2 rounded-xl min-w-[210px]"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                    >
                      <option value="">All sub-projects</option>
                      {visibleSubProjects.map((project) => {
                        const parent = project.parentId ? allProjectById.get(project.parentId) : null
                        const label = parent ? `${parent.name} / ${project.name}` : project.name
                        return (
                          <option key={project.id} value={project.id}>{label}</option>
                        )
                      })}
                    </select>
                  )}
                </>
              }
              actions={
                <>
                  <CompactNote
                    label="Showing"
                    value={`${countLabel(filteredPrograms.length, 'program')} · ${countLabel(rootProjectCount, 'project')} · ${countLabel(filteredTasks.length, 'task')}`}
                  />
                  {(selectedProgramId || selectedProjectId || selectedSubProjectId) ? (
                    <button
                      onClick={clearScopeFilters}
                      className="px-3 py-2 rounded-xl text-xs"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Clear scope
                    </button>
                  ) : null}
                </>
              }
            />

            {availableSections.length > 0 && (
              <GlassCard padding="p-3">
                <div className="flex flex-wrap gap-2">
                  {availableSections.map((section) => (
                    <JumpChip
                      key={section.id}
                      icon={section.icon}
                      label={section.label}
                      onClick={() => scrollToSection(section.anchorId)}
                    />
                  ))}
                </div>
              </GlassCard>
            )}

            <div className="space-y-4 min-w-0">
              {shareConfig.modules.overview && (
                <div id={SECTION_ANCHORS.overview}>
                  <Section
                    title="Executive Summary"
                    description="A concise manager snapshot of overall health, next checkpoint, top risk, and where attention is needed."
                    icon={ShieldCheck}
                    action={<HealthPill health={portfolioHealth} />}
                  >
                    <div className="grid gap-4 xl:grid-cols-[1.25fr,0.9fr]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {leadershipSummary.map((item) => (
                          <MetaCard
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            meta={item.meta}
                            color={item.color}
                          />
                        ))}
                      </div>

                      <div
                        className="rounded-2xl p-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Attention now</p>
                            <p className="text-[11px] mt-1 leading-5" style={{ color: 'var(--text-secondary)' }}>
                              Highest-signal issues in the current scope.
                            </p>
                          </div>
                          <HealthPill health={portfolioHealth} />
                        </div>

                        <div className="mt-3 space-y-3">
                          {attentionItems.length === 0 ? (
                            <div
                              className="rounded-2xl px-4 py-4 text-sm"
                              style={{ background: 'rgba(255,255,255,0.035)', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
                            >
                              No urgent delivery signals in the current scope.
                            </div>
                          ) : attentionItems.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl px-4 py-3"
                              style={{ background: 'rgba(255,255,255,0.035)', border: `1px solid ${item.color}30` }}
                            >
                              <div className="flex items-start gap-3">
                                <span className="mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {item.label}
                                  </div>
                                  <div className="text-xs mt-1 leading-5" style={{ color: 'var(--text-secondary)' }}>
                                    {item.meta}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                      <StatCard label="Complete" value={`${stats.completion}%`} color="#10b981" />
                      <StatCard label="Open work" value={openWorkCount} color="var(--text-primary)" />
                      <StatCard label="In progress" value={stats.inProgress} color="#22d3ee" />
                      <StatCard label="Blocked" value={stats.blocked} color="#ef4444" />
                      <StatCard label="Overdue" value={stats.overdue} color="#f97316" />
                      <StatCard label="Milestones" value={filteredMilestones.length} color="#a78bfa" />
                    </div>
                  </Section>
                </div>
              )}

              {shareConfig.modules.analytics && (
                <div id={SECTION_ANCHORS.analytics}>
                  <Section
                    title="Portfolio Summary"
                    description="Roll-up by program so a manager can quickly scan health, upcoming checkpoints, and where risk is accumulating."
                    icon={BarChart3}
                    action={
                      <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        {countLabel(programStats.length, 'item')}
                      </span>
                    }
                  >
                    {programStats.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No portfolio summary available.</p>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {programStats.map((stat) => (
                          <div
                            key={stat.id}
                            className="rounded-2xl p-4"
                            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${stat.color}33` }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: stat.color }} />
                                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{stat.name}</p>
                                </div>
                                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                  {countLabel(stat.projects, 'project')} · {countLabel(stat.tasks, 'task')}
                                </p>
                              </div>
                              <HealthPill health={stat.health} />
                            </div>

                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                              <div>
                                <div style={{ color: 'var(--text-secondary)' }}>Completion</div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: '#10b981' }}>{stat.completion}%</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)' }}>Blocked</div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: stat.blocked > 0 ? '#ef4444' : 'var(--text-primary)' }}>{stat.blocked}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)' }}>Overdue</div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: stat.overdue > 0 ? '#f97316' : 'var(--text-primary)' }}>{stat.overdue}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)' }}>Open work</div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.max(stat.tasks - stat.done, 0)}</div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <MetaCard
                                label="Next checkpoint"
                                value={stat.nextMilestone ? stat.nextMilestone.name : 'No checkpoint set'}
                                meta={stat.nextMilestone ? `Due ${fmtDate(stat.nextMilestone.dueDate)}` : 'No milestone is visible in this scope.'}
                                color={stat.nextMilestone ? '#22d3ee' : 'var(--text-primary)'}
                              />
                              <MetaCard
                                label="Why it matters"
                                value={stat.health.label}
                                meta={stat.health.note}
                                color={stat.health.color}
                              />
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <ActionButton
                                label={stat.id === 'standalone-work' ? 'Review delivery' : 'Focus this program'}
                                onClick={() => {
                                  if (stat.id === 'standalone-work') {
                                    clearScopeFilters()
                                  } else {
                                    focusProgram(stat.id)
                                  }
                                  jumpToFirstAvailableSection('delivery', 'tasks', 'overview')
                                }}
                              />
                              {shareConfig.modules.milestones && (
                                <ActionButton
                                  label="See milestones"
                                  onClick={() => {
                                    if (stat.id !== 'standalone-work') focusProgram(stat.id)
                                    jumpToFirstAvailableSection('milestones', 'gantt', 'overview')
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {shareConfig.modules.projects && (
                <div id={SECTION_ANCHORS.delivery}>
                  <Section
                    title="Delivery Overview"
                    description="Project-by-project view of health, next checkpoint, timing confidence, and where manager attention may be needed."
                    icon={FolderKanban}
                  >
                    {projectSummaries.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No projects available.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {projectSummaries.map((project) => (
                          <div
                            key={project.id}
                            className="rounded-2xl p-4"
                            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${project.color}33` }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                    {project.name}
                                  </p>
                                </div>
                                <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                                  {project.programName}
                                </p>
                                {project.description ? (
                                  <p className="text-[11px] mt-2 leading-5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                                    {project.description}
                                  </p>
                                ) : null}
                              </div>
                              <HealthPill health={project.health} />
                            </div>

                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                              <div>
                                <div style={{ color: 'var(--text-secondary)' }}>Tasks</div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{project.projectTasks.length}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)' }}>Completion</div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: '#10b981' }}>{project.completion}%</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)' }}>Blocked</div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: project.blocked > 0 ? '#ef4444' : 'var(--text-primary)' }}>{project.blocked}</div>
                              </div>
                              <div>
                                <div style={{ color: 'var(--text-secondary)' }}>Overdue</div>
                                <div className="mt-1 text-sm font-semibold" style={{ color: project.overdue > 0 ? '#f97316' : 'var(--text-primary)' }}>{project.overdue}</div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <MetaCard
                                label="Next checkpoint"
                                value={project.nextCheckpoint ? project.nextCheckpoint.name : 'No checkpoint set'}
                                meta={project.nextCheckpoint ? `Due ${fmtDate(project.nextCheckpoint.dueDate)}` : project.dueDate ? `Target date ${fmtDate(project.dueDate)}` : 'No date is visible in this scope.'}
                                color={project.nextCheckpoint ? '#22d3ee' : 'var(--text-primary)'}
                              />
                              <MetaCard
                                label="Date confidence"
                                value={project.confidence.label}
                                meta={project.health.note}
                                color={project.confidence.color}
                              />
                              <MetaCard
                                label="Manager attention"
                                value={project.managerAttention}
                                meta={project.overdue > 0 ? `${countLabel(project.overdue, 'overdue task')} need action.` : project.blocked > 0 ? `${countLabel(project.blocked, 'blocked task')} need follow-up.` : `${project.completion}% complete.`}
                                color={project.overdue > 0 || project.blocked > 0 ? '#f59e0b' : '#10b981'}
                              />
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <ActionButton
                                label="Focus this project"
                                onClick={() => focusProject(project)}
                              />
                              <ActionButton
                                label={shareConfig.modules.tasks ? 'Review risks' : 'Review milestones'}
                                onClick={() => {
                                  focusProject(project)
                                  jumpToFirstAvailableSection('tasks', 'milestones', 'overview')
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {shareConfig.modules.tasks && (
                <div id={SECTION_ANCHORS.tasks}>
                  <Section
                    title="Execution Watchlist"
                    description="Highest-signal tasks in the current scope, trimmed down for leadership review rather than full execution tracking."
                    icon={Lock}
                    action={
                      <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        {watchlistItems.length} shown{hiddenWatchlistCount > 0 ? ` · ${hiddenWatchlistCount} hidden` : ''}
                      </span>
                    }
                  >
                    {filteredTasks.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No tasks in this shared scope.</p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                          The watchlist surfaces only the tasks most likely to need follow-up, escalation, or a decision.
                        </p>

                        <div className="grid grid-cols-1 gap-3">
                          {watchlistItems.map((item) => {
                            const task = item.task
                            const project = task.projectId ? allProjectById.get(task.projectId) : null
                            const parentProject = project?.parentId ? allProjectById.get(project.parentId) : null
                            const programId = getTaskProgramId(task, projects)
                            const program = programId ? programById.get(programId) : null
                            const dependencies = task.dependsOn?.map((dependencyId) => taskById.get(dependencyId)?.title || 'Unavailable task').filter(Boolean) || []

                            return (
                              <div
                                key={task.id}
                                className="rounded-2xl p-4"
                                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${item.signal.color}30` }}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                        style={{ background: `${item.signal.color}18`, color: item.signal.color }}
                                      >
                                        {item.signal.label}
                                      </span>
                                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                                    </div>
                                    <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                                      {[program?.name, parentProject?.name, project?.name].filter(Boolean).join(' / ') || 'Standalone work'}
                                    </p>
                                    <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                                      {item.signal.note}
                                    </p>
                                  </div>

                                  <ActionButton
                                    label="Focus item"
                                    onClick={() => focusTaskScope(task)}
                                  />
                                </div>

                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                                  <div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Status</div>
                                    <div className="mt-1 text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{task.status.replace('-', ' ')}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Priority</div>
                                    <div className="mt-1 text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{task.priority}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Due</div>
                                    <div className="mt-1 text-sm font-semibold" style={{ color: task.dueDate ? item.signal.color : 'var(--text-primary)' }}>{fmtDate(task.dueDate)}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Dependencies</div>
                                    <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                      {dependencies.length > 0 ? countLabel(dependencies.length, 'dependency') : 'None'}
                                    </div>
                                  </div>
                                </div>

                                {shareConfig.modules.dependencies && dependencies.length > 0 && (
                                  <p className="mt-3 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                                    Depends on: {dependencies.join(', ')}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {shareConfig.modules.milestones && (
                <div id={SECTION_ANCHORS.milestones}>
                  <Section
                    title="Milestones"
                    description="Upcoming and completed delivery checkpoints inside the shared scope."
                    icon={CalendarClock}
                    action={
                      <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        {countLabel(sortedMilestones.length, 'milestone')}
                      </span>
                    }
                  >
                    {sortedMilestones.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No milestones available in this scope.</p>
                    ) : (
                      <div className="space-y-4">
                        <MilestoneTimeline
                          milestones={milestoneTimelineItems}
                          compact
                          emptyLabel="No milestone dates in this shared scope."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {sortedMilestones.map((milestone) => {
                            const project = milestone.projectId ? allProjectById.get(milestone.projectId) : null
                            const program = project?.programId ? programById.get(project.programId) : null
                            const milestoneHealth = getMilestoneHealth(milestone)

                            return (
                              <div
                                key={milestone.id}
                                className="rounded-2xl p-4"
                                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${milestoneHealth.color}28` }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{milestone.name}</p>
                                    <p className="mt-1 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                                      {[program?.name, project?.name].filter(Boolean).join(' / ') || 'No linked project'}
                                    </p>
                                  </div>
                                  <span
                                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                    style={{ background: `${milestoneHealth.color}18`, color: milestoneHealth.color }}
                                  >
                                    {milestoneHealth.label}
                                  </span>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                                  <div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Due</div>
                                    <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtDate(milestone.dueDate)}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Status</div>
                                    <div className="mt-1 text-sm font-semibold capitalize" style={{ color: milestoneHealth.color }}>
                                      {milestone.completed ? 'completed' : milestone.status}
                                    </div>
                                  </div>
                                </div>

                                <p className="mt-3 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                                  {milestoneHealth.note}
                                </p>

                                {project && (
                                  <div className="mt-3">
                                    <ActionButton
                                      label="Focus related project"
                                      onClick={() => focusProject(project)}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {shareConfig.modules.gantt && (
                <div id={SECTION_ANCHORS.gantt}>
                  <Section
                    title="Timeline"
                    description="Milestone-first timeline with the detailed schedule available below when a deeper review is needed."
                    icon={ShieldCheck}
                    padding="p-4"
                  >
                    <div className="space-y-4">
                      <MilestoneTimeline
                        milestones={milestoneTimelineItems}
                        compact
                        emptyLabel="No milestone dates in this shared scope."
                      />
                      <div
                        className="rounded-2xl px-4 py-3 text-xs leading-5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
                      >
                        Start with milestone timing, then use the detailed schedule below if you need a deeper delivery review.
                      </div>
                      <ManagerGantt
                        programs={filteredPrograms}
                        projects={filteredProjects}
                        tasks={filteredTasks}
                        milestones={filteredMilestones}
                      />
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <a href={window.location.origin} className="inline-flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--accent)' }}>
            Powered by TaskFlow <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}
