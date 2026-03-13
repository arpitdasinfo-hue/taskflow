import { useMemo } from 'react'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'
import useProjectStore from '../store/useProjectStore'
import { taskMatchesProgram } from '../lib/taskScope'

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

/**
 * Returns tasks filtered by active filters and sorted by sortBy.
 * Supports both project-level and program-level filtering (mutually exclusive).
 */
export function useFilteredTasks() {
  const tasks           = useTaskStore((s) => s.tasks)
  const filters         = useSettingsStore((s) => s.filters)
  const sortBy          = useSettingsStore((s) => s.sortBy)
  const activeProjectId = useSettingsStore((s) => s.activeProjectId)
  const activeProgramId = useSettingsStore((s) => s.activeProgramId)
  const projects        = useProjectStore((s) => s.projects)

  return useMemo(() => {
    let result = tasks.filter((task) => !task.deletedAt)

    // Program filter (takes all projects in that program)
    if (activeProgramId) {
      result = result.filter((task) => taskMatchesProgram(task, activeProgramId, projects))
    } else if (activeProjectId) {
      result = result.filter((t) => t.projectId === activeProjectId)
    }

    if (filters.status.length)
      result = result.filter((t) => filters.status.includes(t.status))
    if (filters.priority.length)
      result = result.filter((t) => filters.priority.includes(t.priority))
    if (filters.tags.length)
      result = result.filter((t) => t.tags.some((tag) => filters.tags.includes(tag)))

    result.sort((a, b) => {
      if (sortBy === 'priority')
        return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate) - new Date(b.dueDate)
      }
      if (sortBy === 'updatedAt')
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    return result
  }, [tasks, filters, sortBy, activeProjectId, activeProgramId, projects])
}

/** Returns tasks grouped by status for Board view */
export function useTasksByStatus() {
  const filtered = useFilteredTasks()
  return useMemo(() => {
    const groups = {
      'todo': [],
      'in-progress': [],
      'review': [],
      'done': [],
      'blocked': [],
    }
    for (const task of filtered) {
      if (groups[task.status]) groups[task.status].push(task)
    }
    return groups
  }, [filtered])
}

/** Returns tasks due today + overdue */
export function useTodayTasks() {
  const tasks = useTaskStore((s) => s.tasks)
  return useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999)
    const activeTasks = tasks.filter((task) => !task.deletedAt)
    const overdue = activeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < todayStart && t.status !== 'done'
    )
    const today = activeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) <= todayEnd
    )
    return { today, overdue }
  }, [tasks])
}

/** Dashboard stats */
export function useTaskStats() {
  const tasks = useTaskStore((s) => s.tasks)
  return useMemo(() => {
    const activeTasks  = tasks.filter((task) => !task.deletedAt)
    const total        = activeTasks.length
    const inProgress   = activeTasks.filter((t) => t.status === 'in-progress').length
    const done         = activeTasks.filter((t) => t.status === 'done').length
    const blocked      = activeTasks.filter((t) => t.status === 'blocked').length
    const now          = new Date()
    const overdue      = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
    const critical     = activeTasks.filter((t) => t.priority === 'critical' && t.status !== 'done').length
    const completion   = total ? Math.round((done / total) * 100) : 0
    return { total, inProgress, done, blocked, overdue, critical, completion }
  }, [tasks])
}
