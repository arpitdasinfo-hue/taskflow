import { memo, useState } from 'react'
import { Plus, Folder, CheckCircle2, Clock, AlertTriangle, Trash2, Edit2, Check, X } from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import useProjectStore, { PROJECT_COLORS } from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'

// ── Inline editable project name ──────────────────────────────────────────────
const EditableName = memo(function EditableName({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    if (draft.trim()) onSave(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="text-base font-bold bg-transparent border-b w-full"
        style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)', outline: 'none' }}
        maxLength={60}
      />
    )
  }
  return (
    <span
      className="text-base font-bold cursor-text hover:opacity-80 transition-opacity"
      style={{ color: 'var(--text-primary)' }}
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Click to rename"
    >
      {value}
    </span>
  )
})

// ── Color picker popover ───────────────────────────────────────────────────────
const ColorPicker = memo(function ColorPicker({ color, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-transparent transition-transform hover:scale-110"
        style={{ background: color, ringColor: color }}
        title="Change color"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-6 left-0 z-50 p-2 rounded-xl flex flex-wrap gap-1.5"
            style={{ background: '#1a1025', border: '1px solid rgba(255,255,255,0.12)', width: '128px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
          >
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { onChange(c); setOpen(false) }}
                className="w-5 h-5 rounded-full transition-transform hover:scale-125"
                style={{ background: c, outline: c === color ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
})

// ── New project inline form ────────────────────────────────────────────────────
const NewProjectForm = memo(function NewProjectForm({ onDone }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [desc, setDesc] = useState('')
  const addProject = useProjectStore((s) => s.addProject)

  const submit = () => {
    if (!name.trim()) return
    addProject({ name: name.trim(), color, description: desc.trim() })
    onDone()
  }

  return (
    <GlassCard padding="p-4" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Folder size={14} style={{ color }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Project</span>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onDone() }}
        placeholder="Project name…"
        maxLength={60}
        className="w-full text-sm px-3 py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }}
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        maxLength={120}
        className="w-full text-sm px-3 py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
      />
      <div className="flex flex-wrap gap-1.5">
        {PROJECT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full transition-transform hover:scale-125"
            style={{ background: c, outline: c === color ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 btn-accent py-2 text-xs">Create</button>
        <button onClick={onDone} className="btn-ghost py-2 text-xs px-3">Cancel</button>
      </div>
    </GlassCard>
  )
})

// ── Project card ──────────────────────────────────────────────────────────────
const ProjectCard = memo(function ProjectCard({ project }) {
  const tasks          = useTaskStore((s) => s.tasks)
  const updateProject  = useProjectStore((s) => s.updateProject)
  const deleteProject  = useProjectStore((s) => s.deleteProject)
  const setActiveProject = useSettingsStore((s) => s.setActiveProject)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const projectTasks = tasks.filter((t) => t.projectId === project.id)
  const total        = projectTasks.length
  const done         = projectTasks.filter((t) => t.status === 'done').length
  const inProgress   = projectTasks.filter((t) => t.status === 'in-progress').length
  const blocked      = projectTasks.filter((t) => t.status === 'blocked').length
  const now          = new Date()
  const overdue      = projectTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
  const completion   = total ? Math.round((done / total) * 100) : 0

  const recentActive = projectTasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3)

  return (
    <GlassCard padding="p-5" className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <ColorPicker color={project.color} onChange={(c) => updateProject(project.id, { color: c })} />
          <div className="min-w-0 flex-1">
            <EditableName value={project.name} onSave={(n) => updateProject(project.id, { name: n })} />
            {project.description && (
              <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {confirmDelete ? (
            <>
              <button
                onClick={() => { deleteProject(project.id); setConfirmDelete(false) }}
                className="p-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: 'var(--text-secondary)' }}
              title="Delete project"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-[10px] mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          <span>{done}/{total} tasks done</span>
          <span style={{ color: project.color }}>{completion}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${completion}%`, background: `linear-gradient(90deg, ${project.color}99, ${project.color})` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Active', value: inProgress, icon: Clock, color: '#f97316' },
          { label: 'Blocked', value: blocked, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Overdue', value: overdue, icon: AlertTriangle, color: overdue > 0 ? '#ef4444' : 'var(--text-secondary)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl py-2.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="text-base font-bold" style={{ color: value > 0 ? color : 'var(--text-secondary)' }}>{value}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Recent tasks */}
      {recentActive.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
            Active tasks
          </p>
          <div className="space-y-1.5">
            {recentActive.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: t.priority === 'critical' ? '#ef4444' : t.priority === 'high' ? '#f97316' : project.color }}
                />
                <span className="text-xs truncate flex-1" style={{ color: 'var(--text-primary)' }}>{t.title}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${project.color}15`, color: project.color }}
                >
                  {t.status === 'in-progress' ? 'Active' : t.status === 'review' ? 'Review' : t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View tasks CTA */}
      <button
        onClick={() => setActiveProject(project.id)}
        className="w-full py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
        style={{ background: `${project.color}18`, color: project.color, border: `1px solid ${project.color}30` }}
      >
        View all {total} task{total !== 1 ? 's' : ''} →
      </button>
    </GlassCard>
  )
})

// ── Projects page ─────────────────────────────────────────────────────────────
const Projects = memo(function Projects() {
  const projects = useProjectStore((s) => s.projects)
  const tasks    = useTaskStore((s) => s.tasks)
  const [adding, setAdding] = useState(false)

  const unassigned = tasks.filter((t) => !t.projectId && t.status !== 'done').length
  const totalDone  = tasks.filter((t) => t.status === 'done').length

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between py-4 mb-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Projects</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} · {totalDone} tasks completed
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="btn-accent flex items-center gap-1.5 px-3 py-2 text-xs"
        >
          <Plus size={13} />
          New project
        </button>
      </div>

      {/* New project form */}
      {adding && (
        <div className="mb-4">
          <NewProjectForm onDone={() => setAdding(false)} />
        </div>
      )}

      {/* Unassigned callout */}
      {unassigned > 0 && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4 text-xs"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
        >
          <Folder size={13} />
          <span>{unassigned} active task{unassigned !== 1 ? 's' : ''} not assigned to any project</span>
        </div>
      )}

      {/* Project grid */}
      {projects.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.1)' }}>
            <Folder size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No projects yet</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Create a project to organise your tasks</p>
          <button onClick={() => setAdding(true)} className="btn-accent px-4 py-2 text-xs mt-1">
            Create first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
})

export default Projects
