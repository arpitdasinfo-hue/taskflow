import { memo, useEffect, useMemo, useState } from 'react'
import { Plus, Check, Trash2, Flag, Calendar, MoreHorizontal, Pencil, ArrowUpRight } from 'lucide-react'
import { format } from 'date-fns'
import useProjectStore from '../../store/useProjectStore'
import MilestoneTimeline from '../common/MilestoneTimeline'

const DEFAULT_MILESTONE_COLOR = '#38bdf8'

const sortMilestones = (milestones = []) => (
  [...milestones].sort((left, right) => {
    const leftTs = left?.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    const rightTs = right?.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER
    return leftTs - rightTs
  })
)

const buildProjectPathLabel = (project, projectById) => {
  if (!project) return 'Project'

  const parts = [project.name]
  let parentId = project.parentId ?? null

  while (parentId) {
    const parent = projectById.get(parentId)
    if (!parent) break
    parts.unshift(parent.name)
    parentId = parent.parentId ?? null
  }

  return parts.join(' / ')
}

const MilestoneRow = memo(function MilestoneRow({ milestone, projectColor, projectName = '' }) {
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
        {(milestone.taskId || projectName) && (
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {projectName && (
              <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: projectColor }}>
                {projectName}
              </span>
            )}
            {milestone.taskId && (
              <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                Linked task
              </span>
            )}
          </div>
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

const MilestonePanel = memo(function MilestonePanel({
  projectId = null,
  projectIds = [],
  projectColor = DEFAULT_MILESTONE_COLOR,
  projectOptions = [],
  title = 'Milestones',
  description = null,
  emptyLabel = 'No milestones yet',
  showProjectName = false,
  onOpenTimeline = null,
}) {
  const milestones = useProjectStore((s) => s.milestones)
  const addMilestone = useProjectStore((s) => s.addMilestone)
  const projects = useProjectStore((s) => s.projects)

  const projectById = useMemo(
    () => new Map((projects ?? []).map((project) => [project.id, project])),
    [projects]
  )
  const fallbackProjectOptions = useMemo(() => {
    if (projectOptions.length > 0) return projectOptions
    if (projectId) {
      const project = projectById.get(projectId)
      return project ? [project] : []
    }
    if (projectIds.length > 0) {
      const allowed = new Set(projectIds)
      return (projects ?? []).filter((project) => allowed.has(project.id))
    }
    return []
  }, [projectOptions, projectId, projectIds, projectById, projects])
  const scopedProjectIds = useMemo(() => {
    if (projectId) return [projectId]
    if (projectIds.length > 0) return projectIds
    return fallbackProjectOptions.map((project) => project.id)
  }, [projectId, projectIds, fallbackProjectOptions])
  const scopedProjectIdSet = useMemo(() => new Set(scopedProjectIds), [scopedProjectIds])
  const visibleMilestones = useMemo(
    () => sortMilestones((milestones ?? []).filter((milestone) => milestone.projectId && scopedProjectIdSet.has(milestone.projectId))),
    [milestones, scopedProjectIdSet]
  )
  const timelineItems = useMemo(
    () => visibleMilestones.map((milestone) => {
      const linkedProject = milestone.projectId ? projectById.get(milestone.projectId) : null
      return {
        id: milestone.id,
        name: milestone.name,
        dueDate: milestone.dueDate,
        completed: milestone.status === 'completed',
        color: linkedProject?.color ?? projectColor,
        context: linkedProject ? buildProjectPathLabel(linkedProject, projectById) : 'Milestone',
      }
    }),
    [visibleMilestones, projectById, projectColor]
  )

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [desc, setDesc] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    projectId ?? fallbackProjectOptions[0]?.id ?? ''
  )

  useEffect(() => {
    const preferredProjectId = projectId ?? fallbackProjectOptions[0]?.id ?? ''
    setSelectedProjectId((current) => {
      if (current && scopedProjectIdSet.has(current)) return current
      return preferredProjectId
    })
  }, [projectId, fallbackProjectOptions, scopedProjectIdSet])

  const completedCount = visibleMilestones.filter((milestone) => milestone.status === 'completed').length
  const upcomingCount = visibleMilestones.length - completedCount
  const canAssignProject = fallbackProjectOptions.length > 1 || !projectId
  const resolvedTargetProjectId = projectId ?? selectedProjectId
  const canCreateMilestone = Boolean(projectId || fallbackProjectOptions.length > 0)

  const submit = () => {
    if (!name.trim() || !resolvedTargetProjectId) return
    addMilestone({
      projectId: resolvedTargetProjectId,
      name: name.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      description: desc.trim(),
    })
    setName(''); setDueDate(''); setDesc(''); setAdding(false)
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Flag size={11} style={{ color: projectColor }} />
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              {title}
              {visibleMilestones.length > 0 && ` (${completedCount}/${visibleMilestones.length})`}
            </span>
          </div>
          {description && (
            <p className="text-[10px] mt-1 leading-5" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}
          {visibleMilestones.length > 0 && !description && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              {upcomingCount} upcoming, {completedCount} completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onOpenTimeline && visibleMilestones.length > 0 && (
            <button
              type="button"
              onClick={onOpenTimeline}
              className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowUpRight size={10} />
              Timeline
            </button>
          )}
          <button
            onClick={() => setAdding((v) => !v)}
            disabled={!canCreateMilestone}
            className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg transition-colors hover:bg-white/5"
            style={canCreateMilestone ? { color: 'var(--accent)' } : { color: 'var(--text-secondary)', opacity: 0.6, cursor: 'not-allowed' }}
          >
            <Plus size={10} /> Add
          </button>
        </div>
      </div>

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
          {!canCreateMilestone && (
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              Add a project first. Milestones are stored against a project or sub-project in the database.
            </p>
          )}
          {canAssignProject && fallbackProjectOptions.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
            >
              {fallbackProjectOptions.map((projectOption) => (
                <option key={projectOption.id} value={projectOption.id}>
                  {buildProjectPathLabel(projectOption, projectById)}
                </option>
              ))}
            </select>
          )}
          <input
            type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', colorScheme: 'dark' }}
          />
          <div className="flex gap-2">
            <button onClick={submit} disabled={!canCreateMilestone || !resolvedTargetProjectId} className="flex-1 btn-accent py-1 text-xs disabled:opacity-60 disabled:cursor-not-allowed">Add Milestone</button>
            <button onClick={() => setAdding(false)} className="btn-ghost py-1 text-xs px-2">Cancel</button>
          </div>
        </div>
      )}

      {visibleMilestones.length > 0 && (
        <div className="mb-2">
          <MilestoneTimeline milestones={timelineItems} compact emptyLabel={emptyLabel} />
        </div>
      )}

      {visibleMilestones.length === 0 && !adding ? (
        <p className="text-[10px] text-center py-2" style={{ color: 'var(--text-secondary)' }}>
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-1">
          {visibleMilestones.map((m) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              projectColor={projectById.get(m.projectId)?.color ?? projectColor}
              projectName={showProjectName ? buildProjectPathLabel(projectById.get(m.projectId), projectById) : ''}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export default MilestonePanel
