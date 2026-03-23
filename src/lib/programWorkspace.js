import { taskMatchesProgram } from './taskScope'

const toValidDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatShortDate = (value) => {
  const date = toValidDate(value)
  if (!date) return null
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const sortMilestonesByDueDate = (milestones = []) => (
  [...milestones].sort((left, right) => {
    const leftDate = toValidDate(left?.dueDate)
    const rightDate = toValidDate(right?.dueDate)
    const leftTs = leftDate ? leftDate.getTime() : Number.MAX_SAFE_INTEGER
    const rightTs = rightDate ? rightDate.getTime() : Number.MAX_SAFE_INTEGER
    return leftTs - rightTs
  })
)

export const collectProjectDescendantIds = (projects = [], rootProjectId) => {
  const queue = [rootProjectId]
  const ids = new Set(queue)

  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index]
    projects.forEach((project) => {
      if (project.parentId === currentId && !ids.has(project.id)) {
        ids.add(project.id)
        queue.push(project.id)
      }
    })
  }

  return ids
}

export const buildScheduleWindow = (...collections) => {
  const starts = []
  const ends = []

  collections.flat().forEach((item) => {
    if (!item) return
    const startDate = toValidDate(item.startDate)
    const endDate = toValidDate(item.dueDate ?? item.endDate)

    if (startDate) starts.push(startDate)
    if (endDate) ends.push(endDate)
  })

  starts.sort((left, right) => left - right)
  ends.sort((left, right) => left - right)

  return {
    startDate: starts[0] ? starts[0].toISOString() : null,
    endDate: ends[ends.length - 1] ? ends[ends.length - 1].toISOString() : null,
  }
}

export const formatScheduleLabel = (startDate, endDate) => {
  const startLabel = formatShortDate(startDate)
  const endLabel = formatShortDate(endDate)
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`
  if (startLabel) return `Starts ${startLabel}`
  if (endLabel) return `Due ${endLabel}`
  return 'No schedule set'
}

const buildRiskMeta = ({ totalTasks, doneTasks, blockedTasks, overdueTasks, unscheduledTasks }) => {
  if (totalTasks === 0) {
    return { label: 'Planning', tone: 'default', detail: 'No open work yet' }
  }
  if (doneTasks === totalTasks) {
    return { label: 'Complete', tone: 'success', detail: 'All tracked work is done' }
  }
  if (overdueTasks > 0) {
    return { label: `${overdueTasks} overdue`, tone: 'danger', detail: 'Deadlines already slipped' }
  }
  if (blockedTasks > 0) {
    return { label: `${blockedTasks} blocked`, tone: 'warning', detail: 'Execution is waiting on an unblock' }
  }
  if (unscheduledTasks > 0) {
    return { label: `${unscheduledTasks} unscheduled`, tone: 'warning', detail: 'Work still needs dates' }
  }
  return { label: 'On track', tone: 'success', detail: 'Delivery looks healthy' }
}

export const buildProgramSummary = ({ program, projects = [], tasks = [], milestones = [] }) => {
  const programProjects = projects.filter((project) => project.programId === program.id)
  const projectIds = new Set(programProjects.map((project) => project.id))
  const programTasks = tasks.filter((task) =>
    taskMatchesProgram(task, program.id, projects) &&
    (!task.projectId || projectIds.has(task.projectId))
  )
  const programMilestones = sortMilestonesByDueDate(
    milestones.filter((milestone) => milestone.projectId && projectIds.has(milestone.projectId))
  )

  const totalTasks = programTasks.length
  const doneTasks = programTasks.filter((task) => task.status === 'done').length
  const openTasks = programTasks.filter((task) => task.status !== 'done').length
  const blockedTasks = programTasks.filter((task) => task.status === 'blocked').length
  const criticalTasks = programTasks.filter((task) => task.priority === 'critical' && task.status !== 'done').length
  const unscheduledTasks = programTasks.filter((task) => !task.startDate || !task.dueDate).length
  const overdueTasks = programTasks.filter((task) => {
    const dueDate = toValidDate(task.dueDate)
    return dueDate && dueDate < new Date() && task.status !== 'done'
  }).length
  const completion = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const nextMilestone = programMilestones.find((milestone) => milestone.status !== 'completed') ?? null
  const completedMilestones = programMilestones.filter((milestone) => milestone.status === 'completed').length
  const scheduleWindow = buildScheduleWindow(program, programProjects, programTasks, programMilestones)
  const risk = buildRiskMeta({ totalTasks, doneTasks, blockedTasks, overdueTasks, unscheduledTasks })

  return {
    programProjects,
    topLevelProjects: programProjects.filter((project) => !project.parentId),
    programTasks,
    programMilestones,
    totalTasks,
    doneTasks,
    openTasks,
    blockedTasks,
    criticalTasks,
    unscheduledTasks,
    overdueTasks,
    completion,
    nextMilestone,
    completedMilestones,
    scheduleLabel: formatScheduleLabel(scheduleWindow.startDate, scheduleWindow.endDate),
    risk,
  }
}

export const buildProjectSummary = ({ project, allProjects = [], tasks = [], milestones = [] }) => {
  const descendantIds = collectProjectDescendantIds(allProjects, project.id)
  const childProjects = allProjects.filter((entry) => entry.parentId === project.id)
  const scopedTasks = tasks.filter((task) => task.projectId && descendantIds.has(task.projectId))
  const directTasks = scopedTasks.filter((task) => task.projectId === project.id)
  const scopedMilestones = sortMilestonesByDueDate(
    milestones.filter((milestone) => milestone.projectId && descendantIds.has(milestone.projectId))
  )

  const totalTasks = scopedTasks.length
  const doneTasks = scopedTasks.filter((task) => task.status === 'done').length
  const openTasks = scopedTasks.filter((task) => task.status !== 'done').length
  const blockedTasks = scopedTasks.filter((task) => task.status === 'blocked').length
  const criticalTasks = scopedTasks.filter((task) => task.priority === 'critical' && task.status !== 'done').length
  const unscheduledTasks = scopedTasks.filter((task) => !task.startDate || !task.dueDate).length
  const overdueTasks = scopedTasks.filter((task) => {
    const dueDate = toValidDate(task.dueDate)
    return dueDate && dueDate < new Date() && task.status !== 'done'
  }).length
  const completion = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const nextMilestone = scopedMilestones.find((milestone) => milestone.status !== 'completed') ?? null
  const scheduleWindow = buildScheduleWindow(project, allProjects.filter((entry) => descendantIds.has(entry.id)), scopedTasks, scopedMilestones)
  const risk = buildRiskMeta({ totalTasks, doneTasks, blockedTasks, overdueTasks, unscheduledTasks })

  return {
    childProjects,
    descendantIds,
    directTasks,
    scopedTasks,
    scopedMilestones,
    totalTasks,
    doneTasks,
    openTasks,
    blockedTasks,
    criticalTasks,
    unscheduledTasks,
    overdueTasks,
    completion,
    nextMilestone,
    scheduleLabel: formatScheduleLabel(scheduleWindow.startDate, scheduleWindow.endDate),
    risk,
  }
}
