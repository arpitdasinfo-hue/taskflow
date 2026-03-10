import { memo, useState, useCallback, useEffect } from 'react'
import { X, Trash2, Calendar, Tag, ChevronDown, Folder } from 'lucide-react'
import { format } from 'date-fns'
import useSettingsStore from '../../store/useSettingsStore'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore from '../../store/useProjectStore'
import { PriorityBadge, StatusBadge, TagBadge } from '../common/Badge'
import SubtaskList from './SubtaskList'
import NoteList from './NoteList'

const STATUSES   = ['todo', 'in-progress', 'review', 'done', 'blocked']
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const STATUS_LABELS = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'In Review', 'done': 'Done', 'blocked': 'Blocked' }

const SelectField = memo(function SelectField({ label, value, options, onChange, renderOption }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
      >
        <span>{renderOption ? renderOption(value, true) : value}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 anim-slide-down"
            style={{ background: '#1a1025', border: '1px solid rgba(var(--accent-rgb),0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                style={opt === value ? { background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' } : { color: 'var(--text-primary)' }}
              >
                {renderOption ? renderOption(opt, false) : opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
})

const TaskDetail = memo(function TaskDetail() {
  const selectedTaskId = useSettingsStore((s) => s.selectedTaskId)
  const closeTask      = useSettingsStore((s) => s.closeTask)
  const tasks          = useTaskStore((s) => s.tasks)
  const updateTask     = useTaskStore((s) => s.updateTask)
  const deleteTask     = useTaskStore((s) => s.deleteTask)
  const projects       = useProjectStore((s) => s.projects)

  const task = tasks.find((t) => t.id === selectedTaskId)
  const [tab, setTab]         = useState('subtasks')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue]     = useState('')
  const [editingDesc, setEditingDesc]   = useState(false)
  const [descValue, setDescValue]       = useState('')
  const [tagInput, setTagInput]         = useState('')

  useEffect(() => {
    if (task) {
      setTitleValue(task.title)
      setDescValue(task.description || '')
    }
  }, [task?.id])

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeTask() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeTask])

  const saveTitle = useCallback(() => {
    if (task?.id && titleValue.trim()) updateTask(task.id, { title: titleValue.trim() })
    setEditingTitle(false)
  }, [titleValue, task?.id, updateTask])

  const saveDesc = useCallback(() => {
    if (task?.id) updateTask(task.id, { description: descValue })
    setEditingDesc(false)
  }, [descValue, task?.id, updateTask])

  const handleAddTag = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim() && task?.id) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase().replace(/,/g, '')
      if (tag && !task.tags.includes(tag)) updateTask(task.id, { tags: [...task.tags, tag] })
      setTagInput('')
    }
  }, [tagInput, task?.id, task?.tags, updateTask])

  const removeTag = useCallback((tag) => {
    if (task?.id) updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) })
  }, [task?.id, task?.tags, updateTask])

  const handleDelete = useCallback(() => {
    if (task?.id) deleteTask(task.id)
    closeTask()
  }, [task?.id, deleteTask, closeTask])

  if (!task) return null

  const panel = (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'rgba(10,0,21,0.92)', borderLeft: '1px solid var(--glass-border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} size="xs" />
          <StatusBadge status={task.status} size="xs" />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl hover:bg-red-500/10 transition-colors"
            style={{ color: '#ef4444' }}
            aria-label="Delete task"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={closeTask}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Title */}
        <div>
          {editingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
              className="w-full text-lg font-bold px-0 py-1 border-b-2 bg-transparent"
              style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
              maxLength={200}
            />
          ) : (
            <h2
              className="text-lg font-bold cursor-text hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-primary)' }}
              onClick={() => setEditingTitle(true)}
              title="Click to edit title"
            >
              {task.title}
            </h2>
          )}
        </div>

        {/* Fields grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Status
            </label>
            <SelectField
              value={task.status}
              options={STATUSES}
              onChange={(v) => updateTask(task.id, { status: v })}
              renderOption={(v) => (
                <StatusBadge status={v} size="xs" />
              )}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Priority
            </label>
            <SelectField
              value={task.priority}
              options={PRIORITIES}
              onChange={(v) => updateTask(task.id, { priority: v })}
              renderOption={(v) => <PriorityBadge priority={v} size="xs" />}
            />
          </div>
        </div>

        {/* Project */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Folder size={10} />
            Project
          </label>
          <SelectField
            value={task.projectId}
            options={[null, ...projects.map((p) => p.id)]}
            onChange={(v) => updateTask(task.id, { projectId: v })}
            renderOption={(v) => {
              const proj = projects.find((p) => p.id === v)
              return proj
                ? <span className="flex items-center gap-1.5 text-xs"><span className="w-2 h-2 rounded-full" style={{ background: proj.color }} />{proj.name}</span>
                : <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>No project</span>
            }}
          />
        </div>

        {/* Due date */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Calendar size={10} />
            Due Date
          </label>
          <input
            type="date"
            value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
            onChange={(e) => updateTask(task.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full text-sm px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', colorScheme: 'dark' }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
            Description
          </label>
          {editingDesc ? (
            <div>
              <textarea
                autoFocus
                rows={3}
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={(e) => { if (e.key === 'Escape') { saveDesc() } }}
                className="w-full text-sm resize-none rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.3)', color: 'var(--text-primary)' }}
              />
              <button onClick={saveDesc} className="mt-1.5 btn-accent px-3 py-1 text-xs">Save</button>
            </div>
          ) : (
            <div
              className="text-sm rounded-xl px-3 py-2.5 cursor-text min-h-[60px] hover:bg-white/5 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: task.description ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: task.description ? 'normal' : 'italic' }}
              onClick={() => setEditingDesc(true)}
              title="Click to edit description"
            >
              {task.description || 'Add a description…'}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Tag size={10} />
            Tags
          </label>
          <div
            className="flex flex-wrap gap-1.5 p-2.5 rounded-xl min-h-[36px]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {task.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} onRemove={removeTag} />
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={task.tags.length === 0 ? 'Add tags…' : ''}
              className="text-xs flex-1 min-w-[80px] bg-transparent"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Press Enter or comma to add a tag
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Tabs */}
        <div>
          <div
            className="flex gap-1 p-1 rounded-xl mb-4"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            {['subtasks', 'notes'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={tab === t
                  ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(var(--accent-rgb),0.3)' }
                  : { color: 'var(--text-secondary)' }
                }
              >
                {t === 'subtasks' ? `Subtasks (${task.subtasks.length})` : `Notes (${task.notes.length})`}
              </button>
            ))}
          </div>

          {tab === 'subtasks' && (
            <SubtaskList taskId={task.id} subtasks={task.subtasks} />
          )}
          {tab === 'notes' && (
            <NoteList taskId={task.id} notes={task.notes} />
          )}
        </div>
      </div>
    </div>
  )

  // Desktop: slide-over panel | Mobile: bottom sheet
  return (
    <>
      {/* Overlay */}
      <div className="overlay-bg" onClick={closeTask} />

      {/* Desktop panel */}
      <div
        className="hidden md:flex fixed top-0 right-0 bottom-0 w-[400px] z-50 flex-col animate-slide-right"
        style={{ animationDuration: '0.3s' }}
      >
        {panel}
      </div>

      {/* Mobile bottom sheet */}
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl overflow-hidden anim-slide-up"
        style={{ maxHeight: '90dvh', height: '90dvh' }}
      >
        {panel}
      </div>
    </>
  )
})

export default TaskDetail
