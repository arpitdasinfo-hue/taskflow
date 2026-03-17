import { useMemo } from 'react'
import useTaskStore from '../store/useTaskStore'
import useProjectStore from '../store/useProjectStore'
import { taskMatchesProgram } from '../lib/taskScope'

const buildProgramStats = ({ programId, tasks = [], projects = [], milestones = [] }) => {
  const programProjects = projects.filter((p) => p.programId === programId)
  const projectIds = new Set(programProjects.map((p) => p.id))
  const programTasks = tasks.filter((task) =>
    taskMatchesProgram(task, programId, projects) &&
    (!task.projectId || projectIds.has(task.projectId))
  )

  const total = programTasks.length
  const done = programTasks.filter((t) => t.status === 'done').length
  const inProgress = programTasks.filter((t) => t.status === 'in-progress').length
  const blocked = programTasks.filter((t) => t.status === 'blocked').length
  const now = new Date()
  const overdue = programTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
  const critical = programTasks.filter((t) => t.priority === 'critical' && t.status !== 'done').length
  const completion = total ? Math.round((done / total) * 100) : 0

  const programMilestones = (milestones ?? []).filter((m) => projectIds.has(m.projectId))
  const upcomingMilestones = programMilestones
    .filter((m) => m.status === 'pending' && m.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5)

  const blockedTasks = programTasks.filter((t) => t.status === 'blocked')

  let health = 'on-track'
  if (overdue > 0 || blocked > 0) health = 'at-risk'
  if (overdue > 2 || (total > 0 && completion < 20 && overdue > 0)) health = 'off-track'

  return {
    total, done, inProgress, blocked, overdue, critical, completion,
    projectCount: programProjects.length,
    upcomingMilestones,
    blockedTasks,
    health,
  }
}

/** Stats for a single program */
export function useProgramStats(programId, scopedData = null) {
  const storeTasks = useTaskStore((s) => s.tasks)
  const storeProjects = useProjectStore((s) => s.projects)
  const storeMilestones = useProjectStore((s) => s.milestones)
  const tasks = scopedData?.tasks ?? storeTasks
  const projects = scopedData?.projects ?? storeProjects
  const milestones = scopedData?.milestones ?? storeMilestones

  return useMemo(() => {
    return buildProgramStats({ programId, tasks, projects, milestones })
  }, [programId, tasks, projects, milestones])
}

/** Stats for all programs — returns a map { [programId]: stats } */
export function useAllProgramStats(scopedData = null) {
  const storeTasks = useTaskStore((s) => s.tasks)
  const storeProjects = useProjectStore((s) => s.projects)
  const storePrograms = useProjectStore((s) => s.programs)
  const storeMilestones = useProjectStore((s) => s.milestones)
  const tasks = scopedData?.tasks ?? storeTasks
  const projects = scopedData?.projects ?? storeProjects
  const programs = scopedData?.programs ?? storePrograms
  const milestones = scopedData?.milestones ?? storeMilestones

  return useMemo(() => {
    const map = {}
    for (const program of programs) {
      map[program.id] = buildProgramStats({ programId: program.id, tasks, projects, milestones })
    }
    return map
  }, [tasks, projects, programs, milestones])
}
