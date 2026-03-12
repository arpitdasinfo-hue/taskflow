import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ExternalLink,
  Link2,
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
  scopeLabel,
} from '../lib/share'

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

const buildGanttRows = ({ programs, projects, tasks }) => {
  const childrenByProjectId = new Map()
  const tasksByProjectId = new Map()

  projects.forEach((project) => {
    if (!project.parentId) return
    if (!childrenByProjectId.has(project.parentId)) childrenByProjectId.set(project.parentId, [])
    childrenByProjectId.get(project.parentId).push(project)
  })
  tasks.forEach((task) => {
    if (!task.projectId) return
    if (!tasksByProjectId.has(task.projectId)) tasksByProjectId.set(task.projectId, [])
    tasksByProjectId.get(task.projectId).push(task)
  })

  const topProjects = projects.filter((project) => !project.parentId)
  const projectIdsByProgram = new Map()
  topProjects.forEach((project) => {
    const key = project.programId || '__unassigned__'
    if (!projectIdsByProgram.has(key)) projectIdsByProgram.set(key, [])
    projectIdsByProgram.get(key).push(project)
  })

  const rows = []

  const collectTaskDates = (project) => {
    const directTasks = tasksByProjectId.get(project.id) ?? []
    const childProjects = childrenByProjectId.get(project.id) ?? []
    const childTaskDates = childProjects.flatMap(collectTaskDates)
    const taskDates = [
      ...directTasks.map((task) => ({
        start: task.startDate || task.createdAt || task.dueDate || '',
        end: task.dueDate || task.startDate || '',
      })),
      ...childTaskDates,
    ]
    return taskDates.filter((item) => isValidDate(item.start || item.end))
  }

  const computeRange = (project) => {
    const derived = collectTaskDates(project)
    const starts = derived.map((item) => item.start).filter(isValidDate).map(startOfDayTs)
    const ends = derived.map((item) => item.end).filter(isValidDate).map(startOfDayTs)
    const startTs = starts.length ? Math.min(...starts) : (isValidDate(project.startDate) ? startOfDayTs(project.startDate) : null)
    const endTs = ends.length ? Math.max(...ends) : (isValidDate(project.dueDate) ? startOfDayTs(project.dueDate) : startTs)
    return { startTs, endTs }
  }

  const pushProjectRows = (project, depth, programName) => {
    const projectTasks = tasksByProjectId.get(project.id) ?? []
    const projectDone = projectTasks.filter((task) => task.status === 'done').length
    const progress = projectTasks.length ? Math.round((projectDone / projectTasks.length) * 100) : 0
    const range = computeRange(project)

    rows.push({
      id: `project:${project.id}`,
      type: depth === 0 ? 'project' : 'sub-project',
      depth,
      name: project.name,
      leftLabel: programName,
      color: project.color || '#22d3ee',
      startTs: range.startTs,
      endTs: range.endTs,
      progress,
      status: project.status,
    })

    const childProjects = childrenByProjectId.get(project.id) ?? []
    childProjects.forEach((child) => pushProjectRows(child, depth + 1, programName))

    projectTasks
      .slice()
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return startOfDayTs(a.dueDate) - startOfDayTs(b.dueDate)
      })
      .forEach((task) => {
        const startTs = isValidDate(task.startDate || task.createdAt || task.dueDate)
          ? startOfDayTs(task.startDate || task.createdAt || task.dueDate)
          : null
        const endTs = isValidDate(task.dueDate || task.startDate)
          ? startOfDayTs(task.dueDate || task.startDate)
          : startTs
        rows.push({
          id: `task:${task.id}`,
          type: 'task',
          depth: depth + 1,
          name: task.title,
          leftLabel: project.name,
          color: STATUS_COLOR[task.status] || '#22d3ee',
          startTs,
          endTs,
          progress: task.status === 'done' ? 100 : task.status === 'in-progress' ? 55 : task.status === 'review' ? 80 : 0,
          status: task.status,
        })
      })
  }

  programs.forEach((program) => {
    const programProjects = projectIdsByProgram.get(program.id) ?? []
    const programTaskRanges = programProjects.map((project) => computeRange(project))
    const starts = programTaskRanges.map((range) => range.startTs).filter(Boolean)
    const ends = programTaskRanges.map((range) => range.endTs).filter(Boolean)
    rows.push({
      id: `program:${program.id}`,
      type: 'program',
      depth: 0,
      name: program.name,
      leftLabel: scopeLabel('program'),
      color: program.color || '#22d3ee',
      startTs: starts.length ? Math.min(...starts) : (isValidDate(program.startDate) ? startOfDayTs(program.startDate) : null),
      endTs: ends.length ? Math.max(...ends) : (isValidDate(program.endDate) ? startOfDayTs(program.endDate) : null),
      progress: 0,
      status: program.status,
    })
    programProjects.forEach((project) => pushProjectRows(project, 0, program.name))
  })

  const unassignedProjects = projectIdsByProgram.get('__unassigned__') ?? []
  if (unassignedProjects.length > 0) {
    rows.push({
      id: 'program:__unassigned__',
      type: 'program',
      depth: 0,
      name: 'Unassigned',
      leftLabel: 'Program',
      color: '#94a3b8',
      startTs: null,
      endTs: null,
      progress: 0,
      status: 'active',
    })
    unassignedProjects.forEach((project) => pushProjectRows(project, 0, 'Unassigned'))
  }

  return rows.filter((row) => row.startTs && row.endTs)
}

const ReadOnlyGantt = ({ rows }) => {
  if (!rows.length) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        No timeline data available for this scope.
      </p>
    )
  }

  const minTs = Math.min(...rows.map((row) => row.startTs))
  const maxTs = Math.max(...rows.map((row) => row.endTs))
  const daySpan = Math.max(7, Math.ceil((maxTs - minTs) / 86400000) + 1)

  return (
    <div
      className="rounded-xl border overflow-x-auto"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="min-w-[840px]">
        <div
          className="flex items-center justify-between px-3 py-2 text-[11px]"
          style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span>{fmtDate(minTs)}</span>
          <span>{daySpan} day window</span>
          <span>{fmtDate(maxTs)}</span>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {rows.map((row) => {
            const left = ((row.startTs - minTs) / (daySpan * 86400000)) * 100
            const width = Math.max(1.5, ((row.endTs - row.startTs + 86400000) / (daySpan * 86400000)) * 100)
            return (
              <div key={row.id} className="flex items-center gap-3 px-3 py-2">
                <div className="w-[290px] min-w-[290px]">
                  <p
                    className="text-xs font-semibold truncate"
                    style={{ color: 'var(--text-primary)', paddingLeft: `${row.depth * 12}px` }}
                  >
                    {row.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)', paddingLeft: `${row.depth * 12}px` }}>
                    {row.type} • {row.leftLabel}
                  </p>
                </div>
                <div className="flex-1 h-6 rounded-full relative" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div
                    className="absolute top-1 bottom-1 rounded-full"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      minWidth: '6px',
                      background: `${row.color}4d`,
                      border: `1px solid ${row.color}99`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
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
        setLink(sharedLink)
        setShareConfig(config)
      }

      const scopeType = sharedLink.resource_type
      const scopeId = sharedLink.resource_id
      const workspaceId = sharedLink.workspace_id

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
        if (projectIds.length > 0) {
          const taskRes = await supabase.from('tasks').select('*').in('project_id', projectIds)
          if (taskRes.error) {
            if (!cancelled) {
              setError(taskRes.error.message)
              setLoading(false)
            }
            return
          }
          taskRows = taskRes.data ?? []
        }
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

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const programById = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs])

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((task) => task.status === 'done').length
    const blocked = tasks.filter((task) => task.status === 'blocked').length
    const inProgress = tasks.filter((task) => task.status === 'in-progress').length
    const overdue = tasks.filter((task) => task.dueDate && startOfDayTs(task.dueDate) < startOfDayTs(new Date()) && task.status !== 'done').length
    const completion = total ? Math.round((done / total) * 100) : 0
    return { total, done, blocked, inProgress, overdue, completion }
  }, [tasks])

  const programStats = useMemo(() => {
    return programs.map((program) => {
      const programProjects = projects.filter((project) => project.programId === program.id)
      const projectIds = new Set(programProjects.map((project) => project.id))
      const programTasks = tasks.filter((task) => task.projectId && projectIds.has(task.projectId))
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
  }, [programs, projects, tasks])

  const ganttRows = useMemo(
    () => buildGanttRows({ programs, projects, tasks }),
    [programs, projects, tasks]
  )

  const scope = scopeLabel(link?.resource_type)

  return (
    <div className="min-h-dvh px-4 py-6 md:py-8" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-6xl mx-auto space-y-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
              <Link2 size={13} />
              Shared Manager Dashboard
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
            >
              {scope}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
            >
              View only
            </span>
          </div>

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
            {shareConfig.modules.overview && (
              <Section title="Overview" icon={ShieldCheck}>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <StatCard label="Programs" value={programs.length} />
                  <StatCard label="Projects" value={projects.filter((project) => !project.parentId).length} />
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
                {projects.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No projects available.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {projects.filter((project) => !project.parentId).map((project) => {
                      const projectTasks = tasks.filter((task) => task.projectId === project.id)
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
                {tasks.length === 0 ? (
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
                        {tasks
                          .slice()
                          .sort((a, b) => {
                            if (!a.dueDate && !b.dueDate) return 0
                            if (!a.dueDate) return 1
                            if (!b.dueDate) return -1
                            return startOfDayTs(a.dueDate) - startOfDayTs(b.dueDate)
                          })
                          .map((task) => {
                            const project = task.projectId ? projectById.get(task.projectId) : null
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
                                <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{project?.name || '—'}</td>
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
                {milestones.length === 0 ? (
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
                        {milestones.map((milestone) => {
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
                <ReadOnlyGantt rows={ganttRows} />
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
