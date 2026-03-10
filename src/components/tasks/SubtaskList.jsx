import { memo, useState, useCallback, useRef } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import useTaskStore from '../../store/useTaskStore'

const SubtaskItem = memo(function SubtaskItem({ taskId, subtask }) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(subtask.title)
  const toggleSubtask  = useTaskStore((s) => s.toggleSubtask)
  const updateSubtask  = useTaskStore((s) => s.updateSubtask)
  const deleteSubtask  = useTaskStore((s) => s.deleteSubtask)
  const inputRef = useRef()

  const save = useCallback(() => {
    if (editValue.trim()) updateSubtask(taskId, subtask.id, editValue.trim())
    setEditing(false)
  }, [editValue, taskId, subtask.id, updateSubtask])

  const cancel = useCallback(() => {
    setEditValue(subtask.title)
    setEditing(false)
  }, [subtask.title])

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5 anim-scale-in">
        <input
          ref={inputRef}
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          className="flex-1 text-sm px-2 py-1 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.3)', color: 'var(--text-primary)' }}
          maxLength={200}
        />
        <button onClick={save}   className="p-1 rounded-lg hover:opacity-80" style={{ color: '#10b981' }}><Check size={14} /></button>
        <button onClick={cancel} className="p-1 rounded-lg hover:opacity-80" style={{ color: 'var(--text-secondary)' }}><X size={14} /></button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2.5 py-1.5 rounded-lg px-1 hover:bg-white/5 transition-colors">
      <input
        type="checkbox"
        className="custom-checkbox"
        checked={subtask.completed}
        onChange={() => toggleSubtask(taskId, subtask.id)}
      />
      <span
        className={`flex-1 text-sm leading-snug ${subtask.completed ? 'line-through opacity-40' : ''}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {subtask.title}
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => { setEditValue(subtask.title); setEditing(true) }}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Edit subtask"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => deleteSubtask(taskId, subtask.id)}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: '#ef4444' }}
          aria-label="Delete subtask"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
})

const SubtaskList = memo(function SubtaskList({ taskId, subtasks }) {
  const [newText, setNewText] = useState('')
  const [adding, setAdding]   = useState(false)
  const addSubtask = useTaskStore((s) => s.addSubtask)
  const inputRef   = useRef()

  const completed = subtasks.filter((s) => s.completed).length

  const handleAdd = useCallback(() => {
    if (newText.trim()) {
      addSubtask(taskId, newText.trim())
      setNewText('')
    }
  }, [newText, taskId, addSubtask])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Subtasks
        </span>
        {subtasks.length > 0 && (
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            {completed}/{subtasks.length} done
          </span>
        )}
      </div>

      {/* Progress */}
      {subtasks.length > 0 && (
        <div className="progress-track mb-3">
          <div className="progress-fill" style={{ width: `${(completed / subtasks.length) * 100}%` }} />
        </div>
      )}

      {/* List */}
      <div className="space-y-0.5 mb-2">
        {subtasks.map((sub) => (
          <SubtaskItem key={sub.id} taskId={taskId} subtask={sub} />
        ))}
        {subtasks.length === 0 && !adding && (
          <p className="text-xs py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
            No subtasks yet
          </p>
        )}
      </div>

      {/* Add input */}
      {adding ? (
        <div className="flex items-center gap-2 anim-scale-in">
          <input
            ref={inputRef}
            autoFocus
            placeholder="New subtask…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewText('') }
            }}
            className="flex-1 text-sm px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.3)', color: 'var(--text-primary)' }}
            maxLength={200}
          />
          <button onClick={handleAdd} className="btn-accent px-3 py-1.5 text-xs">Add</button>
          <button
            onClick={() => { setAdding(false); setNewText('') }}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm py-1.5 px-2 rounded-xl w-full hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Plus size={14} />
          Add subtask
        </button>
      )}
    </div>
  )
})

export default SubtaskList
