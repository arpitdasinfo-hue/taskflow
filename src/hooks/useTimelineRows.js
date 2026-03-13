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

const normalizeSearchText = (value) => String(value || '').trim().toLowerCase()

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
  const parts = [priority, STATUS_LABEL[task.status] ?? task.status]
  if (unscheduled) parts.push('Unscheduled')
  if (dependencyRisk) parts.push('Needs dependency')
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
  filteredSubProjectIds,
  expandedProjectIds,
  onlyDelayed,
  onlyCritical,
  onlyDependencyRisk,
  searchQuery = '',
}) => useMemo(() => {
  const today = toDisplayDate(new Date())
  const normalizedSearch = normalizeSearchText(searchQuery)
  const hasProgramFilter = filteredProgramIds.size > 0
  const hasProjectFilter = filteredProjectIds.size > 0
  const hasSubProjectFilter = filteredSubProjectIds.size > 0
  const hasHierarchyFilter = hasProjectFilter || hasSubProjectFilter
  const hasQuickFilter = onlyDelayed || onlyCritical || onlyDependencyRisk
  const hasSearch = normalizedSearch.length > 0

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
  const directTasksByProgram = new Map()
  const scheduledDirectTasksByProgram = new Map()
  tasks.forEach((task) => {
    if (!task.projectId) {
      if (!task.programId) return

      const direct = directTasksByProgram.get(task.programId) ?? []
      direct.push(task)
      directTasksByProgram.set(task.programId, direct)

      if (hasSchedule(task)) {
        const scheduled = scheduledDirectTasksByProgram.get(task.programId) ?? []
        scheduled.push(task)
        scheduledDirectTasksByProgram.set(task.programId, scheduled)
      }
      return
    }

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

  const selectedProjectDescendantCache = new Map()
  const hasSelectedProjectDescendant = (projectId) => {
    if (selectedProjectDescendantCache.has(projectId)) return selectedProjectDescendantCache.get(projectId)

    const children = childProjectsByParent.get(projectId) ?? []
    const found = children.some((child) =>
      filteredProjectIds.has(child.id) || hasSelectedProjectDescendant(child.id)
    )

    selectedProjectDescendantCache.set(projectId, found)
    return found
  }

  const selectedSubProjectDescendantCache = new Map()
  const hasSelectedSubProjectDescendant = (projectId) => {
    if (selectedSubProjectDescendantCache.has(projectId)) return selectedSubProjectDescendantCache.get(projectId)

    const children = childProjectsByParent.get(projectId) ?? []
    const found = children.some((child) =>
      filteredSubProjectIds.has(child.id) || hasSelectedSubProjectDescendant(child.id)
    )

    selectedSubProjectDescendantCache.set(projectId, found)
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
    const enabledChecks = []
    if (onlyDelayed) enabledChecks.push(isTaskDelayed(task))
    if (onlyCritical) enabledChecks.push(isTaskCritical(task))
    if (onlyDependencyRisk) enabledChecks.push(isTaskDependencyRisk(task))
    if (enabledChecks.length === 0) return true
    return enabledChecks.some(Boolean)
  }

  const matchesSearch = (...values) => {
    if (!hasSearch) return true
    return values.some((value) => normalizeSearchText(value).includes(normalizedSearch))
  }

  const buildProjectRows = (project, depth, options = {}) => {
    const ancestorSelected = options.ancestorSelected ?? false
    const programAllowed = !hasProgramFilter || filteredProgramIds.has(project.programId)
    if (!programAllowed) return { rows: [], stats: ZERO_STATS }

    const selectedSelfProject = filteredProjectIds.has(project.id)
    const selectedSelfSubProject = filteredSubProjectIds.has(project.id)
    const selectedByHierarchy =
      selectedSelfProject ||
      selectedSelfSubProject ||
      ancestorSelected ||
      hasSelectedProjectDescendant(project.id) ||
      hasSelectedSubProjectDescendant(project.id)

    if (hasHierarchyFilter && !selectedByHierarchy) return { rows: [], stats: ZERO_STATS }

    const childResults = (childProjectsByParent.get(project.id) ?? []).map((child) =>
      buildProjectRows(child, depth + 1, {
        ancestorSelected: ancestorSelected || selectedSelfProject || selectedSelfSubProject,
      })
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

    const matchedScheduledTasks = scheduledTasks.filter((task) =>
      matchesSearch(task.title, task.description, task.priority, task.status)
    )
    const matchedUnscheduledTasks = unscheduledTasks.filter((task) =>
      matchesSearch(task.title, task.description, task.priority, task.status)
    )

    const hasOwnSchedule = !!(project.startDate || project.dueDate)
    const hasAnyTask = scheduledTasks.length > 0 || unscheduledTasks.length > 0

    if (!hasAnyTask && childRows.length === 0 && !hasOwnSchedule) {
      return { rows: [], stats: ZERO_STATS }
    }

    if (hasQuickFilter && !hasAnyTask && childRows.length === 0) {
      return { rows: [], stats: ZERO_STATS }
    }

    const visibleScheduledTasks = hasSearch ? matchedScheduledTasks : scheduledTasks
    const visibleUnscheduledTasks = hasSearch ? matchedUnscheduledTasks : unscheduledTasks

    const doneCount = allTasks.filter((task) => task.status === 'done').length
    const delayedTasks = visibleScheduledTasks.filter(isTaskDelayed)
    const criticalTasks = [...visibleScheduledTasks, ...visibleUnscheduledTasks].filter(isTaskCritical)
    const dependencyRiskTasks = [...visibleScheduledTasks, ...visibleUnscheduledTasks].filter(isTaskDependencyRisk)

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
    const rowMatchesSearch = matchesSearch(project.name, project.description, projectSubtitle)
    const matchedOwnTaskCount = matchedScheduledTasks.length + matchedUnscheduledTasks.length
    const shouldRevealTasks = expandedProjectIds.has(project.id) || (hasSearch && matchedOwnTaskCount > 0)

    if (hasSearch && !rowMatchesSearch && matchedOwnTaskCount === 0 && childRows.length === 0) {
      return { rows: [], stats: ZERO_STATS }
    }

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
      expanded: shouldRevealTasks,
      delayedCount: delayedTasks.length,
      criticalCount: criticalTasks.length,
      dependencyRiskCount: dependencyRiskTasks.length,
      totalCount: allTasks.length,
      doneCount,
      unscheduledCount: unscheduledTasks.length,
      childProjectCount: childRows.filter((row) => row.type === 'project' && row.depth === depth + 1).length,
    }

    const ownStats = {
      scheduledCount: visibleScheduledTasks.length,
      unscheduledCount: visibleUnscheduledTasks.length,
      delayedCount: delayedTasks.length,
      criticalCount: criticalTasks.length,
      dependencyRiskCount: dependencyRiskTasks.length,
    }

    const taskRows = shouldRevealTasks
      ? [
          ...visibleScheduledTasks.map((task) => ({
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
          ...visibleUnscheduledTasks.map((task) => ({
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
      const directProgramTasks = (directTasksByProgram.get(program.id) ?? [])
        .filter(taskMatchesQuickFilters)
        .filter((task) => matchesSearch(task.title, task.description, task.priority, task.status))
      const directScheduledTasks = (scheduledDirectTasksByProgram.get(program.id) ?? [])
        .filter(taskMatchesQuickFilters)
        .filter((task) => matchesSearch(task.title, task.description, task.priority, task.status))
        .sort((a, b) => getTaskSortValue(a) - getTaskSortValue(b))
      const directUnscheduledTasks = directProgramTasks
        .filter((task) => !hasSchedule(task))
        .sort((a, b) => getTaskSortValue(a) - getTaskSortValue(b))

      const projectRows = programRows.filter((row) => row.type === 'project')
      const programSubtitle = `${projectRows.length} projects · ${directScheduledTasks.length} scheduled${directUnscheduledTasks.length ? ` · ${directUnscheduledTasks.length} unscheduled` : ''}`
      const rowMatchesSearch = matchesSearch(program.name, program.description, programSubtitle)
      if (!rowMatchesSearch && projectRows.length === 0 && directProgramTasks.length === 0) return { rows: [], stats: sectionStats }

      const projectIds = new Set(projectRows.map((row) => row.projectId))
      const projectTasks = tasks.filter((task) =>
        task.projectId && projectIds.has(task.projectId) && taskMatchesQuickFilters(task)
      )
      const programTasks = [...projectTasks, ...directProgramTasks]
      const programScheduledTasks = [...projectTasks.filter(hasSchedule), ...directScheduledTasks]
      const programUnscheduledCount = programTasks.length - programScheduledTasks.length
      const programRange = getRangeFromTasks(programScheduledTasks)
      const directStats = {
        scheduledCount: directScheduledTasks.length,
        unscheduledCount: directUnscheduledTasks.length,
        delayedCount: directProgramTasks.filter(isTaskDelayed).length,
        criticalCount: directProgramTasks.filter(isTaskCritical).length,
        dependencyRiskCount: directProgramTasks.filter(isTaskDependencyRisk).length,
      }

      const directTaskRows = [
        ...directScheduledTasks.map((task) => ({
          id: `task-${task.id}`,
          type: 'task',
          taskId: task.id,
          projectId: null,
          programId: program.id,
          depth: 1,
          label: task.title,
          subtitle: getTaskSubtitle(task, false, isTaskDependencyRisk(task)),
          color: STATUS_COLOR[task.status] ?? program.color,
          bars: [task],
          milestones: [],
          delayedCount: isTaskDelayed(task) ? 1 : 0,
          criticalCount: isTaskCritical(task) ? 1 : 0,
          dependencyRiskCount: isTaskDependencyRisk(task) ? 1 : 0,
          unscheduled: false,
        })),
        ...directUnscheduledTasks.map((task) => ({
          id: `task-${task.id}`,
          type: 'task',
          taskId: task.id,
          projectId: null,
          programId: program.id,
          depth: 1,
          label: task.title,
          subtitle: getTaskSubtitle(task, true, isTaskDependencyRisk(task)),
          color: STATUS_COLOR[task.status] ?? program.color,
          bars: [],
          milestones: [],
          delayedCount: 0,
          criticalCount: isTaskCritical(task) ? 1 : 0,
          dependencyRiskCount: isTaskDependencyRisk(task) ? 1 : 0,
          unscheduled: true,
        })),
      ]

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
        delayedCount: sectionStats.delayedCount + directStats.delayedCount,
        criticalCount: sectionStats.criticalCount + directStats.criticalCount,
        dependencyRiskCount: sectionStats.dependencyRiskCount + directStats.dependencyRiskCount,
        unscheduledCount: sectionStats.unscheduledCount + directStats.unscheduledCount,
        totalCount: programTasks.length,
        doneCount: programTasks.filter((task) => task.status === 'done').length,
        projectCount: projectRows.length,
      }

      return {
        rows: [headerRow, ...directTaskRows, ...programRows],
        stats: mergeStats(sectionStats, directStats),
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
          delayedCount: sectionStats.delayedCount,
          criticalCount: sectionStats.criticalCount,
          dependencyRiskCount: sectionStats.dependencyRiskCount,
          unscheduledCount: sectionStats.unscheduledCount,
          totalCount: unassignedTasks.length,
          doneCount: unassignedTasks.filter((task) => task.status === 'done').length,
          projectCount: unassignedProjectRows.length,
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
  filteredSubProjectIds,
  expandedProjectIds,
  onlyDelayed,
  onlyCritical,
  onlyDependencyRisk,
  searchQuery,
])

export default useTimelineRows
