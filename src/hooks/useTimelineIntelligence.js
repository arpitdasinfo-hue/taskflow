import { useMemo } from 'react'
import { startOfDay, toDisplayDate } from '../components/timeline/timelineUtils'

const DAYS_AHEAD_WARNING = 7

const hasSchedule = (item) => Boolean(item?.startDate || item?.dueDate)

const buildDescendantMap = (projects) => {
  const childrenByParent = new Map()
  projects.forEach((project) => {
    if (!project.parentId) return
    const bucket = childrenByParent.get(project.parentId) ?? []
    bucket.push(project.id)
    childrenByParent.set(project.parentId, bucket)
  })

  const cache = new Map()
  const collect = (projectId) => {
    if (cache.has(projectId)) return cache.get(projectId)
    const directChildren = childrenByParent.get(projectId) ?? []
    const descendants = new Set(directChildren)
    directChildren.forEach((childId) => {
      collect(childId).forEach((descendantId) => descendants.add(descendantId))
    })
    cache.set(projectId, descendants)
    return descendants
  }

  projects.forEach((project) => collect(project.id))
  return cache
}

const resolveScopedProjectIds = ({
  projects,
  filteredProgramIds,
  filteredProjectIds,
  filteredSubProjectIds,
}) => {
  const descendantMap = buildDescendantMap(projects)
  let visibleProjects = projects

  if (filteredProgramIds.size > 0) {
    visibleProjects = visibleProjects.filter((project) => filteredProgramIds.has(project.programId))
  }

  if (filteredProjectIds.size > 0) {
    const allowed = new Set()
    filteredProjectIds.forEach((projectId) => {
      allowed.add(projectId)
      descendantMap.get(projectId)?.forEach((descendantId) => allowed.add(descendantId))
    })
    visibleProjects = visibleProjects.filter((project) => allowed.has(project.id))
  }

  if (filteredSubProjectIds.size > 0) {
    const allowed = new Set()
    filteredSubProjectIds.forEach((projectId) => {
      allowed.add(projectId)
      descendantMap.get(projectId)?.forEach((descendantId) => allowed.add(descendantId))
    })
    visibleProjects = visibleProjects.filter((project) => allowed.has(project.id))
  }

  return new Set(visibleProjects.map((project) => project.id))
}

const withinNextDays = (date, fromDate, days) => {
  if (!date) return false
  const diff = Math.round((startOfDay(date) - startOfDay(fromDate)) / 86400000)
  return diff <= days
}

const toIssue = (id, severity, title, detail) => ({ id, severity, title, detail })

const useTimelineIntelligence = ({
  programs,
  projects,
  tasks,
  filteredProgramIds,
  filteredProjectIds,
  filteredSubProjectIds,
}) => useMemo(() => {
  const today = startOfDay(new Date())
  const scopedProjectIds = resolveScopedProjectIds({
    projects,
    filteredProgramIds,
    filteredProjectIds,
    filteredSubProjectIds,
  })
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const taskById = new Map(tasks.map((task) => [task.id, task]))

  const scopedPrograms = filteredProgramIds.size > 0
    ? programs.filter((program) => filteredProgramIds.has(program.id))
    : programs

  const scopedTasks = tasks.filter((task) => {
    if (task.projectId) return scopedProjectIds.has(task.projectId)
    if (filteredProjectIds.size > 0 || filteredSubProjectIds.size > 0) return false
    if (filteredProgramIds.size > 0) return filteredProgramIds.has(task.programId)
    return true
  })

  const unscheduledTasks = scopedTasks.filter((task) => !task.startDate || !task.dueDate)
  const delayedTasks = scopedTasks.filter((task) => {
    const due = toDisplayDate(task.dueDate)
    return Boolean(due && due < today && task.status !== 'done')
  })
  const blockedSoonTasks = scopedTasks.filter((task) => {
    const due = toDisplayDate(task.dueDate)
    return task.status === 'blocked' && Boolean(due) && withinNextDays(due, today, DAYS_AHEAD_WARNING)
  })

  const scheduleConflicts = []
  const dependencyRisks = []

  projects
    .filter((project) => scopedProjectIds.has(project.id))
    .forEach((project) => {
      const start = toDisplayDate(project.startDate)
      const due = toDisplayDate(project.dueDate)
      if (start && due && due < start) {
        scheduleConflicts.push(
          toIssue(
            `project-window-${project.id}`,
            'high',
            `${project.name} has an inverted schedule`,
            'Project due date is earlier than its start date.'
          )
        )
      }
    })

  scopedTasks.forEach((task) => {
    const taskStart = toDisplayDate(task.startDate)
    const taskDue = toDisplayDate(task.dueDate)
    const taskProject = task.projectId ? projectById.get(task.projectId) : null

    if (taskStart && taskDue && taskDue < taskStart) {
      scheduleConflicts.push(
        toIssue(
          `task-window-${task.id}`,
          'high',
          `${task.title} has an inverted schedule`,
          'Task due date is earlier than its start date.'
        )
      )
    }

    if (taskProject) {
      const projectStart = toDisplayDate(taskProject.startDate)
      const projectDue = toDisplayDate(taskProject.dueDate)

      if (taskStart && projectStart && taskStart < projectStart) {
        scheduleConflicts.push(
          toIssue(
            `task-before-project-${task.id}`,
            'medium',
            `${task.title} starts before ${taskProject.name}`,
            'Task starts before the parent project window begins.'
          )
        )
      }

      if (taskDue && projectDue && taskDue > projectDue) {
        scheduleConflicts.push(
          toIssue(
            `task-after-project-${task.id}`,
            'medium',
            `${task.title} lands after ${taskProject.name}`,
            'Task due date is later than the parent project deadline.'
          )
        )
      }
    }

    ;(task.dependsOn ?? []).forEach((dependencyId) => {
      const dependency = taskById.get(dependencyId)
      if (!dependency) {
        dependencyRisks.push(
          toIssue(
            `missing-dependency-${task.id}-${dependencyId}`,
            'high',
            `${task.title} depends on a missing task`,
            'One dependency reference no longer exists.'
          )
        )
        return
      }

      const dependencyDue = toDisplayDate(dependency.dueDate)
      if (taskStart && dependencyDue && dependencyDue > taskStart && dependency.status !== 'done') {
        dependencyRisks.push(
          toIssue(
            `dependency-window-${task.id}-${dependency.id}`,
            'medium',
            `${task.title} starts before ${dependency.title} finishes`,
            'Dependency completion is scheduled after the dependent task starts.'
          )
        )
      }

      if (dependency.status !== 'done') {
        dependencyRisks.push(
          toIssue(
            `dependency-open-${task.id}-${dependency.id}`,
            dependency.status === 'blocked' ? 'high' : 'low',
            `${task.title} is waiting on ${dependency.title}`,
            dependency.status === 'blocked'
              ? 'The dependency is blocked and can slow down downstream delivery.'
              : 'The dependency is still open.'
          )
        )
      }
    })
  })

  const cards = [
    {
      id: 'conflicts',
      label: 'Schedule conflicts',
      value: scheduleConflicts.length,
      tone: scheduleConflicts.length > 0 ? 'danger' : 'neutral',
    },
    {
      id: 'unscheduled',
      label: 'Unscheduled tasks',
      value: unscheduledTasks.length,
      tone: unscheduledTasks.length > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'dependency',
      label: 'Dependency risks',
      value: dependencyRisks.length,
      tone: dependencyRisks.length > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'blocked',
      label: 'Blocked or late',
      value: blockedSoonTasks.length + delayedTasks.length,
      tone: blockedSoonTasks.length + delayedTasks.length > 0 ? 'danger' : 'neutral',
    },
  ]

  const issues = [
    ...scheduleConflicts,
    ...dependencyRisks,
    ...blockedSoonTasks.slice(0, 3).map((task) =>
      toIssue(
        `blocked-soon-${task.id}`,
        'high',
        `${task.title} is blocked near its due date`,
        'Blocked task is due within the next 7 days.'
      )
    ),
    ...unscheduledTasks.slice(0, 3).map((task) =>
      toIssue(
        `unscheduled-${task.id}`,
        'low',
        `${task.title} still has no full schedule`,
        'Task needs both a start date and a due date to land on the plan.'
      )
    ),
  ].slice(0, 6)

  return {
    cards,
    issues,
    scopeSummary: {
      programCount: scopedPrograms.length,
      projectCount: scopedProjectIds.size,
      taskCount: scopedTasks.length,
    },
  }
}, [
  programs,
  projects,
  tasks,
  filteredProgramIds,
  filteredProjectIds,
  filteredSubProjectIds,
])

export default useTimelineIntelligence
