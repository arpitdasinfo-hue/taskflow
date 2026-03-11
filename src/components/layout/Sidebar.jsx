import { memo, useState } from 'react'
import {
  LayoutDashboard, ListTodo, CalendarClock, Settings2, FolderKanban,
  Zap, ChevronLeft, ChevronRight, Plus, Folder, ChevronDown, BarChart3, GanttChart,
} from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import useProjectStore from '../../store/useProjectStore'
import useTaskStore from '../../store/useTaskStore'
import { useTaskStats } from '../../hooks/useFilteredTasks'

const NAV_ITEMS = [
  { id: 'dashboard',         label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'tasks',             label: 'All Tasks',  icon: ListTodo        },
  { id: 'today',             label: 'Today',      icon: CalendarClock   },
  { id: 'projects',          label: 'Programs',   icon: FolderKanban    },
  { id: 'program-dashboard', label: 'Analytics',  icon: BarChart3       },
  { id: 'timeline',          label: 'Timeline',   icon: GanttChart      },
  { id: 'settings',          label: 'Settings',   icon: Settings2       },
]

const PROGRAM_STATUS_COLORS = {
  planning:  '#94a3b8',
  active:    '#22d3ee',
  'on-hold': '#f59e0b',
  completed: '#10b981',
}

// ── Program group with nested projects ───────────────────────────────────────
const ProgramGroup = memo(function ProgramGroup({ program, projects, collapsed }) {
  const [open, setOpen]      = useState(true)
  const activeProjectId      = useSettingsStore((s) => s.activeProjectId)
  const activeProgramId      = useSettingsStore((s) => s.activeProgramId)
  const setActiveProject     = useSettingsStore((s) => s.setActiveProject)
  const setActiveProgram     = useSettingsStore((s) => s.setActiveProgram)
  const setPage              = useSettingsStore((s) => s.setPage)
  const tasks                = useTaskStore((s) => s.tasks)
  const allProjects          = useProjectStore((s) => s.projects)
  const taskCount = (pid) => tasks.filter((t) => t.projectId === pid && t.status !== 'done').length
  const statusColor = PROGRAM_STATUS_COLORS[program.status] || '#94a3b8'

  const handleProgramClick = () => {
    if (collapsed) return
    setOpen((o) => !o)
  }

  const handleProgramFilter = (e) => {
    e.stopPropagation()
    const isActive = activeProgramId === program.id
    setActiveProgram(isActive ? null : program.id)
    setPage('tasks')
  }

  if (collapsed) {
    return (
      <>
        {projects.map((p) => {
          const isActive = activeProjectId === p.id
          return (
            <button key={p.id}
              onClick={() => setActiveProject(isActive ? null : p.id)}
              className="w-full flex items-center justify-center py-2 rounded-xl mb-0.5 transition-all"
              style={isActive ? { background: `${p.color}20` } : {}}
              title={p.name}>
              <span className="w-2 h-2 rounded-full"
                style={{ background: p.color, boxShadow: isActive ? `0 0 6px ${p.color}` : 'none' }} />
            </button>
          )
        })}
      </>
    )
  }

  // Top-level projects only
  const topLevel = projects.filter((p) => !p.parentId)

  return (
    <div className="mb-1">
      {/* Program row */}
      <button
        onClick={handleProgramClick}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg mb-0.5 transition-colors hover:bg-white/5"
      >
        <span className="w-2 h-2 rounded flex-shrink-0"
          style={{ background: program.color, boxShadow: `0 0 4px ${program.color}60` }} />
        <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-wider truncate"
          style={{ color: 'var(--text-secondary)' }}>
          {program.name}
        </span>
        {/* Status dot */}
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" title={program.status || 'planning'}
          style={{ background: statusColor }} />
        <ChevronDown size={10} style={{
          color: 'var(--text-secondary)',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }} />
      </button>

      {/* Projects nested under program */}
      {open && topLevel.map((project) => {
        const isActive = activeProjectId === project.id
        const count    = taskCount(project.id)
        const subProjects = allProjects.filter((p) => p.parentId === project.id)

        return (
          <div key={project.id}>
            <button
              onClick={() => setActiveProject(isActive ? null : project.id)}
              className="w-full flex items-center gap-2 pl-5 pr-2 py-1.5 rounded-xl text-xs font-medium transition-all mb-0.5"
              style={isActive
                ? { background: `${project.color}20`, color: project.color, border: `1px solid ${project.color}30` }
                : { color: 'var(--text-secondary)' }
              }
              title={project.name}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: project.color, boxShadow: isActive ? `0 0 5px ${project.color}` : 'none' }} />
              <span className="flex-1 text-left truncate">{project.name}</span>
              {count > 0 && (
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center"
                  style={isActive
                    ? { background: `${project.color}30`, color: project.color }
                    : { background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }
                  }>
                  {count}
                </span>
              )}
            </button>

            {/* Sub-projects (3rd level) */}
            {isActive && subProjects.map((sub) => {
              const isSubActive = activeProjectId === sub.id
              const subCount    = taskCount(sub.id)
              return (
                <button key={sub.id}
                  onClick={(e) => { e.stopPropagation(); setActiveProject(isSubActive ? null : sub.id) }}
                  className="w-full flex items-center gap-2 pl-9 pr-2 py-1 rounded-xl text-[11px] font-medium transition-all mb-0.5"
                  style={isSubActive
                    ? { background: `${sub.color}20`, color: sub.color, border: `1px solid ${sub.color}30` }
                    : { color: 'var(--text-secondary)' }
                  }
                  title={sub.name}>
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: sub.color }} />
                  <span className="flex-1 text-left truncate">{sub.name}</span>
                  {subCount > 0 && (
                    <span className="text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>
                      {subCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
})

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = memo(function Sidebar() {
  const activePage        = useSettingsStore((s) => s.activePage)
  const sidebarCollapsed  = useSettingsStore((s) => s.sidebarCollapsed)
  const activeProjectId   = useSettingsStore((s) => s.activeProjectId)
  const activeProgramId   = useSettingsStore((s) => s.activeProgramId)
  const setPage           = useSettingsStore((s) => s.setPage)
  const toggleSidebar     = useSettingsStore((s) => s.toggleSidebar)
  const setActiveProject  = useSettingsStore((s) => s.setActiveProject)
  const setActiveProgram  = useSettingsStore((s) => s.setActiveProgram)
  const programs          = useProjectStore((s) => s.programs)
  const projects          = useProjectStore((s) => s.projects)
  const tasks             = useTaskStore((s) => s.tasks)
  const { overdue, inProgress } = useTaskStats()

  const unassigned = projects.filter(
    (p) => !p.programId || !programs.find((prog) => prog.id === p.programId)
  )

  return (
    <aside
      className={`
        hidden md:flex flex-col h-full transition-all duration-300 ease-in-out
        glass border-r-0 rounded-none
        ${sidebarCollapsed ? 'w-[64px]' : 'w-[228px]'}
      `}
      style={{ borderRight: '1px solid var(--glass-border)', flexShrink: 0 }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-5 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', boxShadow: '0 4px 16px rgba(var(--accent-rgb),0.4)' }}>
          <Zap size={16} color="#fff" strokeWidth={2.5} />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
            TaskFlow
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="px-2 space-y-0.5 mb-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id && !activeProjectId && !activeProgramId
          const badge = id === 'today' && overdue > 0 ? overdue
            : id === 'tasks' && inProgress > 0 ? inProgress
            : null
          return (
            <button key={id}
              onClick={() => { setPage(id); setActiveProject(null); setActiveProgram(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 no-select ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              style={isActive
                ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(var(--accent-rgb),0.3)' }
                : { color: 'var(--text-secondary)' }
              }
              title={sidebarCollapsed ? label : undefined}>
              <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 text-left">{label}</span>}
              {!sidebarCollapsed && badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={isActive
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }
                  }>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      {!sidebarCollapsed && (
        <div className="mx-3 mb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      )}

      {/* Programs → Projects tree */}
      <div className="flex-1 overflow-y-auto px-2">
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              Programs
            </span>
            <button onClick={() => setPage('projects')}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="Manage programs & projects">
              <Plus size={12} />
            </button>
          </div>
        )}

        {/* Program groups */}
        {programs.map((program) => (
          <ProgramGroup
            key={program.id}
            program={program}
            projects={projects.filter((p) => p.programId === program.id)}
            collapsed={sidebarCollapsed}
          />
        ))}

        {/* Unassigned projects */}
        {!sidebarCollapsed && unassigned.filter(p => !p.parentId).length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5">
              <Folder size={10} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Other</span>
            </div>
            {unassigned.filter(p => !p.parentId).map((project) => {
              const isActive = activeProjectId === project.id
              const count = tasks.filter((t) => t.projectId === project.id && t.status !== 'done').length
              return (
                <button key={project.id}
                  onClick={() => setActiveProject(isActive ? null : project.id)}
                  className="w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-xl text-xs font-medium transition-all mb-0.5"
                  style={isActive
                    ? { background: `${project.color}20`, color: project.color, border: `1px solid ${project.color}30` }
                    : { color: 'var(--text-secondary)' }
                  }
                  title={project.name}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                  <span className="flex-1 text-left truncate">{project.name}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center"
                      style={isActive
                        ? { background: `${project.color}30`, color: project.color }
                        : { background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }
                      }>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="px-2 pb-4 mt-2">
        <button onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
          <div className="glass rounded-lg p-1.5">
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </div>
        </button>
      </div>
    </aside>
  )
})

export default Sidebar
