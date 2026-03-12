import { memo, useEffect, useState } from 'react'
import {
  Plus, Folder, FolderOpen, CheckCircle2, Clock, AlertTriangle,
  Trash2, Check, X, ChevronDown, ChevronRight, LayoutList, Kanban,
  Calendar, GitBranch, MoreHorizontal, Share2,
} from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import InfoTooltip from '../components/common/InfoTooltip'
import ShareModal from '../components/ShareModal'
import { ProgramStatusBadge, STATUS_OPTIONS } from '../components/common/ProgramStatusBadge'
import MilestonePanel from '../components/projects/MilestonePanel'
import useProjectStore, { PROJECT_COLORS } from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'

// ── Helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' }
const STATUS_LABEL   = { todo: 'To Do', 'in-progress': 'Active', review: 'Review', done: 'Done', blocked: 'Blocked' }
const STATUS_COLOR   = { todo: '#94a3b8', 'in-progress': '#22d3ee', review: '#f59e0b', done: '#10b981', blocked: '#ef4444' }

// ── Inline editable text ──────────────────────────────────────────────────────
const Editable = memo(function Editable({ value, onSave, className, style, maxLength = 60 }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const commit = () => { if (draft.trim()) onSave(draft.trim()); setEditing(false) }
  if (editing) {
    return (
      <input
        autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className={className + ' bg-transparent border-b'}
        style={{ ...style, borderColor: 'var(--accent)', outline: 'none' }}
        maxLength={maxLength}
      />
    )
  }
  return (
    <span className={className + ' cursor-text hover:opacity-75'} style={style}
      onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true) }} title="Click to rename">
      {value}
    </span>
  )
})

// ── Color swatch picker ───────────────────────────────────────────────────────
const ColorDot = memo(function ColorDot({ color, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="w-3 h-3 rounded-full ring-1 ring-offset-1 ring-offset-transparent hover:scale-125 transition-transform"
        style={{ background: color, ringColor: color }} title="Change colour" />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-5 left-0 z-50 p-2 rounded-xl flex flex-wrap gap-1.5"
            style={{ background: '#1a1025', border: '1px solid rgba(255,255,255,0.12)', width: '120px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
            {PROJECT_COLORS.map((c) => (
              <button key={c} onClick={(e) => { e.stopPropagation(); onChange(c); setOpen(false) }}
                className="w-5 h-5 rounded-full hover:scale-125 transition-transform"
                style={{ background: c, outline: c === color ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
})

// ── Task row (list view) ──────────────────────────────────────────────────────
const TaskRow = memo(function TaskRow({ task }) {
  const selectTask = useSettingsStore((s) => s.selectTask)
  const now = new Date()
  const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'

  return (
    <button
      onClick={() => selectTask(task.id)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-white/5 group"
      style={{ border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[task.priority] }} />
      <span className="flex-1 text-sm truncate" style={{ color: task.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
        {task.title}
      </span>
      {task.subtasks?.length > 0 && (
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
        </span>
      )}
      {task.dueDate && (
        <span className="text-[10px] flex-shrink-0" style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
        style={{ background: `${STATUS_COLOR[task.status]}18`, color: STATUS_COLOR[task.status] }}>
        {STATUS_LABEL[task.status]}
      </span>
    </button>
  )
})

// ── Kanban mini-card ──────────────────────────────────────────────────────────
const KanbanCard = memo(function KanbanCard({ task }) {
  const selectTask = useSettingsStore((s) => s.selectTask)
  return (
    <button onClick={() => selectTask(task.id)}
      className="w-full text-left p-2.5 rounded-xl transition-colors hover:bg-white/5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: PRIORITY_COLOR[task.priority] }} />
        <span className="text-xs leading-snug" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
      </div>
      {task.subtasks?.length > 0 && (
        <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
        </div>
      )}
    </button>
  )
})

// ── Project panel ─────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { id: 'todo',        label: 'To Do',      color: '#94a3b8' },
  { id: 'in-progress', label: 'In Progress', color: '#22d3ee' },
  { id: 'review',      label: 'Review',      color: '#f59e0b' },
  { id: 'done',        label: 'Done',        color: '#10b981' },
  { id: 'blocked',     label: 'Blocked',     color: '#ef4444' },
]

const ProjectPanel = memo(function ProjectPanel({ project, depth = 0 }) {
  const tasks            = useTaskStore((s) => s.tasks)
  const updateProject    = useProjectStore((s) => s.updateProject)
  const deleteProject    = useProjectStore((s) => s.deleteProject)
  const addProject       = useProjectStore((s) => s.addProject)
  const programs         = useProjectStore((s) => s.programs)
  const setActiveProject = useSettingsStore((s) => s.setActiveProject)
  const allProjects      = useProjectStore((s) => s.projects)

  const [view, setView]               = useState('list')
  const [expanded, setExpanded]       = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [addingSub, setAddingSub]     = useState(false)
  const [subName, setSubName]         = useState('')
  const [subColor, setSubColor]       = useState(project.color)
  const [showMilestones, setShowMilestones] = useState(false)
  const [showMenu, setShowMenu]       = useState(false)
  const [showMovePicker, setShowMovePicker] = useState(false)
  const [showShare, setShowShare]     = useState(false)

  const projectTasks = tasks.filter((t) => t.projectId === project.id)
  const total      = projectTasks.length
  const done       = projectTasks.filter((t) => t.status === 'done').length
  const inProgress = projectTasks.filter((t) => t.status === 'in-progress').length
  const blocked    = projectTasks.filter((t) => t.status === 'blocked').length
  const now        = new Date()
  const overdue    = projectTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
  const completion = total ? Math.round((done / total) * 100) : 0

  const submitSub = () => {
    if (!subName.trim()) return
    addProject({ name: subName.trim(), color: subColor, programId: project.programId, parentId: project.id })
    setSubName(''); setAddingSub(false)
  }

  const openTaskComposer = () => {
    setActiveProject(project.id)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('taskflow:quick-add', {
          detail: { type: 'task', projectId: project.id, programId: project.programId ?? '' },
        })
      )
    }
  }

  // Also get sub-projects from allProjects that reference this project
  const childProjects = allProjects.filter((p) => p.parentId === project.id)

  return (
    <div className="rounded-2xl overflow-hidden" data-project-id={project.id} style={{
      border: `1px solid ${project.color}${depth > 0 ? '20' : '25'}`,
      background: depth > 0 ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.02)',
      marginLeft: depth > 0 ? '0' : '0',
    }}>
      {/* Project header */}
      <div
        onClick={() => setExpanded((e) => !e)}
        className="relative group flex items-center gap-2.5 px-4 py-3 cursor-pointer"
        style={{ background: `${project.color}08`, borderBottom: expanded ? `1px solid ${project.color}18` : 'none' }}
      >
        <span className="flex-shrink-0 transition-transform" style={{ color: 'var(--text-secondary)' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        <ColorDot color={project.color} onChange={(c) => updateProject(project.id, { color: c })} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {depth > 0 && <GitBranch size={10} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
            <Editable value={project.name} onSave={(n) => updateProject(project.id, { name: n })}
              className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }} />
            <InfoTooltip text={project.description} />
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `${project.color}18`, color: project.color }}>
              {total} task{total !== 1 ? 's' : ''}
            </span>
            {project.dueDate && (
              <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={9} />
                {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Date editor */}
        <input
          type="date"
          value={project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''}
          onChange={(e) => updateProject(project.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
          className="hidden"
          id={`due-${project.id}`}
        />

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          {inProgress > 0 && <span style={{ color: '#22d3ee' }}>{inProgress} active</span>}
          {blocked > 0    && <span style={{ color: '#ef4444' }}>{blocked} blocked</span>}
          {overdue > 0    && <span style={{ color: '#ef4444' }}>{overdue} overdue</span>}
          <span style={{ color: project.color }}>{completion}%</span>
        </div>

        {/* View toggles */}
        {expanded && total > 0 && (
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {[['list', LayoutList], ['board', Kanban]].map(([v, Icon]) => (
              <button key={v} onClick={(e) => { e.stopPropagation(); setView(v) }}
                className="p-1 rounded-md transition-colors"
                style={view === v ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
                <Icon size={12} />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setShowShare(true) }}
          className="p-1 rounded-lg hover:bg-white/8 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          title="Share project"
        >
          <Share2 size={13} />
        </button>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v) }}
            className="p-1 rounded-lg hover:bg-white/8 transition-colors opacity-80 group-hover:opacity-100"
            style={{ color: 'var(--text-secondary)' }}
            title="Project actions"
          >
            <MoreHorizontal size={13} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div
                className="absolute top-full right-0 mt-1 z-50 rounded-xl overflow-hidden"
                style={{ background: '#1a1025', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', minWidth: '160px' }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMovePicker((v) => !v); setShowMenu(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Move to program…
                </button>
              </div>
            </>
          )}
        </div>

        {/* Delete */}
        {confirmDel ? (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }} className="p-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <Check size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setConfirmDel(false) }} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); setConfirmDel(true) }} className="p-1 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {showMovePicker && (
        <div className="px-4 pb-2">
          <select
            value={project.programId ?? ''}
            onChange={(e) => {
              updateProject(project.id, { programId: e.target.value || null })
              setShowMovePicker(false)
            }}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
          >
            <option value="">Unassigned</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Progress bar */}
      {expanded && total > 0 && (
        <div className="px-4 pt-2.5 pb-1" style={{ background: `${project.color}04` }}>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${completion}%`, background: `linear-gradient(90deg, ${project.color}80, ${project.color})` }} />
          </div>
        </div>
      )}

      {/* Task content */}
      {expanded && (
        <div className="px-3 py-2" style={{ background: `${project.color}04` }}>
          {total === 0 ? (
            <p className="text-xs text-center py-3" style={{ color: 'var(--text-secondary)' }}>
              No tasks yet —{' '}
              <button onClick={openTaskComposer} className="underline" style={{ color: 'var(--accent)' }}>
                add one
              </button>
            </p>
          ) : view === 'list' ? (
            <div className="space-y-1">
              {projectTasks.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
              {KANBAN_COLS.map((col) => {
                const colTasks = projectTasks.filter((t) => t.status === col.id)
                return (
                  <div key={col.id} className="flex-shrink-0 w-[200px] snap-start">
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: col.color }}>{col.label}</span>
                      <span className="text-[10px] ml-auto" style={{ color: 'var(--text-secondary)' }}>{colTasks.length}</span>
                    </div>
                    <div className="space-y-1.5 min-h-[40px]">
                      {colTasks.map((t) => <KanbanCard key={t.id} task={t} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sub-projects */}
          {childProjects.length > 0 && (
            <div className="mt-3 space-y-2 pl-3 border-l-2" style={{ borderColor: `${project.color}30` }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Sub-projects ({childProjects.length})
              </p>
              {childProjects.map((sub) => <ProjectPanel key={sub.id} project={sub} depth={depth + 1} />)}
            </div>
          )}

          {/* Add sub-project */}
          {depth === 0 && (
            <div className="mt-2">
              {addingSub ? (
                <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <input autoFocus value={subName} onChange={(e) => setSubName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitSub(); if (e.key === 'Escape') setAddingSub(false) }}
                    placeholder="Sub-project name…" maxLength={60}
                    className="w-full text-xs px-2 py-1.5 rounded-lg mb-2 bg-transparent border"
                    style={{ borderColor: 'rgba(var(--accent-rgb),0.3)', color: 'var(--text-primary)' }} />
                  <div className="flex flex-wrap gap-1 mb-2">
                    {PROJECT_COLORS.map((c) => (
                      <button key={c} onClick={() => setSubColor(c)}
                        className="w-4 h-4 rounded-full hover:scale-125 transition-transform"
                        style={{ background: c, outline: c === subColor ? `2px solid ${c}` : 'none', outlineOffset: '1px' }} />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={submitSub} className="flex-1 btn-accent py-1 text-[11px]">Add</button>
                    <button onClick={() => setAddingSub(false)} className="btn-ghost py-1 text-[11px] px-2">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingSub(true)}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}>
                  <Plus size={10} /> Add sub-project
                </button>
              )}
            </div>
          )}

          {/* Milestones toggle */}
          <div className="mt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <button onClick={() => setShowMilestones((v) => !v)}
              className="w-full flex items-center gap-1.5 text-[10px] py-2 transition-colors hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}>
              <ChevronRight size={10} style={{ transform: showMilestones ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              Milestones
            </button>
            {showMilestones && (
              <div className="pb-2">
                <MilestonePanel projectId={project.id} projectColor={project.color} />
              </div>
            )}
          </div>
        </div>
      )}

      {showShare && (
        <ShareModal
          resourceType="project"
          resourceId={project.id}
          resourceName={project.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
})

// ── Program section ───────────────────────────────────────────────────────────
const ProgramSection = memo(function ProgramSection({ program, projects }) {
  const updateProgram = useProjectStore((s) => s.updateProgram)
  const deleteProgram = useProjectStore((s) => s.deleteProgram)
  const addProject    = useProjectStore((s) => s.addProject)
  const tasks         = useTaskStore((s) => s.tasks)
  const activeProgramId = useSettingsStore((s) => s.activeProgramId)
  const activeProjectId = useSettingsStore((s) => s.activeProjectId)

  const [collapsed, setCollapsed]     = useState(false)
  const [addingProject, setAddingProject] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjColor, setNewProjColor] = useState(PROJECT_COLORS[0])
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [showShare, setShowShare] = useState(false)

  // Only top-level projects (no parentId)
  const topLevelProjects = projects.filter((p) => !p.parentId)
  const containsActiveProject = !!activeProjectId && projects.some((p) => p.id === activeProjectId)

  const allTasks   = tasks.filter((t) => projects.some((p) => p.id === t.projectId))
  const totalTasks = allTasks.length
  const doneTasks  = allTasks.filter((t) => t.status === 'done').length

  const submitProject = () => {
    if (!newProjName.trim()) return
    addProject({ name: newProjName.trim(), color: newProjColor, programId: program.id })
    setNewProjName(''); setAddingProject(false)
  }

  useEffect(() => {
    if (!deleteArmed) return
    const timeoutId = setTimeout(() => setDeleteArmed(false), 3000)
    return () => clearTimeout(timeoutId)
  }, [deleteArmed])

  useEffect(() => {
    if (activeProgramId === program.id || containsActiveProject) {
      setCollapsed(false)
    }
  }, [activeProgramId, containsActiveProject, program.id])

  return (
    <div className="mb-6" data-program-id={program.id}>
      {/* Program header */}
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <button onClick={() => setCollapsed((c) => !c)} style={{ color: 'var(--text-secondary)' }}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </button>
        <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: program.color, boxShadow: `0 0 8px ${program.color}60` }} />
        <Editable value={program.name} onSave={(n) => updateProgram(program.id, { name: n })}
          className="text-base font-bold" style={{ color: 'var(--text-primary)' }} />
        <InfoTooltip text={program.description} />

        {/* Program status badge */}
        <div className="relative">
          <button onClick={() => setShowStatusPicker((v) => !v)}>
            <ProgramStatusBadge status={program.status || 'planning'} />
          </button>
          {showStatusPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowStatusPicker(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden"
                style={{ background: '#1a1025', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', minWidth: '140px' }}>
                {STATUS_OPTIONS.map(({ value, label, color }) => (
                  <button key={value}
                    onClick={() => { updateProgram(program.id, { status: value }); setShowStatusPicker(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors"
                    style={(program.status || 'planning') === value ? { color, background: `${color}12` } : { color: 'var(--text-secondary)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded-full ml-1"
          style={{ background: `${program.color}15`, color: program.color }}>
          {topLevelProjects.length} project{topLevelProjects.length !== 1 ? 's' : ''} · {totalTasks} tasks
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowShare(true)}
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Share program"
          >
            <Share2 size={13} />
          </button>
          <button onClick={() => setAddingProject(true)}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'var(--accent)' }}>
            <Plus size={11} /> Project
          </button>
          {deleteArmed ? (
            <>
              <button
                onClick={() => setDeleteArmed(false)}
                className="text-[10px] px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProgram(program.id)}
                className="text-[10px] px-2 py-1 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                Really delete?
              </button>
            </>
          ) : (
            <button
              onClick={() => setDeleteArmed(true)}
              className="text-[10px] px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Program progress */}
      {!collapsed && totalTasks > 0 && (
        <div className="mb-3 px-1">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0}%`, background: `linear-gradient(90deg, ${program.color}60, ${program.color})` }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            <span>{doneTasks} of {totalTasks} tasks done</span>
            <span style={{ color: program.color }}>{totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0}% complete</span>
          </div>
        </div>
      )}

      {/* New project inline form */}
      {!collapsed && addingProject && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
          <input autoFocus value={newProjName} onChange={(e) => setNewProjName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitProject(); if (e.key === 'Escape') setAddingProject(false) }}
            placeholder="Project name…" maxLength={60}
            className="w-full text-sm px-3 py-2 rounded-xl mb-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }} />
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PROJECT_COLORS.map((c) => (
              <button key={c} onClick={() => setNewProjColor(c)}
                className="w-5 h-5 rounded-full hover:scale-125 transition-transform"
                style={{ background: c, outline: c === newProjColor ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={submitProject} className="flex-1 btn-accent py-1.5 text-xs">Create</button>
            <button onClick={() => setAddingProject(false)} className="btn-ghost py-1.5 text-xs px-3">Cancel</button>
          </div>
        </div>
      )}

      {/* Projects */}
      {!collapsed && (
        <div className="space-y-2 pl-6">
          {topLevelProjects.length === 0 && !addingProject ? (
            <p className="text-xs py-2" style={{ color: 'var(--text-secondary)' }}>
              No projects yet.{' '}
              <button onClick={() => setAddingProject(true)} className="underline" style={{ color: 'var(--accent)' }}>Add one</button>
            </p>
          ) : (
            topLevelProjects.map((p) => <ProjectPanel key={p.id} project={p} />)
          )}
        </div>
      )}

      {showShare && (
        <ShareModal
          resourceType="program"
          resourceId={program.id}
          resourceName={program.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
})

// ── Unassigned projects section ───────────────────────────────────────────────
const UnassignedSection = memo(function UnassignedSection({ projects }) {
  const [collapsed, setCollapsed] = useState(false)
  // Only top-level
  const topLevel = projects.filter((p) => !p.parentId)
  if (topLevel.length === 0) return null
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <button onClick={() => setCollapsed((c) => !c)} style={{ color: 'var(--text-secondary)' }}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </button>
        <Folder size={14} style={{ color: 'var(--text-secondary)' }} />
        <span className="text-base font-bold" style={{ color: 'var(--text-secondary)' }}>Unassigned</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
          {topLevel.length} project{topLevel.length !== 1 ? 's' : ''}
        </span>
      </div>
      {!collapsed && (
        <div className="space-y-2 pl-6">
          {topLevel.map((p) => <ProjectPanel key={p.id} project={p} />)}
        </div>
      )}
    </div>
  )
})

// ── New program form ──────────────────────────────────────────────────────────
const NewProgramForm = memo(function NewProgramForm({ onDone }) {
  const [name, setName]   = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [desc, setDesc]   = useState('')
  const addProgram = useProjectStore((s) => s.addProgram)

  const submit = () => {
    if (!name.trim()) return
    addProgram({ name: name.trim(), color, description: desc.trim() })
    onDone()
  }

  return (
    <GlassCard padding="p-4" className="flex flex-col gap-3 mb-6">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: color }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Program</span>
      </div>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onDone() }}
        placeholder="Program name (e.g. Credit Cards, GTM)…" maxLength={60}
        className="w-full text-sm px-3 py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }} />
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" maxLength={120}
        className="w-full text-sm px-3 py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }} />
      <div className="flex flex-wrap gap-1.5">
        {PROJECT_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full hover:scale-125 transition-transform"
            style={{ background: c, outline: c === color ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 btn-accent py-2 text-xs">Create program</button>
        <button onClick={onDone} className="btn-ghost py-2 text-xs px-3">Cancel</button>
      </div>
    </GlassCard>
  )
})

// ── Projects page ─────────────────────────────────────────────────────────────
const Projects = memo(function Projects() {
  const programs = useProjectStore((s) => s.programs)
  const projects = useProjectStore((s) => s.projects)
  const tasks    = useTaskStore((s) => s.tasks)
  const activeProjectId = useSettingsStore((s) => s.activeProjectId)
  const activeProgramId = useSettingsStore((s) => s.activeProgramId)
  const [addingProgram, setAddingProgram] = useState(false)

  const unassignedProjects = projects.filter((p) => !p.programId || !programs.find((prog) => prog.id === p.programId))
  const totalTasks = tasks.length
  const doneTasks  = tasks.filter((t) => t.status === 'done').length

  useEffect(() => {
    const selector = activeProjectId
      ? `[data-project-id="${activeProjectId}"]`
      : activeProgramId
        ? `[data-program-id="${activeProgramId}"]`
        : null

    if (!selector) return

    const scrollToTarget = () => {
      const target = document.querySelector(selector)
      if (!target) return false
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return true
    }

    if (scrollToTarget()) return
    const timeoutId = setTimeout(scrollToTarget, 80)
    return () => clearTimeout(timeoutId)
  }, [activeProjectId, activeProgramId, programs.length, projects.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between py-4 mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Programs & Projects</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {programs.length} programs · {projects.length} projects · {doneTasks}/{totalTasks} tasks done
          </p>
        </div>
        <button onClick={() => setAddingProgram(true)} className="btn-accent flex items-center gap-1.5 px-3 py-2 text-xs">
          <Plus size={13} /> New program
        </button>
      </div>

      {/* New program form */}
      {addingProgram && <NewProgramForm onDone={() => setAddingProgram(false)} />}

      {/* Programs */}
      {programs.length === 0 && unassignedProjects.length === 0 && !addingProgram ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.1)' }}>
            <FolderOpen size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No programs yet</p>
          <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Create a program (e.g. "Credit Cards") then add projects inside it (e.g. "App", "Backend")
          </p>
          <button onClick={() => setAddingProgram(true)} className="btn-accent px-4 py-2 text-xs mt-1">
            Create first program
          </button>
        </div>
      ) : (
        <>
          {programs.map((program) => (
            <ProgramSection
              key={program.id}
              program={program}
              projects={projects.filter((p) => p.programId === program.id)}
            />
          ))}
          <UnassignedSection projects={unassignedProjects} />
        </>
      )}
    </div>
  )
})

export default Projects
