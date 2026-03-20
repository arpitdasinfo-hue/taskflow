import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X, Trash2, Calendar, Tag, ChevronDown, Folder, AlertTriangle, Flag } from 'lucide-react'
import { format } from 'date-fns'
import useSettingsStore from '../../store/useSettingsStore'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore, { findMilestoneForTask } from '../../store/useProjectStore'
import { PriorityBadge, StatusBadge, TagBadge } from '../common/Badge'
import SubtaskList from './SubtaskList'
import NoteList from './NoteList'
import DependencyList from './DependencyList'
import RecurrenceSelector from './RecurrenceSelector'
import ActivityLog from './ActivityLog'
import CommitTaskMenu from '../planning/CommitTaskMenu'
import { useIsBlockedByDependency } from '../../hooks/useBlockedTasks'
import useToastStore from '../../store/useToastStore'
import useTemplateStore from '../../store/useTemplateStore'
import { createDrawerVariants, createFadeUpVariants, createOverlayVariants, MOTION_SPRINGS } from '../../lib/motion'

void motion

const STATUSES   = ['todo', 'in-progress', 'review', 'done', 'blocked']
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const STATUS_LABELS = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'In Review', 'done': 'Done', 'blocked': 'Blocked' }

const SelectField = memo(function SelectField({ value, options, onChange, renderOption }) {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const menuVariants = useMemo(() => createFadeUpVariants(reduceMotion, 10), [reduceMotion])

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
      <AnimatePresence initial={false}>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
              variants={menuVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)', boxShadow: '0 16px 48px rgba(15,23,42,0.18)' }}
            >
              {options.map((opt) => (
                <motion.button
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false) }}
                  whileHover={reduceMotion ? undefined : { x: 2 }}
                  transition={MOTION_SPRINGS.soft}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-100 transition-colors"
                  style={opt === value ? { background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' } : { color: '#0f172a' }}
                >
                  {renderOption ? renderOption(opt, false) : opt}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
})

const TaskDetail = memo(function TaskDetail() {
  const reduceMotion = useReducedMotion()
  const selectedTaskId = useSettingsStore((s) => s.selectedTaskId)
  const closeTask      = useSettingsStore((s) => s.closeTask)
  const tasks          = useTaskStore((s) => s.tasks)
  const updateTask     = useTaskStore((s) => s.updateTask)
  const deleteTask     = useTaskStore((s) => s.deleteTask)
  const projects       = useProjectStore((s) => s.projects)
  const programs       = useProjectStore((s) => s.programs)
  const milestones     = useProjectStore((s) => s.milestones ?? [])
  const markTaskAsMilestone = useProjectStore((s) => s.markTaskAsMilestone)

  const task = tasks.find((t) => t.id === selectedTaskId)
  const isBlockedByDep = useIsBlockedByDependency(selectedTaskId)
  const [tab, setTab]         = useState('subtasks')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue]     = useState('')
  const [editingDesc, setEditingDesc]   = useState(false)
  const [descValue, setDescValue]       = useState('')
  const [tagInput, setTagInput]         = useState('')
  const [milestonePromoted, setMilestonePromoted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const confirmTimerRef = useRef(null)
  const addTemplate = useTemplateStore((s) => s.addTemplate)
  const overlayVariants = useMemo(() => createOverlayVariants(reduceMotion), [reduceMotion])
  const desktopDrawerVariants = useMemo(() => createDrawerVariants(reduceMotion, 'right'), [reduceMotion])
  const mobileDrawerVariants = useMemo(() => createDrawerVariants(reduceMotion, 'bottom'), [reduceMotion])

  useEffect(() => {
    if (task) {
      setTitleValue(task.title)
      setDescValue(task.description || '')
      setMilestonePromoted(false)
    }
  }, [task])

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeTask() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeTask])

  const saveTitle = useCallback(() => {
    if (!titleValue.trim()) {
      useToastStore.getState().addToast({ message: 'Title cannot be empty', type: 'error' })
      setEditingTitle(false)
      return
    }
    if (task?.id) updateTask(task.id, { title: titleValue.trim() })
    setEditingTitle(false)
  }, [titleValue, task, updateTask])

  const saveDesc = useCallback(() => {
    if (task?.id) updateTask(task.id, { description: descValue })
    setEditingDesc(false)
  }, [descValue, task, updateTask])

  const handleAddTag = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim() && task?.id) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase().replace(/,/g, '')
      if (tag && !task.tags.includes(tag)) updateTask(task.id, { tags: [...task.tags, tag] })
      setTagInput('')
    }
  }, [tagInput, task, updateTask])

  const removeTag = useCallback((tag) => {
    if (task?.id) updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) })
  }, [task, updateTask])

  const handleDelete = useCallback(() => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      confirmTimerRef.current = setTimeout(() => setConfirmingDelete(false), 3000)
      return
    }
    clearTimeout(confirmTimerRef.current)
    if (task?.id) {
      deleteTask(task.id)
      useToastStore.getState().addToast({ message: 'Task deleted', type: 'info' })
    }
    closeTask()
  }, [confirmingDelete, task, deleteTask, closeTask])

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const selectedProgramId = task?.projectId
    ? (projectById.get(task.projectId)?.programId ?? task.programId ?? null)
    : task?.programId ?? null
  const visibleProjects = projects.filter((project) => !selectedProgramId || project.programId === selectedProgramId)
  const matchingMilestone = findMilestoneForTask(milestones, task)

  if (!task) return null

  const panel = (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'rgba(10,0,21,0.92)', borderLeft: '1px solid var(--glass-border)' }}
    >
      {/* Blocked by dependency warning */}
      {isBlockedByDep && (
        <div className="flex items-center gap-2 px-5 py-2.5 text-xs flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
          <AlertTriangle size={13} />
          Blocked by incomplete dependencies
        </div>
      )}

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
          {confirmingDelete ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span style={{ color: '#fca5a5' }}>Delete?</span>
              <button
                onClick={handleDelete}
                className="px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
              >Yes</button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="px-2 py-0.5 rounded-lg text-[11px] transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-secondary)' }}
              >No</button>
            </div>
          ) : (
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl hover:bg-red-500/10 transition-colors"
            style={{ color: '#ef4444' }}
            aria-label="Delete task"
            title="Delete task"
          >
            <Trash2 size={15} />
          </button>
          )}
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

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
            Planning
          </label>
          <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Commit this task into Today, Week, or Month
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Planning adds the existing task into your execution workspace. It does not duplicate the task.
              </div>
            </div>
            <CommitTaskMenu taskId={task.id} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Flag size={10} />
            Milestone
          </label>
          <div
            className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {matchingMilestone ? 'This task is also a milestone' : 'Mark this task as a milestone'}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {!task.projectId
                  ? 'Assign this task to a project first. Milestones live inside projects.'
                  : matchingMilestone
                    ? 'This task stays executable and is also tracked as a milestone checkpoint.'
                    : milestonePromoted
                      ? 'Linked milestone created. The task stays in place for execution.'
                      : 'Adds a linked milestone while keeping this item as a task. You can still add standalone milestones in the project milestone section.'}
              </div>
            </div>
            <button
              type="button"
              disabled={!task.projectId || !!matchingMilestone}
              onClick={() => {
                if (!task.projectId || matchingMilestone) return
                markTaskAsMilestone(task)
                setMilestonePromoted(true)
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.22)' }}
            >
              {matchingMilestone ? 'Linked' : 'Mark milestone'}
            </button>
          </div>
        </div>

        {/* Program */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Folder size={10} />
            Program
          </label>
          <SelectField
            value={selectedProgramId}
            options={[null, ...programs.map((program) => program.id)]}
            onChange={(value) => {
              const currentProject = task.projectId ? projectById.get(task.projectId) : null
              updateTask(task.id, {
                programId: value ?? null,
                projectId: currentProject?.programId === (value ?? null) ? task.projectId ?? null : null,
              })
            }}
            renderOption={(value) => {
              const program = programs.find((entry) => entry.id === value)
              return program
                ? <span className="flex items-center gap-1.5 text-xs"><span className="w-2 h-2 rounded-full" style={{ background: program.color }} />{program.name}</span>
                : <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>No program</span>
            }}
          />
        </div>

        {/* Project */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Folder size={10} />
            Project
          </label>
          <SelectField
            value={task.projectId}
            options={[null, ...visibleProjects.map((project) => project.id)]}
            onChange={(value) => updateTask(task.id, { projectId: value ?? null, programId: selectedProgramId ?? null })}
            renderOption={(value) => {
              const proj = value ? projectById.get(value) : null
              const parent = proj?.parentId ? projectById.get(proj.parentId) : null
              return proj
                ? <span className="flex items-center gap-1.5 text-xs"><span className="w-2 h-2 rounded-full" style={{ background: proj.color }} />{parent ? `${parent.name} / ${proj.name}` : proj.name}</span>
                : <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>No project</span>
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Calendar size={10} />
              Start Date
            </label>
            <input
              type="date"
              value={task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : ''}
              onChange={(e) => updateTask(task.id, { startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="w-full text-sm px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', colorScheme: 'dark' }}
            />
          </div>
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
        </div>

        {/* Recurrence */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <RecurrenceSelector
            value={task.recurrence ?? null}
            onChange={(rec) => updateTask(task.id, { recurrence: rec })}
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
            {['subtasks', 'notes', 'deps', 'history'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={tab === t
                  ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(var(--accent-rgb),0.3)' }
                  : { color: 'var(--text-secondary)' }
                }
              >
                {t === 'subtasks' ? `Subtasks (${task.subtasks.length})`
                  : t === 'notes' ? `Notes (${task.notes.length})`
                  : t === 'deps' ? `Deps (${(task.dependsOn ?? []).length})`
                  : 'History'}
              </button>
            ))}
          </div>

          {tab === 'subtasks' && (
            <SubtaskList taskId={task.id} subtasks={task.subtasks} />
          )}
          {tab === 'notes' && (
            <NoteList taskId={task.id} notes={task.notes} />
          )}
          {tab === 'deps' && (
            <DependencyList taskId={task.id} />
          )}
          {tab === 'history' && (
            <ActivityLog taskId={task.id} />
          )}
        </div>

        {/* Save as template */}
        <div className="pt-2 pb-1">
          {savingTemplate ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templateName.trim()) {
                    addTemplate({ name: templateName.trim(), title: task.title, description: task.description, priority: task.priority, tags: task.tags, projectId: task.projectId, subtasks: task.subtasks })
                    useToastStore.getState().addToast({ message: 'Template saved', type: 'success' })
                    setSavingTemplate(false)
                    setTemplateName('')
                  }
                  if (e.key === 'Escape') { setSavingTemplate(false); setTemplateName('') }
                }}
                placeholder="Template name…"
                className="flex-1 text-xs px-2.5 py-1.5 rounded-xl outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(var(--accent-rgb),0.3)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={() => {
                  if (!templateName.trim()) return
                  addTemplate({ name: templateName.trim(), title: task.title, description: task.description, priority: task.priority, tags: task.tags, projectId: task.projectId, subtasks: task.subtasks })
                  useToastStore.getState().addToast({ message: 'Template saved', type: 'success' })
                  setSavingTemplate(false)
                  setTemplateName('')
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(var(--accent-rgb),0.18)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.3)' }}
              >Save</button>
              <button onClick={() => { setSavingTemplate(false); setTemplateName('') }} className="p-1.5 rounded-xl hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setSavingTemplate(true); setTemplateName('') }}
              className="w-full text-xs py-2 rounded-xl hover:bg-white/5 transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              Save as template…
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // Desktop: slide-over panel | Mobile: bottom sheet
  return (
    <>
      <motion.div
        className="overlay-bg"
        variants={overlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={closeTask}
      />

      {/* Desktop panel */}
      <motion.div
        className="hidden md:flex fixed top-0 right-0 bottom-0 w-[400px] z-50 flex-col animate-slide-right"
        variants={desktopDrawerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={MOTION_SPRINGS.gentle}
      >
        {panel}
      </motion.div>

      {/* Mobile bottom sheet */}
      <motion.div
        className="md:hidden fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl overflow-hidden anim-slide-up"
        variants={mobileDrawerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={MOTION_SPRINGS.gentle}
        style={{ maxHeight: '90dvh', height: '90dvh' }}
      >
        {panel}
      </motion.div>
    </>
  )
})

export default TaskDetail
