import { memo, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, ListTodo, CalendarClock, Settings2, FolderKanban,
  Zap, ChevronLeft, ChevronRight, Folder, ChevronDown, BarChart3, GanttChart, LogOut, Trash2, BriefcaseBusiness, House, Activity,
} from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import useAuthStore from '../../store/useAuthStore'
import { useTaskStats } from '../../hooks/useFilteredTasks'
import useWorkspaceScopedData from '../../hooks/useWorkspaceScopedData'
import { WORKSPACE_VIEW_OPTIONS } from '../../lib/workspaceScope'
import { createCollapseVariants, MOTION_SPRINGS } from '../../lib/motion'

void motion

const NAV_ITEMS = [
  { id: 'dashboard',         label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'tasks',             label: 'All Tasks',  icon: ListTodo        },
  { id: 'today',             label: 'Planner',    icon: CalendarClock   },
  { id: 'projects',          label: 'Programs',   icon: FolderKanban    },
  { id: 'program-dashboard', label: 'Program Overview',  icon: BarChart3       },
  { id: 'timeline',          label: 'Gantt Chart', icon: GanttChart     },
  { id: 'activity',          label: 'Activity',   icon: Activity        },
  { id: 'trash',             label: 'Trash',      icon: Trash2          },
  { id: 'settings',          label: 'Settings',   icon: Settings2       },
]

const WORKSPACE_SCOPE_ICON = {
  professional: BriefcaseBusiness,
  personal: House,
}

const WorkspaceScopeSwitch = memo(function WorkspaceScopeSwitch({ collapsed }) {
  const workspaceViewScope = useSettingsStore((state) => state.workspaceViewScope)
  const setWorkspaceViewScope = useSettingsStore((state) => state.setWorkspaceViewScope)
  const reduceMotion = useReducedMotion()

  return (
    <div className={`px-2 mb-3 ${collapsed ? '' : ''}`}>
      <div
        className={`rounded-2xl ${collapsed ? 'p-1 flex flex-col gap-1 items-center' : 'p-1 flex items-center gap-1'}`}
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {WORKSPACE_VIEW_OPTIONS.map((option) => {
          const active = workspaceViewScope === option.id
          const Icon = WORKSPACE_SCOPE_ICON[option.id]
          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => setWorkspaceViewScope(option.id)}
              whileHover={reduceMotion ? undefined : { y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className={`relative overflow-hidden flex items-center gap-2 rounded-xl text-xs font-semibold transition-colors ${collapsed ? 'w-9 h-9 justify-center' : 'flex-1 px-2.5 py-2 justify-center'}`}
              layout
              style={active
                ? { background: 'rgba(var(--accent-rgb),0.2)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.28)' }
                : { color: 'var(--text-secondary)', border: '1px solid transparent' }}
              title={collapsed ? option.label : undefined}
            >
              {active && (
                <motion.span
                  layoutId="workspace-scope-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(var(--accent-rgb),0.16)', border: '1px solid rgba(var(--accent-rgb),0.28)' }}
                  transition={reduceMotion ? { duration: 0 } : MOTION_SPRINGS.soft}
                />
              )}
              <Icon size={13} className="relative z-[1]" />
              {!collapsed && <span className="relative z-[1]">{option.id === 'professional' ? 'Professional' : 'Personal'}</span>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
})

// ── Program group with nested projects ───────────────────────────────────────
const ProgramGroup = memo(function ProgramGroup({ program, projects, tasks, allProjects, collapsed }) {
  const activeProgramId      = useSettingsStore((s) => s.activeProgramId)
  const activeProjectId      = useSettingsStore((s) => s.activeProjectId)
  const setActiveProject     = useSettingsStore((s) => s.setActiveProject)
  const setActiveProgram     = useSettingsStore((s) => s.setActiveProgram)
  const setPage              = useSettingsStore((s) => s.setPage)
  const reduceMotion = useReducedMotion()
  const [open, setOpen]      = useState(() => activeProgramId === program.id || projects.some((project) => project.id === activeProjectId))
  const taskCount = (pid) => tasks.filter((t) => t.projectId === pid && t.status !== 'done').length
  const topLevel = projects.filter((p) => !p.parentId)
  const collapseVariants = useMemo(() => createCollapseVariants(reduceMotion), [reduceMotion])

  useEffect(() => {
    if (activeProgramId === program.id || projects.some((project) => project.id === activeProjectId)) {
      setOpen(true)
    }
  }, [activeProgramId, activeProjectId, program.id, projects])

  const handleProgramClick = () => {
    if (collapsed) return
    setPage('projects')
    setActiveProgram(program.id)
    setOpen((o) => !o)
  }

  const handleProjectClick = (projectId, isActive) => {
    setPage('projects')
    setActiveProject(isActive ? null : projectId)
  }

  if (collapsed) {
    return (
      <>
        {projects.map((p) => {
          const isActive = activeProjectId === p.id
          return (
            <button key={p.id}
              onClick={() => handleProjectClick(p.id, isActive)}
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

  return (
    <div className="mb-1">
      {/* Program row */}
      <motion.button
        onClick={handleProgramClick}
        whileHover={reduceMotion ? undefined : { x: 1 }}
        transition={reduceMotion ? undefined : MOTION_SPRINGS.gentle}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg mb-0.5 transition-colors hover:bg-white/5"
      >
        <span className="w-2 h-2 rounded flex-shrink-0"
          style={{ background: program.color, boxShadow: `0 0 4px ${program.color}60` }} />
        <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-wider truncate"
          style={{ color: 'var(--text-secondary)' }}>
          {program.name}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
          {topLevel.length}
        </span>
        <ChevronDown size={10} style={{
          color: 'var(--text-secondary)',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }} />
      </motion.button>

      {/* Projects nested under program */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            variants={collapseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="space-y-0.5">
              {topLevel.map((project) => {
                const isActive = activeProjectId === project.id
                const count = taskCount(project.id)
                const subProjects = allProjects.filter((p) => p.parentId === project.id)

                return (
                  <div key={project.id}>
                    <motion.button
                      onClick={() => handleProjectClick(project.id, isActive)}
                      whileHover={reduceMotion ? undefined : { x: 1 }}
                      transition={reduceMotion ? undefined : MOTION_SPRINGS.gentle}
                      className="w-full flex items-center gap-2 pl-5 pr-2 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={isActive
                        ? { background: `${project.color}16`, color: project.color, border: `1px solid ${project.color}26` }
                        : { color: 'var(--text-secondary)' }}
                      title={project.name}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: project.color, boxShadow: isActive ? `0 0 5px ${project.color}` : 'none' }} />
                      <span className="flex-1 text-left truncate">{project.name}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center"
                          style={isActive
                            ? { background: `${project.color}24`, color: project.color }
                            : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                          {count}
                        </span>
                      )}
                    </motion.button>

                    <AnimatePresence initial={false}>
                      {isActive && subProjects.length > 0 && (
                        <motion.div
                          variants={collapseVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="overflow-hidden"
                        >
                          {subProjects.map((sub) => {
                            const isSubActive = activeProjectId === sub.id
                            const subCount = taskCount(sub.id)
                            return (
                              <motion.button
                                key={sub.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleProjectClick(sub.id, isSubActive)
                                }}
                                whileHover={reduceMotion ? undefined : { x: 1 }}
                                transition={reduceMotion ? undefined : MOTION_SPRINGS.gentle}
                                className="w-full flex items-center gap-2 pl-9 pr-2 py-1 rounded-xl text-[11px] font-medium transition-all mb-0.5"
                                style={isSubActive
                                  ? { background: `${sub.color}18`, color: sub.color, border: `1px solid ${sub.color}28` }
                                  : { color: 'var(--text-secondary)' }}
                                title={sub.name}
                              >
                                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: sub.color }} />
                                <span className="flex-1 text-left truncate">{sub.name}</span>
                                {subCount > 0 && (
                                  <span className="text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                    {subCount}
                                  </span>
                                )}
                              </motion.button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = memo(function Sidebar() {
  const activePage        = useSettingsStore((s) => s.activePage)
  const sidebarCollapsed  = useSettingsStore((s) => s.sidebarCollapsed)
  const activeProjectId   = useSettingsStore((s) => s.activeProjectId)
  const activeProgramId   = useSettingsStore((s) => s.activeProgramId)
  const workspaceViewScope = useSettingsStore((s) => s.workspaceViewScope)
  const setPage           = useSettingsStore((s) => s.setPage)
  const toggleSidebar     = useSettingsStore((s) => s.toggleSidebar)
  const setActiveProject  = useSettingsStore((s) => s.setActiveProject)
  const setActiveProgram  = useSettingsStore((s) => s.setActiveProgram)
  const { programs, projects, tasks, trashTasks } = useWorkspaceScopedData()
  const { overdue, inProgress } = useTaskStats()
  const user              = useAuthStore((s) => s.user)
  const signOut           = useAuthStore((s) => s.signOut)

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

      <WorkspaceScopeSwitch collapsed={sidebarCollapsed} />

      {/* Main nav */}
      <nav className="px-2 space-y-0.5 mb-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = id === 'projects'
            ? activePage === 'projects'
            : activePage === id && !activeProjectId && !activeProgramId
          const badge = id === 'today' && overdue > 0 ? overdue
            : id === 'tasks' && inProgress > 0 ? inProgress
            : id === 'trash' && trashTasks.length > 0 ? trashTasks.length
            : null
          return (
            <motion.button key={id}
              onClick={() => { setPage(id); setActiveProject(null); setActiveProgram(null) }}
              whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
              whileTap={{ scale: 0.99 }}
              className={`relative overflow-hidden w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 no-select ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              style={isActive
                ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(var(--accent-rgb),0.3)' }
                : { color: 'var(--text-secondary)' }
              }
              title={sidebarCollapsed ? label : undefined}>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-nav"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'var(--accent)', boxShadow: '0 6px 18px rgba(var(--accent-rgb),0.28)' }}
                  transition={MOTION_SPRINGS.soft}
                />
              )}
              <span className="relative z-[1] flex items-center gap-3 w-full">
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                {!sidebarCollapsed && <span className="flex-1 text-left">{label}</span>}
              </span>
              {!sidebarCollapsed && badge && (
                <span className="relative z-[1] text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={isActive
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }
                  }>
                  {badge}
                </span>
              )}
            </motion.button>
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
          <div className="px-1 mb-2">
            <button
              onClick={() => { setPage('projects'); setActiveProject(null); setActiveProgram(null) }}
              className="text-[10px] font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
              title="Show all programs"
            >
              Programs
            </button>
          </div>
        )}

        {/* Program groups */}
        {programs.map((program) => (
          <ProgramGroup
            key={program.id}
            program={program}
            projects={projects.filter((p) => p.programId === program.id)}
            tasks={tasks}
            allProjects={projects}
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
                <motion.button key={project.id}
                  onClick={() => {
                    setPage('projects')
                    setActiveProject(isActive ? null : project.id)
                  }}
                  whileHover={sidebarCollapsed ? undefined : { x: 1 }}
                  transition={MOTION_SPRINGS.gentle}
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
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* User section */}
      {user && (
        <div className="px-2 mb-1 mt-1">
          {sidebarCollapsed ? (
            <button
              onClick={signOut}
              title="Sign out"
              className="w-full flex items-center justify-center py-2 rounded-xl transition-colors hover:bg-red-500/10"
              style={{ color: 'var(--text-secondary)' }}
            >
              <LogOut size={14} />
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {(user.user_metadata?.name?.[0] || user.email?.[0] || '?').toUpperCase()}
              </div>
              {/* Email */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.user_metadata?.name || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {user.email}
                </p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {workspaceViewScope === 'personal' ? 'Personal workspace' : 'Professional workspace'}
                </p>
              </div>
              {/* Sign out */}
              <button
                onClick={signOut}
                title="Sign out"
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 flex-shrink-0"
                style={{ color: 'var(--text-secondary)' }}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      )}

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
