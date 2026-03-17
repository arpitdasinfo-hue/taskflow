import { memo, useState } from 'react'
import { Plus, Check, Trash2, Flag, Calendar, MoreHorizontal, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import useProjectStore from '../../store/useProjectStore'

const MilestoneRow = memo(function MilestoneRow({ milestone, projectColor }) {
  const toggleMilestone = useProjectStore((s) => s.toggleMilestone)
  const deleteMilestone = useProjectStore((s) => s.deleteMilestone)
  const updateMilestone = useProjectStore((s) => s.updateMilestone)
  const [confirmDel, setConfirmDel] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(milestone.name)
  const [description, setDescription] = useState(milestone.description ?? '')
  const [dueDate, setDueDate] = useState(milestone.dueDate ? milestone.dueDate.slice(0, 10) : '')

  const isCompleted = milestone.status === 'completed'
  const isOverdue   = milestone.dueDate && new Date(milestone.dueDate) < new Date() && !isCompleted

  const saveEdit = () => {
    if (!name.trim()) return
    updateMilestone(milestone.id, {
      name: name.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div
        className="rounded-xl p-3 space-y-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${projectColor}30` }}
      >
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') saveEdit()
            if (event.key === 'Escape') setEditing(false)
          }}
          placeholder="Milestone name"
          className="w-full text-xs px-2.5 py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          className="w-full text-xs px-2.5 py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="w-full text-xs px-2.5 py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', colorScheme: 'dark' }}
        />
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="px-2.5 py-1.5 rounded-lg text-[11px]" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)' }}>
            Cancel
          </button>
          <button type="button" onClick={saveEdit} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium" style={{ color: '#fff', background: projectColor }}>
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors group"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Toggle completion */}
      <button
        onClick={() => toggleMilestone(milestone.id)}
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={isCompleted
          ? { background: projectColor, borderColor: projectColor }
          : { borderColor: `${projectColor}60` }
        }
      >
        {isCompleted && <Check size={10} color="#fff" strokeWidth={3} />}
      </button>

      {/* Diamond icon */}
      <span className="text-[10px] flex-shrink-0" style={{ color: projectColor }}>◆</span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span
          className="text-xs font-medium truncate block"
          style={{
            color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}
        >
          {milestone.name}
        </span>
        {milestone.description && (
          <span className="text-[10px] truncate block" style={{ color: 'var(--text-secondary)' }}>
            {milestone.description}
          </span>
        )}
        {milestone.taskId && (
          <span className="text-[10px] inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
            Linked task
          </span>
        )}
      </div>

      {/* Due date */}
      {milestone.dueDate && (
        <span className="text-[10px] flex-shrink-0 flex items-center gap-0.5"
          style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
          <Calendar size={9} />
          {format(new Date(milestone.dueDate), 'MMM d')}
        </span>
      )}

      <div className="relative flex-shrink-0">
        {confirmDel ? (
          <div className="flex items-center gap-1">
            <button onClick={() => deleteMilestone(milestone.id)} className="p-1 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <Check size={10} />
            </button>
            <button onClick={() => setConfirmDel(false)} className="p-1 rounded" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-[10px]">✕</span>
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowMenu((current) => !current)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
            >
              <MoreHorizontal size={12} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden min-w-[140px]"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)', boxShadow: '0 16px 48px rgba(15,23,42,0.18)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      setEditing(true)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 transition-colors"
                    style={{ color: '#0f172a' }}
                  >
                    <Pencil size={11} />
                    Edit milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      setConfirmDel(true)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-100 transition-colors"
                    style={{ color: '#dc2626' }}
                  >
                    <Trash2 size={11} />
                    Delete milestone
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
})

const MilestonePanel = memo(function MilestonePanel({ projectId, projectColor }) {
  const milestones    = useProjectStore((s) => s.milestones)
  const addMilestone  = useProjectStore((s) => s.addMilestone)

  const [adding, setAdding]   = useState(false)
  const [name, setName]       = useState('')
  const [dueDate, setDueDate] = useState('')
  const [desc, setDesc]       = useState('')

  const projectMilestones = (milestones ?? []).filter((m) => m.projectId === projectId)

  const submit = () => {
    if (!name.trim()) return
    addMilestone({
      projectId,
      name: name.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      description: desc.trim(),
    })
    setName(''); setDueDate(''); setDesc(''); setAdding(false)
  }

  return (
    <div className="mt-3">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Flag size={11} style={{ color: projectColor }} />
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Milestones
            {projectMilestones.length > 0 && ` (${projectMilestones.filter(m => m.status === 'completed').length}/${projectMilestones.length})`}
          </span>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--accent)' }}
        >
          <Plus size={10} /> Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-2 p-3 rounded-xl space-y-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Milestone name…" maxLength={80}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--text-primary)' }}
          />
          <input
            value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)" maxLength={120}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
          />
          <input
            type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', colorScheme: 'dark' }}
          />
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 btn-accent py-1 text-xs">Add Milestone</button>
            <button onClick={() => setAdding(false)} className="btn-ghost py-1 text-xs px-2">Cancel</button>
          </div>
        </div>
      )}

      {/* Milestones list */}
      {projectMilestones.length === 0 && !adding ? (
        <p className="text-[10px] text-center py-2" style={{ color: 'var(--text-secondary)' }}>
          No milestones yet
        </p>
      ) : (
        <div className="space-y-1">
          {projectMilestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} projectColor={projectColor} />
          ))}
        </div>
      )}
    </div>
  )
})

export default MilestonePanel
