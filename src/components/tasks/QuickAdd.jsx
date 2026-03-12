import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Folder, Layers3, Plus, X } from 'lucide-react'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore, { PROJECT_COLORS } from '../../store/useProjectStore'
import useSettingsStore from '../../store/useSettingsStore'
import { PriorityBadge } from '../common/Badge'
import ColorPalettePicker from '../common/ColorPalettePicker'

const TYPES = [
  { id: 'program', label: 'Program' },
  { id: 'project', label: 'Project' },
  { id: 'task', label: 'Task' },
]

const PRIORITIES = ['critical', 'high', 'medium', 'low']

const QuickAdd = memo(function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('task')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(null)
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [programId, setProgramId] = useState('')
  const [filterProgramId, setFilterProgramId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const addTask = useTaskStore((s) => s.addTask)
  const addProgram = useProjectStore((s) => s.addProgram)
  const addProject = useProjectStore((s) => s.addProject)
  const programs = useProjectStore((s) => s.programs)
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useSettingsStore((s) => s.activeProjectId)
  const inputRef = useRef()

  const filteredProjects = useMemo(
    () => (filterProgramId ? projects.filter((p) => p.programId === filterProgramId) : projects),
    [filterProgramId, projects]
  )

  useEffect(() => {
    if (!open) return
    const active = projects.find((p) => p.id === activeProjectId)
    setSelectedProjectId(activeProjectId ?? '')
    setFilterProgramId(active?.programId ?? '')
  }, [open, activeProjectId, projects])

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, type])

  useEffect(() => {
    if (!selectedProjectId) return
    const project = projects.find((p) => p.id === selectedProjectId)
    if (!project) {
      setSelectedProjectId('')
      return
    }
    if (filterProgramId && project.programId !== filterProgramId) {
      setSelectedProjectId('')
    }
  }, [filterProgramId, selectedProjectId, projects])

  const handleClose = useCallback(() => {
    setOpen(false)
    setType('task')
    setName('')
    setDesc('')
    setColor(null)
    setPriority('medium')
    setDueDate('')
    setProgramId('')
    setFilterProgramId('')
    setSelectedProjectId('')
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  useEffect(() => {
    const onQuickAddRequest = (event) => {
      const detail = event.detail ?? {}
      const requestedType = detail.type ?? 'task'
      const requestedProjectId = detail.projectId ?? ''
      const project = projects.find((p) => p.id === requestedProjectId)

      setOpen(true)
      setType(requestedType)
      setName('')
      setDesc('')
      setColor(null)
      setPriority('medium')
      setDueDate('')

      if (requestedType === 'task') {
        setSelectedProjectId(requestedProjectId)
        setFilterProgramId(detail.programId ?? project?.programId ?? '')
      }

      if (requestedType === 'project') {
        setProgramId(detail.programId ?? '')
      }
    }

    window.addEventListener('taskflow:quick-add', onQuickAddRequest)
    return () => window.removeEventListener('taskflow:quick-add', onQuickAddRequest)
  }, [projects])

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return

    if (type === 'program') {
      addProgram({ name: name.trim(), description: desc.trim(), color: color || undefined })
      handleClose()
      return
    }

    if (type === 'project') {
      addProject({
        name: name.trim(),
        description: desc.trim(),
        programId: programId || null,
        color: color || undefined,
      })
      handleClose()
      return
    }

    addTask({
      title: name.trim(),
      priority,
      projectId: selectedProjectId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    })
    handleClose()
  }, [name, type, desc, color, addProgram, handleClose, addProject, programId, addTask, priority, selectedProjectId, dueDate])

  const submitLabel = type === 'task' ? 'Add task' : 'Create'

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-5 md:right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-20 btn-accent accent-glow anim-scale-in"
          aria-label="Open quick add"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {open && (
        <>
          <div className="overlay-bg" onClick={handleClose} />
          <div
            className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-[520px]
                       rounded-t-3xl md:rounded-2xl p-5 z-50 anim-slide-up safe-bottom"
            style={{
              background: 'rgba(18,8,30,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(var(--accent-rgb),0.25)',
              boxShadow: '0 -16px 64px rgba(var(--accent-rgb),0.12)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Quick Add
              </span>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {TYPES.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setType(tab.id)}
                  className="py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={type === tab.id
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-secondary)' }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  {type === 'task' ? 'Title*' : 'Name*'}
                </label>
                <input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                  placeholder={type === 'program' ? 'Program name' : type === 'project' ? 'Project name' : 'Task title'}
                  className="w-full text-sm px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.25)', color: 'var(--text-primary)' }}
                  maxLength={200}
                />
              </div>

              {(type === 'program' || type === 'project') && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Description (optional)
                  </label>
                  <input
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Short description"
                    className="w-full text-sm px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                    maxLength={140}
                  />
                </div>
              )}

              {type === 'task' && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Priority
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`transition-transform ${priority === p ? 'scale-105' : 'opacity-50 hover:opacity-75'}`}
                      >
                        <PriorityBadge priority={p} size="xs" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {type === 'project' && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Program
                  </label>
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Unassigned</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {type === 'task' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Layers3 size={11} />
                      Program
                    </label>
                    <select
                      value={filterProgramId}
                      onChange={(e) => setFilterProgramId(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                    >
                      <option value="">All programs</option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>{program.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Folder size={11} />
                      Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                    >
                      <option value="">None</option>
                      {filteredProjects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {type === 'task' && (
                <div>
                  <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar size={11} />
                    Due date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', colorScheme: 'dark' }}
                  />
                </div>
              )}

              {(type === 'program' || type === 'project') && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Color
                  </label>
                  <ColorPalettePicker
                    colors={PROJECT_COLORS}
                    value={color}
                    allowAuto
                    autoLabel="Auto assign"
                    onChange={setColor}
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="w-full btn-accent py-3 text-sm font-semibold mt-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitLabel}
            </button>
          </div>
        </>
      )}
    </>
  )
})

export default QuickAdd
