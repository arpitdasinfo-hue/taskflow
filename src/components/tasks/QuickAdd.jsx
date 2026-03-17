import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Folder, Layers3, Plus, X } from 'lucide-react'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore, { PROJECT_COLORS, PROGRAM_SCOPE_OPTIONS } from '../../store/useProjectStore'
import useSettingsStore from '../../store/useSettingsStore'
import usePlanningStore from '../../store/usePlanningStore'
import useWorkspaceScopedData from '../../hooks/useWorkspaceScopedData'
import { PriorityBadge } from '../common/Badge'
import ColorPalettePicker from '../common/ColorPalettePicker'

const TYPES = [
  { id: 'program', label: 'Program' },
  { id: 'project', label: 'Project' },
  { id: 'task', label: 'Task' },
]

const PRIORITIES = ['critical', 'high', 'medium', 'low']
const PLAN_TARGETS = [
  { id: 'none', label: 'No plan' },
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

const QuickAdd = memo(function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('task')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(null)
  const [programScope, setProgramScope] = useState('professional')
  const [priority, setPriority] = useState('medium')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [planningTarget, setPlanningTarget] = useState('none')
  const [programId, setProgramId] = useState('')
  const [filterProgramId, setFilterProgramId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedSubProjectId, setSelectedSubProjectId] = useState('')

  const addTask = useTaskStore((s) => s.addTask)
  const commitTask = usePlanningStore((s) => s.commitTask)
  const addProgram = useProjectStore((s) => s.addProgram)
  const addProject = useProjectStore((s) => s.addProject)
  const activeProjectId = useSettingsStore((s) => s.activeProjectId)
  const workspaceViewScope = useSettingsStore((s) => s.workspaceViewScope)
  const { programs, projects } = useWorkspaceScopedData()
  const inputRef = useRef()

  const deriveTaskSelection = useCallback((projectId) => {
    if (!projectId) return { nextProgramId: '', nextProjectId: '', nextSubProjectId: '' }
    const target = projects.find((project) => project.id === projectId)
    if (!target) return { nextProgramId: '', nextProjectId: '', nextSubProjectId: '' }
    if (target.parentId) {
      const parent = projects.find((project) => project.id === target.parentId)
      return {
        nextProgramId: target.programId ?? parent?.programId ?? '',
        nextProjectId: parent?.id ?? '',
        nextSubProjectId: target.id,
      }
    }
    return {
      nextProgramId: target.programId ?? '',
      nextProjectId: target.id,
      nextSubProjectId: '',
    }
  }, [projects])

  const topLevelProjects = useMemo(
    () => projects.filter((project) => !project.parentId && (!filterProgramId || project.programId === filterProgramId)),
    [projects, filterProgramId]
  )

  const subProjects = useMemo(
    () => (selectedProjectId ? projects.filter((project) => project.parentId === selectedProjectId) : []),
    [projects, selectedProjectId]
  )

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === filterProgramId) ?? null,
    [programs, filterProgramId]
  )

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  const selectedSubProject = useMemo(
    () => projects.find((project) => project.id === selectedSubProjectId) ?? null,
    [projects, selectedSubProjectId]
  )

  useEffect(() => {
    if (!open) return
    const { nextProgramId, nextProjectId, nextSubProjectId } = deriveTaskSelection(activeProjectId)
    setSelectedProjectId(nextProjectId)
    setSelectedSubProjectId(nextSubProjectId)
    setFilterProgramId(nextProgramId)
    setProgramScope(workspaceViewScope)
  }, [open, activeProjectId, deriveTaskSelection, workspaceViewScope])

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, type])

  useEffect(() => {
    if (!selectedProjectId) return
    const project = projects.find((p) => p.id === selectedProjectId)
    if (!project) {
      setSelectedProjectId('')
      setSelectedSubProjectId('')
      return
    }
    if (filterProgramId && project.programId !== filterProgramId) {
      setSelectedProjectId('')
      setSelectedSubProjectId('')
    }
  }, [filterProgramId, selectedProjectId, projects])

  useEffect(() => {
    if (!selectedSubProjectId) return
    const subProject = projects.find((project) => project.id === selectedSubProjectId)
    if (!subProject || subProject.parentId !== selectedProjectId) {
      setSelectedSubProjectId('')
    }
  }, [selectedSubProjectId, selectedProjectId, projects])

  const handleClose = useCallback(() => {
    setOpen(false)
    setType('task')
    setName('')
    setDesc('')
    setColor(null)
    setProgramScope('professional')
    setPriority('medium')
    setStartDate('')
    setDueDate('')
    setPlanningTarget('none')
    setProgramId('')
    setFilterProgramId('')
    setSelectedProjectId('')
    setSelectedSubProjectId('')
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
      const {
        nextProgramId,
        nextProjectId,
        nextSubProjectId,
      } = deriveTaskSelection(requestedProjectId)

      setOpen(true)
      setType(requestedType)
      setName('')
      setDesc('')
      setColor(null)
      setProgramScope(workspaceViewScope)
      setPriority('medium')
      setStartDate('')
      setDueDate('')
      setPlanningTarget('none')

      if (requestedType === 'task') {
        setSelectedProjectId(nextProjectId)
        setSelectedSubProjectId(nextSubProjectId)
        setFilterProgramId(detail.programId ?? nextProgramId)
      }

      if (requestedType === 'project') {
        setProgramId(detail.programId ?? '')
      }
    }

    window.addEventListener('taskflow:quick-add', onQuickAddRequest)
    return () => window.removeEventListener('taskflow:quick-add', onQuickAddRequest)
  }, [deriveTaskSelection, workspaceViewScope])

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return

    if (type === 'program') {
      addProgram({ name: name.trim(), description: desc.trim(), color: color || undefined, scope: programScope })
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

    const createdTask = addTask({
      title: name.trim(),
      priority,
      scope: workspaceViewScope,
      programId: filterProgramId || null,
      projectId: selectedSubProjectId || selectedProjectId || null,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    })

    if (createdTask?.id && planningTarget !== 'none') {
      commitTask({
        taskId: createdTask.id,
        periodType: planningTarget,
        bucket: planningTarget === 'day' ? 'focus' : 'must',
      })
    }

    handleClose()
  }, [name, type, desc, color, addProgram, handleClose, addProject, programId, addTask, priority, selectedProjectId, selectedSubProjectId, startDate, dueDate, planningTarget, commitTask, filterProgramId, programScope])

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

              {type === 'program' && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Program type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROGRAM_SCOPE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setProgramScope(option.id)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                        style={programScope === option.id
                          ? { background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.24)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Layers3 size={11} />
                      Program
                    </label>
                    <select
                      value={filterProgramId}
                      onChange={(e) => {
                        setFilterProgramId(e.target.value)
                        setSelectedProjectId('')
                        setSelectedSubProjectId('')
                      }}
                    className="w-full text-sm px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  >
                      <option value="">No program</option>
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
                      onChange={(e) => {
                        const nextProjectId = e.target.value
                        setSelectedProjectId(nextProjectId)
                        setSelectedSubProjectId('')
                        if (!nextProjectId) return
                        const project = projects.find((entry) => entry.id === nextProjectId)
                        if (project?.programId && project.programId !== filterProgramId) {
                          setFilterProgramId(project.programId)
                        }
                      }}
                      className="w-full text-sm px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                    >
                      <option value="">None</option>
                      {topLevelProjects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Folder size={11} />
                      Sub-project
                    </label>
                    <select
                      value={selectedSubProjectId}
                      onChange={(e) => setSelectedSubProjectId(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                      disabled={!selectedProjectId}
                    >
                      <option value="">None</option>
                      {subProjects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3 text-[11px] px-2.5 py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                    Program: <span style={{ color: 'var(--text-primary)' }}>{selectedProgram?.name ?? 'Unassigned'}</span>
                    {' · '}
                    Project: <span style={{ color: 'var(--text-primary)' }}>{selectedProject?.name ?? (selectedProgram ? 'Direct program task' : 'None') }</span>
                    {' · '}
                    Sub-project: <span style={{ color: 'var(--text-primary)' }}>{selectedSubProject?.name ?? 'None'}</span>
                  </div>
                </div>
              )}

              {type === 'task' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Calendar size={11} />
                      Start date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', colorScheme: 'dark' }}
                    />
                  </div>
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
                </div>
              )}

              {type === 'task' && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Add into plan
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PLAN_TARGETS.map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => setPlanningTarget(target.id)}
                        className="px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                        style={planningTarget === target.id
                          ? { background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.24)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }
                        }
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
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
