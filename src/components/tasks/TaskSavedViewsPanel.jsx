import { memo, useState } from 'react'
import { Bookmark, Plus, Trash2 } from 'lucide-react'

const TaskSavedViewsPanel = memo(function TaskSavedViewsPanel({
  savedViews = [],
  onApply,
  onSave,
  onDelete,
}) {
  const [composerOpen, setComposerOpen] = useState(false)
  const [draftName, setDraftName] = useState('')

  const commitView = () => {
    const normalized = draftName.trim()
    if (!normalized) return
    onSave?.(normalized)
    setDraftName('')
    setComposerOpen(false)
  }

  return (
    <section
      className="rounded-[20px] p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
          Saved Views
        </p>
        <button
          onClick={() => setComposerOpen((o) => !o)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Plus size={11} />
          Save current
        </button>
      </div>

      {composerOpen && (
        <div className="flex items-center gap-2 mb-3">
          <input
            autoFocus
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitView(); if (e.key === 'Escape') { setComposerOpen(false); setDraftName('') } }}
            placeholder="View name…"
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={commitView}
            disabled={!draftName.trim()}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'rgba(var(--accent-rgb),0.18)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}
          >
            Save
          </button>
        </div>
      )}

      {savedViews.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          No saved views yet — save your current filters as a view to reuse them quickly.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {savedViews.map((view) => (
            <div
              key={view.id}
              className="flex items-center gap-1.5 rounded-xl pl-2.5 pr-1.5 py-1"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Bookmark size={10} style={{ color: 'var(--accent)' }} />
              <button
                onClick={() => onApply?.(view)}
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {view.name}
              </button>
              <button
                onClick={() => onDelete?.(view.id)}
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Delete view"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
})

export default TaskSavedViewsPanel
