import { memo, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ColorPalettePicker from '../common/ColorPalettePicker'
import { ProgramStatusBadge, STATUS_CONFIG, STATUS_OPTIONS } from '../common/ProgramStatusBadge'
import useProjectStore, { PROJECT_COLORS, PROGRAM_SCOPE_CONFIG, PROGRAM_SCOPE_OPTIONS } from '../../store/useProjectStore'

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '')

const ProgramFormDrawer = memo(function ProgramFormDrawer({
  open,
  mode = 'create',
  initialValues = null,
  defaultScope = 'professional',
  onClose,
  onSubmit,
  onDelete = null,
}) {
  const programs = useProjectStore((state) => state.programs)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState(defaultScope)
  const [status, setStatus] = useState('planning')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (!open) return
    setName(initialValues?.name ?? '')
    setDescription(initialValues?.description ?? '')
    setScope(initialValues?.scope ?? defaultScope)
    setStatus(initialValues?.status ?? 'planning')
    setColor(initialValues?.color ?? PROJECT_COLORS[programs.length % PROJECT_COLORS.length] ?? PROJECT_COLORS[0])
    setStartDate(toDateInput(initialValues?.startDate))
    setEndDate(toDateInput(initialValues?.endDate))
  }, [defaultScope, initialValues, open, programs.length])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  const handleSubmit = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    onSubmit({
      name: trimmedName,
      description: description.trim(),
      scope,
      status,
      color,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
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
              {mode === 'edit' ? 'Edit program' : 'New program'}
            </p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'edit' ? 'Update program basics' : 'Create a program'}
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Keep this lightweight: define the workstream, its scope, and the broad delivery window.
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
              Program name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Revenue launch, Credit cards, Hiring plan..."
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
              placeholder="A short note about what this program is responsible for."
              className="mt-2 w-full rounded-2xl px-3 py-3 text-sm resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Workspace scope
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PROGRAM_SCOPE_OPTIONS.map((option) => {
                const palette = PROGRAM_SCOPE_CONFIG[option.id]
                const active = scope === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setScope(option.id)}
                    className="rounded-2xl px-3 py-3 text-left text-sm transition-colors"
                    style={active
                      ? { background: palette.background, color: palette.color, border: `1px solid ${palette.color}40` }
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
              Status
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => {
                const active = status === option
                const config = STATUS_CONFIG[option]
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatus(option)}
                    className="rounded-full px-2.5 py-1.5"
                    style={{
                      background: active ? config.bg : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? config.color : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <ProgramStatusBadge status={option} />
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
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
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
                Delete program
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
              {mode === 'edit' ? 'Save program' : 'Create program'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ProgramFormDrawer
