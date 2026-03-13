import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ExternalLink,
  Filter,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  DEFAULT_SHARE_CONFIG,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  isShareLinkActive,
  normalizeShareConfig,
} from '../lib/share'
import TimelineToolbar from '../components/timeline/TimelineToolbar'
import TimelineFilterBar from '../components/timeline/TimelineFilterBar'
import TimelineGrid from '../components/timeline/TimelineGrid'
import TimelineLegend from '../components/timeline/TimelineLegend'
import useTimelineScale from '../hooks/useTimelineScale'
import useTimelineRows from '../hooks/useTimelineRows'
import { TIMELINE_VIEW_MODES } from '../components/timeline/timelineConfig'
import { getTaskProgramId } from '../lib/taskScope'

const PRIORITY_COLOR = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#94a3b8',
}

const STATUS_COLOR = {
  todo: '#94a3b8',
  'in-progress': '#22d3ee',
  review: '#f59e0b',
  blocked: '#ef4444',
  done: '#10b981',
}

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
  name: row.name,
  description: row.description || '',
  dueDate: row.due_date || '',
  status: row.status || 'pending',
  completed: Boolean(row.completed),
})

const StatCard = ({ label, value, color }) => (
  <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    <p className="text-base font-bold mt-1" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
  </div>
)

const Section = ({ title, icon: Icon, children }) => (
  <section
    className="rounded-2xl p-4"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
  >
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} style={{ color: 'var(--accent)' }} />
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
    </div>
    {children}
  </section>
)

const ManagerGantt = ({ programs, projects, tasks, milestones }) => {
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
    <div className="space-y-2.5">
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
  const [programs, setPrograms] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [milestones, setMilestones] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedSubProjectId, setSelectedSubProjectId] = useState('')

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
          supabase.from('tasks').select('*').eq('workspace_id', workspaceId),
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
          supabase.from('tasks').select('*').eq('program_id', program.id).is('project_id', null),
          projectIds.length > 0
            ? supabase.from('tasks').select('*').in('project_id', projectIds)
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

        if (project.program_id) {
          const programRes = await supabase.from('programs').select('*').eq('id', project.program_id).maybeSingle()
          if (!programRes.error && programRes.data) programRows = [programRes.data]
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
        const taskRes = await supabase.from('tasks').select('*').in('project_id', [...descendantIds])
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

      const mappedPrograms = programRows.map(mapProgram)
      const mappedProjects = projectRows.map(mapProject)
      const mappedTasks = taskRows.map(mapTask)

      if (config.modules.milestones) {
        const projectIds = mappedProjects.map((project) => project.id)
        if (projectIds.length > 0) {
          const milestoneRes = await supabase.from('milestones').select('*').in('project_id', projectIds)
          if (!milestoneRes.error) milestoneRows = (milestoneRes.data ?? []).map(mapMilestone)
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

  const projectById = useMemo(() => new Map(filteredProjects.map((project) => [project.id, project])), [filteredProjects])
  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs])

  const stats = useMemo(() => {
    const total = filteredTasks.length
    const done = filteredTasks.filter((task) => task.status === 'done').length
    const blocked = filteredTasks.filter((task) => task.status === 'blocked').length
    const inProgress = filteredTasks.filter((task) => task.status === 'in-progress').length
    const overdue = filteredTasks.filter((task) => task.dueDate && startOfDayTs(task.dueDate) < startOfDayTs(new Date()) && task.status !== 'done').length
    const completion = total ? Math.round((done / total) * 100) : 0
    return { total, done, blocked, inProgress, overdue, completion }
  }, [filteredTasks])

  const programStats = useMemo(() => {
    return filteredPrograms.map((program) => {
      const programProjects = filteredProjects.filter((project) => project.programId === program.id)
      const projectIds = new Set(programProjects.map((project) => project.id))
      const programTasks = filteredTasks.filter((task) =>
        getTaskProgramId(task, projects) === program.id &&
        (!task.projectId || projectIds.has(task.projectId))
      )
      const done = programTasks.filter((task) => task.status === 'done').length
      return {
        id: program.id,
        name: program.name,
        color: program.color,
        projects: programProjects.length,
        tasks: programTasks.length,
        done,
        completion: programTasks.length ? Math.round((done / programTasks.length) * 100) : 0,
        blocked: programTasks.filter((task) => task.status === 'blocked').length,
      }
    })
  }, [filteredPrograms, filteredProjects, filteredTasks])

  return (
    <div className="min-h-dvh px-4 py-6 md:py-8" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-6xl mx-auto space-y-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
        >
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading shared dashboard…</p>
          ) : error ? (
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} style={{ color: '#ef4444', marginTop: 2 }} />
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {link?.name || 'Manager View'}
              </h1>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Live read-only snapshot of progress, analytics, and delivery timeline.
              </p>
            </>
          )}
        </div>

        {!loading && !error && (
          <>
            <Section title="Scope Filters" icon={Filter}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div>
                  <p className="text-[10px] mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Program</p>
                  <select
                    value={selectedProgramId}
                    onChange={(event) => {
                      setSelectedProgramId(event.target.value)
                      setSelectedProjectId('')
                      setSelectedSubProjectId('')
                    }}
                    className="w-full px-2.5 py-2 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                    <option value="">All programs</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Project</p>
                  <select
                    value={selectedProjectId}
                    onChange={(event) => {
                      setSelectedProjectId(event.target.value)
                      setSelectedSubProjectId('')
                    }}
                    className="w-full px-2.5 py-2 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                    <option value="">All projects</option>
                    {visibleTopProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sub-project</p>
                  <select
                    value={selectedSubProjectId}
                    onChange={(event) => setSelectedSubProjectId(event.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                    <option value="">All sub-projects</option>
                    {visibleSubProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProgramId('')
                  setSelectedProjectId('')
                  setSelectedSubProjectId('')
                }}
                className="px-2.5 py-1 rounded-lg text-[11px]"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Clear filters
              </button>
            </Section>

            {shareConfig.modules.overview && (
              <Section title="Overview" icon={ShieldCheck}>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <StatCard label="Programs" value={filteredPrograms.length} />
                  <StatCard label="Projects" value={filteredProjects.filter((project) => !project.parentId).length} />
                  <StatCard label="Tasks" value={stats.total} />
                  <StatCard label="Done %" value={`${stats.completion}%`} color="#10b981" />
                  <StatCard label="Blocked" value={stats.blocked} color="#ef4444" />
                  <StatCard label="Overdue" value={stats.overdue} color="#f97316" />
                </div>
              </Section>
            )}

            {shareConfig.modules.analytics && (
              <Section title="Program Analytics" icon={BarChart3}>
                {programStats.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No program analytics available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead>
                        <tr style={{ color: 'var(--text-secondary)' }}>
                          <th className="text-left py-2">Program</th>
                          <th className="text-left py-2">Projects</th>
                          <th className="text-left py-2">Tasks</th>
                          <th className="text-left py-2">Done</th>
                          <th className="text-left py-2">Blocked</th>
                          <th className="text-left py-2">Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {programStats.map((stat) => (
                          <tr key={stat.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <td className="py-2">
                              <span className="inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                                <span style={{ color: 'var(--text-primary)' }}>{stat.name}</span>
                              </span>
                            </td>
                            <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{stat.projects}</td>
                            <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{stat.tasks}</td>
                            <td className="py-2" style={{ color: '#10b981' }}>{stat.done}</td>
                            <td className="py-2" style={{ color: '#ef4444' }}>{stat.blocked}</td>
                            <td className="py-2" style={{ color: 'var(--text-primary)' }}>{stat.completion}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}

            {shareConfig.modules.projects && (
              <Section title="Project Delivery Board" icon={CalendarClock}>
                {filteredProjects.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No projects available.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredProjects.filter((project) => !project.parentId).map((project) => {
                      const projectTasks = filteredTasks.filter((task) => task.projectId === project.id)
                      const done = projectTasks.filter((task) => task.status === 'done').length
                      const completion = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0
                      const programName = project.programId ? programById.get(project.programId)?.name : 'Unassigned'
                      return (
                        <div
                          key={project.id}
                          className="rounded-xl p-3"
                          style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${project.color}33` }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {project.name}
                              </p>
                              <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                {programName}
                              </p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${project.color}22`, color: project.color }}>
                              {completion}%
                            </span>
                          </div>
                          {project.description && (
                            <p className="text-[11px] mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                            <span>Start: {fmtDate(project.startDate)}</span>
                            <span>Due: {fmtDate(project.dueDate)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Section>
            )}

            {shareConfig.modules.tasks && (
              <Section title="Task Details" icon={Lock}>
                {filteredTasks.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No tasks in this shared scope.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[920px]">
                      <thead>
                        <tr style={{ color: 'var(--text-secondary)' }}>
                          <th className="text-left py-2">Task</th>
                          <th className="text-left py-2">Project</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2">Priority</th>
                          <th className="text-left py-2">Start</th>
                          <th className="text-left py-2">Due</th>
                          {shareConfig.modules.dependencies && <th className="text-left py-2">Dependencies</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks
                          .slice()
                          .sort((a, b) => {
                            if (!a.dueDate && !b.dueDate) return 0
                            if (!a.dueDate) return 1
                            if (!b.dueDate) return -1
                            return startOfDayTs(a.dueDate) - startOfDayTs(b.dueDate)
                          })
                          .map((task) => {
                            const project = task.projectId ? projectById.get(task.projectId) : null
                            const program = getTaskProgramId(task, projects)
                              ? programById.get(getTaskProgramId(task, projects))
                              : null
                            return (
                              <tr key={task.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <td className="py-2">
                                  <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                                  {shareConfig.modules.details && task.description && (
                                    <p className="text-[10px] line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                                      {task.description}
                                    </p>
                                  )}
                                </td>
                                <td className="py-2" style={{ color: 'var(--text-secondary)' }}>
                                  {project?.name || (program ? `${program.name} · Program` : '—')}
                                </td>
                                <td className="py-2">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[task.status] || '#94a3b8'}22`, color: STATUS_COLOR[task.status] || '#94a3b8' }}>
                                    {TASK_STATUS_OPTIONS.find((item) => item.key === task.status)?.label || task.status}
                                  </span>
                                </td>
                                <td className="py-2">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${PRIORITY_COLOR[task.priority] || '#94a3b8'}22`, color: PRIORITY_COLOR[task.priority] || '#94a3b8' }}>
                                    {TASK_PRIORITY_OPTIONS.find((item) => item.key === task.priority)?.label || task.priority}
                                  </span>
                                </td>
                                <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{fmtDate(task.startDate)}</td>
                                <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{fmtDate(task.dueDate)}</td>
                                {shareConfig.modules.dependencies && (
                                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>
                                    {task.dependsOn?.length ? task.dependsOn.join(', ') : '—'}
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}

            {shareConfig.modules.milestones && (
              <Section title="Milestones" icon={CalendarClock}>
                {filteredMilestones.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No milestones available in this scope.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[680px]">
                      <thead>
                        <tr style={{ color: 'var(--text-secondary)' }}>
                          <th className="text-left py-2">Milestone</th>
                          <th className="text-left py-2">Project</th>
                          <th className="text-left py-2">Due Date</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMilestones.map((milestone) => {
                          const project = milestone.projectId ? projectById.get(milestone.projectId) : null
                          return (
                            <tr key={milestone.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{milestone.name}</td>
                              <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{project?.name || '—'}</td>
                              <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{fmtDate(milestone.dueDate)}</td>
                              <td className="py-2" style={{ color: milestone.completed ? '#10b981' : '#f59e0b' }}>
                                {milestone.completed ? 'Completed' : milestone.status}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}

            {shareConfig.modules.gantt && (
              <Section title="Read-only Gantt" icon={CalendarClock}>
                <ManagerGantt
                  programs={filteredPrograms}
                  projects={filteredProjects}
                  tasks={filteredTasks}
                  milestones={filteredMilestones}
                />
              </Section>
            )}
          </>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <Lock size={12} />
          Read-only view
          <span>•</span>
          <a href={window.location.origin} className="inline-flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--accent)' }}>
            Powered by TaskFlow <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}
