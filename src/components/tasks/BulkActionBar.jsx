import { memo, useState } from 'react'
import { X, Trash2, ChevronDown, Check } from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore from '../../store/useProjectStore'

const STATUSES   = ['todo', 'in-progress', 'review', 'done', 'blocked']
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const STATUS_LABELS   = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done', 'blocked': 'Blocked' }
const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' }

const DropdownMenu = memo(function DropdownMenu({ label, options, onSelect, renderOption, disabled = false }) {
  const [open, setOpen] = useState(false)
  const menuId = label.replace(/\s+/g, '-').toLowerCase()
  return (
    <div className="relative" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}>
      <button
        onClick={() => {
          if (disabled) return
          setOpen((o) => !o)
        }}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors hover:bg-white/10"
        style={disabled
          ? { color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)', opacity: 0.45, cursor: 'not-allowed' }
          : { color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        {label}
        <ChevronDown size={11} style={{ color: 'var(--text-secondary)' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            id={menuId}
            role="menu"
            className="absolute bottom-full mb-2 left-0 rounded-xl overflow-hidden z-50 min-w-[140px]"
            style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)', boxShadow: '0 16px 48px rgba(15,23,42,0.18)' }}
          >
            {options.map((opt) => (
              <button
                key={typeof opt === 'string' ? opt : opt.id}
                role="menuitem"
                onClick={() => { onSelect(typeof opt === 'string' ? opt : opt.id); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 transition-colors"
                style={{ color: '#0f172a' }}
              >
                {renderOption ? renderOption(opt) : (typeof opt === 'string' ? opt : opt.name)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
})

const BulkActionBar = memo(function BulkActionBar({ active = false, onExitSelectMode = null }) {
  const selectedTaskIds   = useSettingsStore((s) => s.selectedTaskIds)
  const clearTaskSelection = useSettingsStore((s) => s.clearTaskSelection)
  const bulkUpdateTasks   = useTaskStore((s) => s.bulkUpdateTasks)
  const bulkDeleteTasks   = useTaskStore((s) => s.bulkDeleteTasks)
  const projects          = useProjectStore((s) => s.projects)

  const [confirmDelete, setConfirmDelete] = useState(false)

  const hasSelection = selectedTaskIds.length > 0

  if (!active && !hasSelection) return null

  const handleBulkStatus   = (status) => { bulkUpdateTasks(selectedTaskIds, { status }); clearTaskSelection() }
  const handleBulkPriority = (priority) => { bulkUpdateTasks(selectedTaskIds, { priority }); clearTaskSelection() }
  const handleBulkProject  = (projectId) => { bulkUpdateTasks(selectedTaskIds, { projectId }); clearTaskSelection() }
  const handleDelete = () => {
    if (!hasSelection) return
    if (confirmDelete) {
      bulkDeleteTasks(selectedTaskIds)
      clearTaskSelection()
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div
      className="fixed bottom-[60px] md:bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl anim-slide-up"
      style={{
        background: 'rgba(15,5,28,0.97)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(var(--accent-rgb),0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--accent-rgb),0.1)',
        maxWidth: 'calc(100vw - 2rem)',
      }}
    >
      {/* Count */}
      <span
        className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
      >
        {selectedTaskIds.length} selected
      </span>

      {!hasSelection && (
        <span className="sr-only md:not-sr-only md:inline text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          Tap tasks to select them
        </span>
      )}

      <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.1)' }} />

      {/* Status */}
      <DropdownMenu
        label="Set Status"
        options={STATUSES}
        onSelect={handleBulkStatus}
        renderOption={(s) => <span>{STATUS_LABELS[s]}</span>}
        disabled={!hasSelection}
      />

      {/* Priority */}
      <DropdownMenu
        label="Set Priority"
        options={PRIORITIES}
        onSelect={handleBulkPriority}
        renderOption={(p) => (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[p] }} />
            <span className="capitalize">{p}</span>
          </span>
        )}
        disabled={!hasSelection}
      />

      {/* Move to project */}
      {projects.length > 0 && (
        <DropdownMenu
          label="Move to…"
          options={projects}
          onSelect={handleBulkProject}
          renderOption={(p) => (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              {p.name}
            </span>
          )}
          disabled={!hasSelection}
        />
      )}

      <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.1)' }} />

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: '#ef4444' }}>Move {selectedTaskIds.length} to trash?</span>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
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
        </div>
      ) : (
        <button
          onClick={handleDelete}
          disabled={!hasSelection}
          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
          style={hasSelection ? { color: '#ef4444' } : { color: 'var(--text-secondary)', opacity: 0.45, cursor: 'not-allowed' }}
          title="Move selected tasks to trash"
        >
          <Trash2 size={14} />
        </button>
      )}

      {/* Clear selection */}
      <button
        onClick={() => {
          clearTaskSelection()
          onExitSelectMode?.()
          setConfirmDelete(false)
        }}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        title="Exit select mode"
      >
        <X size={14} />
      </button>
    </div>
  )
})

export default BulkActionBar
