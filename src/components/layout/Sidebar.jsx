import { memo, useState } from 'react'
import {
  LayoutDashboard, ListTodo, CalendarClock, Settings2, FolderKanban,
  Zap, ChevronLeft, ChevronRight, Plus, Folder, X, Check,
} from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import useProjectStore, { PROJECT_COLORS } from '../../store/useProjectStore'
import useTaskStore from '../../store/useTaskStore'
import { useTaskStats } from '../../hooks/useFilteredTasks'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks',     label: 'All Tasks', icon: ListTodo        },
  { id: 'today',     label: 'Today',     icon: CalendarClock   },
  { id: 'projects',  label: 'Projects',  icon: FolderKanban    },
  { id: 'settings',  label: 'Settings',  icon: Settings2       },
]

/** Inline new-project form */
const NewProjectForm = memo(function NewProjectForm({ onDone }) {
  const [name, setName]   = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const addProject = useProjectStore((s) => s.addProject)

  const submit = () => {
    if (!name.trim()) return
    addProject({ name: name.trim(), color })
    onDone()
  }

  return (
    <div className="mt-1 p-2 rounded-xl anim-scale-in" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onDone() }}
        placeholder="Project name…"
        className="w-full text-xs px-2 py-1.5 rounded-lg mb-2"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }}
      />
      {/* Color swatches */}
      <div className="flex flex-wrap gap-1 mb-2">
        {PROJECT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full transition-transform"
            style={{ background: c, transform: color === c ? 'scale(1.3)' : 'scale(1)', outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        <button onClick={submit}  className="flex-1 btn-accent py-1 text-[11px]">Create</button>
        <button onClick={onDone}  className="btn-ghost py-1 text-[11px]">Cancel</button>
      </div>
    </div>
  )
})

const Sidebar = memo(function Sidebar() {
  const activePage        = useSettingsStore((s) => s.activePage)
  const sidebarCollapsed  = useSettingsStore((s) => s.sidebarCollapsed)
  const activeProjectId   = useSettingsStore((s) => s.activeProjectId)
  const setPage           = useSettingsStore((s) => s.setPage)
  const toggleSidebar     = useSettingsStore((s) => s.toggleSidebar)
  const setActiveProject  = useSettingsStore((s) => s.setActiveProject)
  const projects          = useProjectStore((s) => s.projects)
  const tasks             = useTaskStore((s) => s.tasks)
  const { overdue, inProgress } = useTaskStats()

  const [addingProject, setAddingProject] = useState(false)

  const taskCountByProject = (projectId) =>
    tasks.filter((t) => t.projectId === projectId && t.status !== 'done').length

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
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', boxShadow: '0 4px 16px rgba(var(--accent-rgb),0.4)' }}
        >
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
          const isActive = activePage === id && !activeProjectId
          const badge = id === 'today' && overdue > 0 ? overdue : id === 'tasks' && inProgress > 0 ? inProgress : null
          return (
            <button
              key={id}
              onClick={() => { setPage(id); setActiveProject(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 no-select ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              style={isActive
                ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(var(--accent-rgb),0.3)' }
                : { color: 'var(--text-secondary)' }
              }
              title={sidebarCollapsed ? label : undefined}
            >
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

      {/* Projects / Folders */}
      <div className="flex-1 overflow-y-auto px-2">
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Projects
            </span>
            <button
              onClick={() => setAddingProject(true)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="New project"
            >
              <Plus size={12} />
            </button>
          </div>
        )}

        {projects.map((project) => {
          const isActive = activeProjectId === project.id
          const count    = taskCountByProject(project.id)
          return (
            <button
              key={project.id}
              onClick={() => setActiveProject(isActive ? null : project.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 no-select mb-0.5 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              style={isActive
                ? { background: `${project.color}20`, color: project.color, border: `1px solid ${project.color}30` }
                : { color: 'var(--text-secondary)' }
              }
              title={sidebarCollapsed ? project.name : undefined}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: project.color, boxShadow: isActive ? `0 0 6px ${project.color}` : 'none' }}
              />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left truncate text-xs">{project.name}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center"
                      style={isActive
                        ? { background: `${project.color}30`, color: project.color }
                        : { background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }
                      }>
                      {count}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}

        {/* New project form */}
        {!sidebarCollapsed && addingProject && (
          <NewProjectForm onDone={() => setAddingProject(false)} />
        )}
      </div>

      {/* Collapse toggle */}
      <div className="px-2 pb-4 mt-2">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          <div className="glass rounded-lg p-1.5">
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </div>
        </button>
      </div>
    </aside>
  )
})

export default Sidebar
