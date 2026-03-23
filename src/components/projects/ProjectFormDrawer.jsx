import { memo, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ColorPalettePicker from '../common/ColorPalettePicker'
import useProjectStore, { PROJECT_COLORS } from '../../store/useProjectStore'

const PROJECT_STATUS_OPTIONS = [
  { id: 'active', label: 'Active' },
  { id: 'on-hold', label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
]

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '')

const ProjectFormDrawer = memo(function ProjectFormDrawer({
  open,
  mode = 'create',
  initialValues = null,
  lockedProgramId = null,
  programOptions = [],
  parentOptions = [],
  onClose,
  onSubmit,
  onDelete = null,
}) {
  const projects = useProjectStore((state) => state.projects)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [programId, setProgramId] = useState(lockedProgramId ?? '')
  const [parentId, setParentId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    if (!open) return
    setName(initialValues?.name ?? '')
    setDescription(initialValues?.description ?? '')
    setStatus(initialValues?.status ?? 'active')
    setColor(initialValues?.color ?? PROJECT_COLORS[projects.length % PROJECT_COLORS.length] ?? PROJECT_COLORS[0])
    setProgramId(lockedProgramId ?? initialValues?.programId ?? '')
    setParentId(initialValues?.parentId ?? '')
    setStartDate(toDateInput(initialValues?.startDate))
    setDueDate(toDateInput(initialValues?.dueDate))
  }, [initialValues, lockedProgramId, open, projects.length])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  const availableParentOptions = parentOptions.filter((project) => project.id !== initialValues?.id)

  const handleSubmit = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    onSubmit({
      name: trimmedName,
      description: description.trim(),
      status,
      color,
      programId: (lockedProgramId ?? programId) || null,
      parentId: parentId || null,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    })
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-[440px] border-l px-5 py-5 overflow-y-auto" style={{ background: 'rgba(7,10,24,0.96)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'edit' ? 'Edit project' : 'New project'}
            </p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'edit' ? 'Update project structure' : 'Add a project'}
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Keep the hierarchy clear. Use top-level projects for workstreams and sub-projects only when the split helps execution.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Project name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Activation plan, onboarding, launch ops..."
              className="mt-2 w-full rounded-2xl px-3 py-3 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(var(--accent-rgb),0.24)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Optional context for the team."
              className="mt-2 w-full rounded-2xl px-3 py-3 text-sm resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            />
          </div>

          {!lockedProgramId ? (
            <div>
              <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Program
              </label>
              <select
                value={programId}
                onChange={(event) => {
                  setProgramId(event.target.value)
                  setParentId('')
                }}
                className="mt-2 w-full rounded-2xl px-3 py-3 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              >
                <option value="">No program</option>
                {programOptions.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Placement
            </label>
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="mt-2 w-full rounded-2xl px-3 py-3 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            >
              <option value="">Top-level project</option>
              {availableParentOptions.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Status
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROJECT_STATUS_OPTIONS.map((option) => {
                const active = status === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStatus(option.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium"
                    style={active
                      ? { background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.22)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Color
            </div>
            <div className="mt-2">
              <ColorPalettePicker colors={PROJECT_COLORS} value={color} onChange={(next) => next && setColor(next)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-2xl px-3 py-3 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-2 w-full rounded-2xl px-3 py-3 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', colorScheme: 'dark' }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            {onDelete && mode === 'edit' ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-2xl px-3 py-2 text-xs font-medium"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)' }}
              >
                Delete project
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-3 py-2 text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-accent px-4 py-2 text-xs"
            >
              {mode === 'edit' ? 'Save project' : 'Create project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ProjectFormDrawer
