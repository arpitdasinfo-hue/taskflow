import { memo, useState, useCallback, useRef } from 'react'
import { Plus, Trash2, Pencil, Check, X, StickyNote } from 'lucide-react'
import { format } from 'date-fns'
import useTaskStore from '../../store/useTaskStore'

const NoteItem = memo(function NoteItem({ taskId, note }) {
  const [editing, setEditing]   = useState(false)
  const [value, setValue]       = useState(note.content)
  const updateNote  = useTaskStore((s) => s.updateNote)
  const deleteNote  = useTaskStore((s) => s.deleteNote)

  const save = useCallback(() => {
    if (value.trim()) updateNote(taskId, note.id, value.trim())
    setEditing(false)
  }, [value, taskId, note.id, updateNote])

  const cancel = useCallback(() => {
    setValue(note.content)
    setEditing(false)
  }, [note.content])

  const createdTs = note.createdAt ? new Date(note.createdAt) : null
  const updatedTs = note.updatedAt ? new Date(note.updatedAt) : createdTs
  const isEdited = Boolean(
    createdTs &&
    updatedTs &&
    !Number.isNaN(createdTs.getTime()) &&
    !Number.isNaN(updatedTs.getTime()) &&
    createdTs.getTime() !== updatedTs.getTime()
  )
  const timestamp = updatedTs && !Number.isNaN(updatedTs.getTime())
    ? format(updatedTs, 'dd MMM, h:mm a')
    : null

  return (
    <div className="group rounded-xl p-3 anim-slide-up" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {editing ? (
        <>
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
            rows={3}
            className="w-full text-sm resize-none rounded-lg px-2 py-1.5 mb-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.3)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <button onClick={save}   className="btn-accent px-3 py-1 text-xs">Save</button>
            <button onClick={cancel} className="btn-ghost text-xs">Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed mb-2 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {note.content}
          </p>
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] inline-flex items-center gap-1.5"
              style={{ color: 'var(--text-secondary)' }}
              title={timestamp ? `${isEdited ? 'Updated' : 'Created'} ${timestamp}` : undefined}
            >
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.38)' }}
              />
              {timestamp ? `${isEdited ? 'Updated' : 'Created'} ${timestamp}` : 'Saved'}
            </span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Edit note"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => deleteNote(taskId, note.id)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: '#ef4444' }}
                aria-label="Delete note"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
})

const NoteList = memo(function NoteList({ taskId, notes }) {
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const addNote = useTaskStore((s) => s.addNote)
  const textareaRef = useRef()

  const handleAdd = useCallback(() => {
    if (newText.trim()) {
      addNote(taskId, newText.trim())
      setNewText('')
      setAdding(false)
    }
  }, [newText, taskId, addNote])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Notes
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {/* List */}
      <div className="space-y-2 mb-3">
        {notes.map((note) => (
          <NoteItem key={note.id} taskId={taskId} note={note} />
        ))}
        {notes.length === 0 && !adding && (
          <div className="text-center py-6">
            <StickyNote size={20} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--accent)' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No notes yet</p>
          </div>
        )}
      </div>

      {/* Add note */}
      {adding ? (
        <div className="anim-scale-in">
          <textarea
            ref={textareaRef}
            autoFocus
            placeholder="Write a note…"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setAdding(false); setNewText('') }
            }}
            rows={3}
            className="w-full text-sm resize-none rounded-xl px-3 py-2.5 mb-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.3)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-accent px-3 py-1.5 text-xs">Save Note</button>
            <button
              onClick={() => { setAdding(false); setNewText('') }}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm py-1.5 px-2 rounded-xl w-full hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Plus size={14} />
          Add note
        </button>
      )}
    </div>
  )
})

export default NoteList
