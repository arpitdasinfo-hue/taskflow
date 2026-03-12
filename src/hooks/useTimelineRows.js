import { useMemo } from 'react'
import { STATUS_COLOR } from '../components/timeline/timelineConfig'
import { toDisplayDate } from '../components/timeline/timelineUtils'

const STATUS_LABEL = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
}

const hasSchedule = (item) => !!(item?.startDate || item?.dueDate)

const getTaskSortValue = (task) => {
  const date = toDisplayDate(task.startDate) || toDisplayDate(task.dueDate)
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER
}

const getStatusFromTasks = (tasks = []) => {
  if (tasks.length === 0) return 'todo'
  if (tasks.every((task) => task.status === 'done')) return 'done'
  if (tasks.some((task) => task.status === 'blocked')) return 'blocked'
  if (tasks.some((task) => task.status === 'in-progress')) return 'in-progress'
  if (tasks.some((task) => task.status === 'review')) return 'review'
  return 'todo'
}

const buildRangeBar = ({ id, title, color, startDate, dueDate, status = 'todo', progress = 0 }) => {
  if (!startDate && !dueDate) return null
  return {
    id,
    title,
    color,
    startDate,
    dueDate,
    status,
    progress,
  }
}

const getRangeFromTasks = (tasks = []) => {
  const points = []
  tasks.forEach((task) => {
    const start = toDisplayDate(task.startDate)
    const end = toDisplayDate(task.dueDate)
    if (start) points.push(start)
    if (end) points.push(end)
  })

  if (points.length === 0) return { startDate: null, dueDate: null }

  points.sort((a, b) => a.getTime() - b.getTime())
  return {
    startDate: points[0].toISOString(),
    dueDate: points[points.length - 1].toISOString(),
  }
}

const getTaskSubtitle = (task) => {
  const priority = task.priority ? task.priority[0].toUpperCase() + task.priority.slice(1) : 'Medium'
  return `${priority} priority · ${STATUS_LABEL[task.status] ?? task.status}`
}

const useTimelineRows = ({
  programs,
  projects,
  tasks,
  milestones,
  filteredProgramIds,
  filteredProjectIds,
  expandedProjectIds,
  onlyDelayed,
  onlyCritical,
}) => useMemo(() => {
  const today = toDisplayDate(new Date())
  const hasProgramFilter = filteredProgramIds.size > 0
  const hasProjectFilter = filteredProjectIds.size > 0
  const hasQuickFilter = onlyDelayed || onlyCritical

  const childProjectsByParent = new Map()
  projects.forEach((project) => {
    if (!project.parentId) return
    const bucket = childProjectsByParent.get(project.parentId) ?? []
    bucket.push(project)
    childProjectsByParent.set(project.parentId, bucket)
  })

  const allTasksByProject = new Map()
  const scheduledTasksByProject = new Map()
  tasks.forEach((task) => {
    if (!task.projectId) return

    const all = allTasksByProject.get(task.projectId) ?? []
    all.push(task)
    allTasksByProject.set(task.projectId, all)

    if (hasSchedule(task)) {
      const scheduled = scheduledTasksByProject.get(task.projectId) ?? []
      scheduled.push(task)
      scheduledTasksByProject.set(task.projectId, scheduled)
    }
  })

  const milestonesByProject = new Map()
  milestones.forEach((milestone) => {
    if (!milestone.projectId || !milestone.dueDate) return
    const bucket = milestonesByProject.get(milestone.projectId) ?? []
    bucket.push(milestone)
    milestonesByProject.set(milestone.projectId, bucket)
  })

  const selectedDescendantCache = new Map()
  const hasSelectedDescendant = (projectId) => {
    if (selectedDescendantCache.has(projectId)) return selectedDescendantCache.get(projectId)

    const children = childProjectsByParent.get(projectId) ?? []
    const found = children.some((child) =>
      filteredProjectIds.has(child.id) || hasSelectedDescendant(child.id)
    )

    selectedDescendantCache.set(projectId, found)
    return found
  }

  const isTaskDelayed = (task) => {
    const due = toDisplayDate(task.dueDate)
    return !!(due && due < today && task.status !== 'done')
  }

  const isTaskCritical = (task) => task.priority === 'critical' || task.status === 'blocked'

  const taskMatchesQuickFilters = (task) => {
    if (onlyDelayed && !isTaskDelayed(task)) return false
    if (onlyCritical && !isTaskCritical(task)) return false
    return true
  }

  let scheduledCount = 0
  let delayedCount = 0
  let criticalCount = 0

  const buildProjectRows = (project, depth, options = {}) => {
    const ancestorSelected = options.ancestorSelected ?? false
    const programAllowed = !hasProgramFilter || filteredProgramIds.has(project.programId)
    if (!programAllowed) return []

    const selectedSelf = filteredProjectIds.has(project.id)
    const selectedByHierarchy = selectedSelf || ancestorSelected || hasSelectedDescendant(project.id)
    if (hasProjectFilter && !selectedByHierarchy) return []

    const childRows = (childProjectsByParent.get(project.id) ?? []).flatMap((child) =>
      buildProjectRows(child, depth + 1, { ancestorSelected: ancestorSelected || selectedSelf })
    )

    const allTasks = allTasksByProject.get(project.id) ?? []
    const scheduledTasks = (scheduledTasksByProject.get(project.id) ?? [])
      .filter(taskMatchesQuickFilters)
      .sort((a, b) => getTaskSortValue(a) - getTaskSortValue(b))

    const hasOwnSchedule = !!(project.startDate || project.dueDate)
    if (scheduledTasks.length === 0 && childRows.length === 0 && !hasOwnSchedule) {
      return []
    }

    if (hasQuickFilter && scheduledTasks.length === 0 && childRows.length === 0) {
      return []
    }

    const doneCount = allTasks.filter((task) => task.status === 'done').length
    const delayedTasks = scheduledTasks.filter(isTaskDelayed)
    const criticalTasks = scheduledTasks.filter(isTaskCritical)

    const range = getRangeFromTasks(scheduledTasks)
    const summaryBar = buildRangeBar({
      id: `summary-${project.id}`,
      title: project.name,
      color: project.color,
      startDate: project.startDate ?? range.startDate,
      dueDate: project.dueDate ?? range.dueDate,
      status: getStatusFromTasks(scheduledTasks),
      progress: allTasks.length ? doneCount / allTasks.length : 0,
    })

    const projectRow = {
      id: `project-${project.id}`,
      type: 'project',
      projectId: project.id,
      depth,
      label: project.name,
      subtitle: `${doneCount}/${allTasks.length} done`,
      color: project.color,
      bars: summaryBar ? [summaryBar] : [],
      milestones: milestonesByProject.get(project.id) ?? [],
      expandable: scheduledTasks.length > 0,
      expanded: expandedProjectIds.has(project.id),
      delayedCount: delayedTasks.length,
      criticalCount: criticalTasks.length,
      totalCount: allTasks.length,
    }

    scheduledCount += scheduledTasks.length
    delayedCount += delayedTasks.length
    criticalCount += criticalTasks.length

    const taskRows = expandedProjectIds.has(project.id)
      ? scheduledTasks.map((task) => ({
          id: `task-${task.id}`,
          type: 'task',
          taskId: task.id,
          depth: depth + 1,
          label: task.title,
          subtitle: getTaskSubtitle(task),
          color: STATUS_COLOR[task.status] ?? project.color,
          bars: [task],
          milestones: [],
          delayedCount: isTaskDelayed(task) ? 1 : 0,
          criticalCount: isTaskCritical(task) ? 1 : 0,
        }))
      : []

    return [projectRow, ...taskRows, ...childRows]
  }

  const rows = []

  programs.forEach((program) => {
    if (hasProgramFilter && !filteredProgramIds.has(program.id)) return

    const topProjects = projects.filter((project) => project.programId === program.id && !project.parentId)
    const programRows = topProjects.flatMap((project) =>
      buildProjectRows(project, 1, { ancestorSelected: false })
    )

    const projectRows = programRows.filter((row) => row.type === 'project')
    if (projectRows.length === 0) return

    const projectIds = new Set(projectRows.map((row) => row.projectId))
    const programTasks = tasks.filter((task) =>
      projectIds.has(task.projectId) && hasSchedule(task) && taskMatchesQuickFilters(task)
    )
    const programRange = getRangeFromTasks(programTasks)

    rows.push({
      id: `program-${program.id}`,
      type: 'program',
      depth: 0,
      label: program.name,
      subtitle: `${projectRows.length} projects · ${programTasks.length} scheduled`,
      color: program.color,
      bars: [
        buildRangeBar({
          id: `program-summary-${program.id}`,
          title: program.name,
          color: program.color,
          startDate: program.startDate ?? programRange.startDate,
          dueDate: program.endDate ?? programRange.dueDate,
          status: getStatusFromTasks(programTasks),
          progress: programTasks.length
            ? programTasks.filter((task) => task.status === 'done').length / programTasks.length
            : 0,
        }),
      ].filter(Boolean),
      milestones: [],
    })

    rows.push(...programRows)
  })

  if (!hasProgramFilter) {
    const unassignedTopLevel = projects.filter((project) => !project.programId && !project.parentId)
    const unassignedRows = unassignedTopLevel.flatMap((project) =>
      buildProjectRows(project, 1, { ancestorSelected: false })
    )

    const unassignedProjectRows = unassignedRows.filter((row) => row.type === 'project')
    if (unassignedProjectRows.length > 0) {
      const unassignedIds = new Set(unassignedProjectRows.map((row) => row.projectId))
      const unassignedTasks = tasks.filter((task) =>
        unassignedIds.has(task.projectId) && hasSchedule(task) && taskMatchesQuickFilters(task)
      )
      const unassignedRange = getRangeFromTasks(unassignedTasks)

      rows.push({
        id: 'program-unassigned',
        type: 'program',
        depth: 0,
        label: 'Unassigned',
        subtitle: `${unassignedProjectRows.length} projects · ${unassignedTasks.length} scheduled`,
        color: '#94a3b8',
        bars: [
          buildRangeBar({
            id: 'program-summary-unassigned',
            title: 'Unassigned',
            color: '#94a3b8',
            startDate: unassignedRange.startDate,
            dueDate: unassignedRange.dueDate,
            status: getStatusFromTasks(unassignedTasks),
            progress: unassignedTasks.length
              ? unassignedTasks.filter((task) => task.status === 'done').length / unassignedTasks.length
              : 0,
          }),
        ].filter(Boolean),
        milestones: [],
      })

      rows.push(...unassignedRows)
    }
  }

  return {
    rows,
    stats: {
      scheduledCount,
      delayedCount,
      criticalCount,
    },
  }
}, [
  programs,
  projects,
  tasks,
  milestones,
  filteredProgramIds,
  filteredProjectIds,
  expandedProjectIds,
  onlyDelayed,
  onlyCritical,
])

export default useTimelineRows
