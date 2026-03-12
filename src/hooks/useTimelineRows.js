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
  const date = toDisplayDate(task.dueDate) || toDisplayDate(task.startDate)
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

const getTaskSubtitle = (task, unscheduled = false, dependencyRisk = false) => {
  const priority = task.priority ? task.priority[0].toUpperCase() + task.priority.slice(1) : 'Medium'
  const parts = [`${priority} priority`, STATUS_LABEL[task.status] ?? task.status]
  if (unscheduled) parts.push('No dates set')
  if (dependencyRisk) parts.push('Dependency risk')
  return parts.join(' · ')
}

const ZERO_STATS = {
  scheduledCount: 0,
  unscheduledCount: 0,
  delayedCount: 0,
  criticalCount: 0,
  dependencyRiskCount: 0,
}

const mergeStats = (left = ZERO_STATS, right = ZERO_STATS) => ({
  scheduledCount: left.scheduledCount + right.scheduledCount,
  unscheduledCount: left.unscheduledCount + right.unscheduledCount,
  delayedCount: left.delayedCount + right.delayedCount,
  criticalCount: left.criticalCount + right.criticalCount,
  dependencyRiskCount: left.dependencyRiskCount + right.dependencyRiskCount,
})

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
  onlyDependencyRisk,
}) => useMemo(() => {
  const today = toDisplayDate(new Date())
  const hasProgramFilter = filteredProgramIds.size > 0
  const hasProjectFilter = filteredProjectIds.size > 0
  const hasQuickFilter = onlyDelayed || onlyCritical || onlyDependencyRisk

  const childProjectsByParent = new Map()
  projects.forEach((project) => {
    if (!project.parentId) return
    const bucket = childProjectsByParent.get(project.parentId) ?? []
    bucket.push(project)
    childProjectsByParent.set(project.parentId, bucket)
  })

  const taskById = new Map(tasks.map((task) => [task.id, task]))

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

  const isTaskDependencyRisk = (task) => {
    const deps = task.dependsOn ?? []
    if (deps.length === 0) return false

    return deps.some((depId) => {
      const dependency = taskById.get(depId)
      return !dependency || dependency.status !== 'done'
    })
  }

  const taskMatchesQuickFilters = (task) => {
    if (onlyDelayed && !isTaskDelayed(task)) return false
    if (onlyCritical && !isTaskCritical(task)) return false
    if (onlyDependencyRisk && !isTaskDependencyRisk(task)) return false
    return true
  }

  const buildProjectRows = (project, depth, options = {}) => {
    const ancestorSelected = options.ancestorSelected ?? false
    const programAllowed = !hasProgramFilter || filteredProgramIds.has(project.programId)
    if (!programAllowed) return { rows: [], stats: ZERO_STATS }

    const selectedSelf = filteredProjectIds.has(project.id)
    const selectedByHierarchy = selectedSelf || ancestorSelected || hasSelectedDescendant(project.id)
    if (hasProjectFilter && !selectedByHierarchy) return { rows: [], stats: ZERO_STATS }

    const childResults = (childProjectsByParent.get(project.id) ?? []).map((child) =>
      buildProjectRows(child, depth + 1, { ancestorSelected: ancestorSelected || selectedSelf })
    )
    const childRows = childResults.flatMap((result) => result.rows)
    const childStats = childResults.reduce((acc, result) => mergeStats(acc, result.stats), ZERO_STATS)

    const allTasks = allTasksByProject.get(project.id) ?? []
    const scheduledTasks = (scheduledTasksByProject.get(project.id) ?? [])
      .filter(taskMatchesQuickFilters)
      .sort((a, b) => getTaskSortValue(a) - getTaskSortValue(b))

    const unscheduledTasks = allTasks
      .filter((task) => !hasSchedule(task))
      .filter(taskMatchesQuickFilters)

    const hasOwnSchedule = !!(project.startDate || project.dueDate)
    const hasAnyTask = scheduledTasks.length > 0 || unscheduledTasks.length > 0

    if (!hasAnyTask && childRows.length === 0 && !hasOwnSchedule) {
      return { rows: [], stats: ZERO_STATS }
    }

    if (hasQuickFilter && !hasAnyTask && childRows.length === 0) {
      return { rows: [], stats: ZERO_STATS }
    }

    const doneCount = allTasks.filter((task) => task.status === 'done').length
    const delayedTasks = scheduledTasks.filter(isTaskDelayed)
    const criticalTasks = [...scheduledTasks, ...unscheduledTasks].filter(isTaskCritical)
    const dependencyRiskTasks = [...scheduledTasks, ...unscheduledTasks].filter(isTaskDependencyRisk)

    const range = getRangeFromTasks(scheduledTasks)
    const summaryBar = buildRangeBar({
      id: `summary-${project.id}`,
      title: project.name,
      color: project.color,
      startDate: project.startDate ?? range.startDate,
      dueDate: project.dueDate ?? range.dueDate,
      status: getStatusFromTasks([...scheduledTasks, ...unscheduledTasks]),
      progress: allTasks.length ? doneCount / allTasks.length : 0,
    })

    const projectSubtitle = `${doneCount}/${allTasks.length} done${unscheduledTasks.length ? ` · ${unscheduledTasks.length} unscheduled` : ''}`

    const projectRow = {
      id: `project-${project.id}`,
      type: 'project',
      projectId: project.id,
      programId: project.programId ?? null,
      depth,
      label: project.name,
      subtitle: projectSubtitle,
      color: project.color,
      bars: summaryBar ? [summaryBar] : [],
      milestones: milestonesByProject.get(project.id) ?? [],
      expandable: hasAnyTask,
      expanded: expandedProjectIds.has(project.id),
      delayedCount: delayedTasks.length,
      criticalCount: criticalTasks.length,
      dependencyRiskCount: dependencyRiskTasks.length,
      totalCount: allTasks.length,
      unscheduledCount: unscheduledTasks.length,
    }

    const ownStats = {
      scheduledCount: scheduledTasks.length,
      unscheduledCount: unscheduledTasks.length,
      delayedCount: delayedTasks.length,
      criticalCount: criticalTasks.length,
      dependencyRiskCount: dependencyRiskTasks.length,
    }

    const taskRows = expandedProjectIds.has(project.id)
      ? [
          ...scheduledTasks.map((task) => ({
            id: `task-${task.id}`,
            type: 'task',
            taskId: task.id,
            projectId: project.id,
            programId: project.programId ?? null,
            depth: depth + 1,
            label: task.title,
            subtitle: getTaskSubtitle(task, false, isTaskDependencyRisk(task)),
            color: STATUS_COLOR[task.status] ?? project.color,
            bars: [task],
            milestones: [],
            delayedCount: isTaskDelayed(task) ? 1 : 0,
            criticalCount: isTaskCritical(task) ? 1 : 0,
            dependencyRiskCount: isTaskDependencyRisk(task) ? 1 : 0,
            unscheduled: false,
          })),
          ...unscheduledTasks.map((task) => ({
            id: `task-${task.id}`,
            type: 'task',
            taskId: task.id,
            projectId: project.id,
            programId: project.programId ?? null,
            depth: depth + 1,
            label: task.title,
            subtitle: getTaskSubtitle(task, true, isTaskDependencyRisk(task)),
            color: STATUS_COLOR[task.status] ?? project.color,
            bars: [],
            milestones: [],
            delayedCount: 0,
            criticalCount: isTaskCritical(task) ? 1 : 0,
            dependencyRiskCount: isTaskDependencyRisk(task) ? 1 : 0,
            unscheduled: true,
          })),
        ]
      : []

    return {
      rows: [projectRow, ...taskRows, ...childRows],
      stats: mergeStats(childStats, ownStats),
    }
  }

  const programSections = programs
    .filter((program) => !hasProgramFilter || filteredProgramIds.has(program.id))
    .map((program) => {
      const topProjects = projects.filter((project) => project.programId === program.id && !project.parentId)
      const programResults = topProjects.map((project) =>
        buildProjectRows(project, 1, { ancestorSelected: false })
      )
      const programRows = programResults.flatMap((result) => result.rows)
      const sectionStats = programResults.reduce((acc, result) => mergeStats(acc, result.stats), ZERO_STATS)

      const projectRows = programRows.filter((row) => row.type === 'project')
      if (projectRows.length === 0) return { rows: [], stats: sectionStats }

      const projectIds = new Set(projectRows.map((row) => row.projectId))
      const programTasks = tasks.filter((task) =>
        projectIds.has(task.projectId) && taskMatchesQuickFilters(task)
      )
      const programScheduledTasks = programTasks.filter(hasSchedule)
      const programUnscheduledCount = programTasks.length - programScheduledTasks.length
      const programRange = getRangeFromTasks(programScheduledTasks)

      const headerRow = {
        id: `program-${program.id}`,
        type: 'program',
        programId: program.id,
        depth: 0,
        label: program.name,
        subtitle: `${projectRows.length} projects · ${programScheduledTasks.length} scheduled${programUnscheduledCount ? ` · ${programUnscheduledCount} unscheduled` : ''}`,
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
      }

      return {
        rows: [headerRow, ...programRows],
        stats: sectionStats,
      }
    })

  const unassignedSection = !hasProgramFilter
    ? (() => {
        const unassignedTopLevel = projects.filter((project) => !project.programId && !project.parentId)
        const unassignedResults = unassignedTopLevel.map((project) =>
          buildProjectRows(project, 1, { ancestorSelected: false })
        )
        const unassignedRows = unassignedResults.flatMap((result) => result.rows)
        const sectionStats = unassignedResults.reduce((acc, result) => mergeStats(acc, result.stats), ZERO_STATS)

        const unassignedProjectRows = unassignedRows.filter((row) => row.type === 'project')
        if (unassignedProjectRows.length === 0) return null

        const unassignedIds = new Set(unassignedProjectRows.map((row) => row.projectId))
        const unassignedTasks = tasks.filter((task) =>
          unassignedIds.has(task.projectId) && taskMatchesQuickFilters(task)
        )
        const unassignedScheduledTasks = unassignedTasks.filter(hasSchedule)
        const unassignedUnscheduledCount = unassignedTasks.length - unassignedScheduledTasks.length
        const unassignedRange = getRangeFromTasks(unassignedScheduledTasks)

        const headerRow = {
          id: 'program-unassigned',
          type: 'program',
          programId: null,
          depth: 0,
          label: 'Unassigned',
          subtitle: `${unassignedProjectRows.length} projects · ${unassignedScheduledTasks.length} scheduled${unassignedUnscheduledCount ? ` · ${unassignedUnscheduledCount} unscheduled` : ''}`,
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
        }

        return {
          rows: [headerRow, ...unassignedRows],
          stats: sectionStats,
        }
      })()
    : null

  const sections = unassignedSection ? [...programSections, unassignedSection] : programSections
  const rows = sections.flatMap((section) => section.rows)
  const stats = sections.reduce((acc, section) => mergeStats(acc, section.stats), ZERO_STATS)

  return {
    rows,
    stats,
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
  onlyDependencyRisk,
])

export default useTimelineRows
