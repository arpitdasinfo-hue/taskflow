import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Plus, X, Calendar, ChevronDown, Folder } from 'lucide-react'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore from '../../store/useProjectStore'
import useSettingsStore from '../../store/useSettingsStore'
import { PriorityBadge } from '../common/Badge'

const PRIORITIES = ['critical', 'high', 'medium', 'low']

const QuickAdd = memo(function QuickAdd() {
  const [open, setOpen]           = useState(false)
  const [title, setTitle]         = useState('')
  const [priority, setPriority]   = useState('medium')
  const [dueDate, setDueDate]     = useState('')
  const [showMore, setShowMore]   = useState(false)
  const [projectId, setProjectId] = useState(null)
  const addTask        = useTaskStore((s) => s.addTask)
  const projects       = useProjectStore((s) => s.projects)
  const activeProjectId = useSettingsStore((s) => s.activeProjectId)
  const inputRef  = useRef()

  // Pre-select active project when opening
  useEffect(() => { if (open) setProjectId(activeProjectId ?? null) }, [open, activeProjectId])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const handleClose = useCallback(() => {
    setOpen(false)
    setTitle('')
    setPriority('medium')
    setDueDate('')
    setShowMore(false)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return
    addTask({
      title: title.trim(),
      priority,
      projectId,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    })
    handleClose()
  }, [title, priority, dueDate, projectId, addTask, handleClose])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }, [handleSubmit])

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-5 md:right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-20 btn-accent accent-glow anim-scale-in"
          aria-label="Create new task"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Form overlay */}
      {open && (
        <>
          <div className="overlay-bg" onClick={handleClose} />
          <div
            className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-[480px]
                       rounded-t-3xl md:rounded-2xl p-5 z-50 anim-slide-up safe-bottom"
            style={{
              background: 'rgba(18,8,30,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(var(--accent-rgb),0.25)',
              boxShadow: '0 -16px 64px rgba(var(--accent-rgb),0.12)',
            }}
          >
            {/* Title row */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                New Task
              </span>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              className="w-full text-base font-medium mb-4 py-2 border-b bg-transparent"
              style={{ borderColor: 'rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }}
              maxLength={200}
            />

            {/* Quick options */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`transition-transform ${priority === p ? 'scale-105' : 'opacity-50 hover:opacity-75'}`}
                >
                  <PriorityBadge priority={p} size="xs" />
                </button>
              ))}

              <button
                onClick={() => setShowMore((v) => !v)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)' }}
              >
                <ChevronDown size={10} className={showMore ? 'rotate-180' : ''} />
                More
              </button>
            </div>

            {/* Project picker (expandable) */}
            {showMore && projects.length > 0 && (
              <div className="mb-3 anim-slide-down">
                <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Folder size={11} />
                  Project
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setProjectId(null)}
                    className="text-xs px-2.5 py-1 rounded-full border transition-all"
                    style={!projectId
                      ? { background: 'rgba(var(--accent-rgb),0.15)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                      : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }
                    }
                  >
                    None
                  </button>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProjectId(p.id)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all"
                      style={projectId === p.id
                        ? { background: `${p.color}20`, borderColor: p.color, color: p.color }
                        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Due date (expandable) */}
            {showMore && (
              <div className="mb-3 anim-slide-down">
                <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar size={11} />
                  Due date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', colorScheme: 'dark' }}
                />
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="w-full btn-accent py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              Create Task
            </button>
          </div>
        </>
      )}
    </>
  )
})

export default QuickAdd
