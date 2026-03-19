import { memo, useState } from 'react'
import { LayoutTemplate, Trash2, X, Search } from 'lucide-react'
import useTemplateStore from '../../store/useTemplateStore'

const TemplatePicker = memo(function TemplatePicker({ onSelect, onClose }) {
  const templates = useTemplateStore((s) => s.templates)
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate)
  const [query, setQuery] = useState('')

  const filtered = query
    ? templates.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.title.toLowerCase().includes(query.toLowerCase()))
    : templates

  return (
    <div
      className="absolute inset-0 rounded-2xl z-10 flex flex-col"
      style={{ background: 'rgba(12,6,24,0.98)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <LayoutTemplate size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Templates</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Search size={12} style={{ color: 'var(--text-secondary)' }} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
        {filtered.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            {templates.length === 0
              ? 'No templates yet. Save a task as a template from Task Detail.'
              : 'No templates match your search.'}
          </p>
        ) : (
          filtered.map((tmpl) => (
            <div
              key={tmpl.id}
              className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
            >
              <button
                className="flex-1 text-left min-w-0"
                onClick={() => { onSelect(tmpl); onClose() }}
              >
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</p>
                {tmpl.title && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{tmpl.title}</p>
                )}
                {tmpl.subtasks.length > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {tmpl.subtasks.length} subtask{tmpl.subtasks.length !== 1 ? 's' : ''}
                  </p>
                )}
              </button>
              <button
                onClick={() => deleteTemplate(tmpl.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
                title="Delete template"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

export default TemplatePicker
