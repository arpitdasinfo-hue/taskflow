import { getTaskProgramId } from './taskScope'

export const WORKSPACE_VIEW_OPTIONS = [
  { id: 'professional', label: 'Professional' },
  { id: 'personal', label: 'Personal' },
]

const toProgramMap = (programsOrMap = []) =>
  programsOrMap instanceof Map
    ? programsOrMap
    : new Map((programsOrMap ?? []).map((program) => [program.id, program]))

const toProjectMap = (projectsOrMap = []) =>
  projectsOrMap instanceof Map
    ? projectsOrMap
    : new Map((projectsOrMap ?? []).map((project) => [project.id, project]))

export const normalizeWorkspaceViewScope = (scope) =>
  scope === 'personal' ? 'personal' : 'professional'

export const getProgramWorkspaceScope = (program) =>
  normalizeWorkspaceViewScope(program?.scope)

export const programMatchesWorkspaceScope = (program, scope) =>
  getProgramWorkspaceScope(program) === normalizeWorkspaceViewScope(scope)

export const getProjectWorkspaceScope = (project, programsOrMap = []) => {
  if (!project?.programId) return normalizeWorkspaceViewScope(project?.scope)
  const program = toProgramMap(programsOrMap).get(project.programId)
  return program
    ? getProgramWorkspaceScope(program)
    : normalizeWorkspaceViewScope(project?.scope)
}

export const projectMatchesWorkspaceScope = (project, programsOrMap = [], scope) =>
  getProjectWorkspaceScope(project, programsOrMap) === normalizeWorkspaceViewScope(scope)

export const getTaskWorkspaceScope = (task, programsOrMap = [], projectsOrMap = []) => {
  const projectMap = toProjectMap(projectsOrMap)
  const programId = getTaskProgramId(task, projectMap)
  const fallbackScope = task?.projectId
    ? normalizeWorkspaceViewScope(projectMap.get(task.projectId)?.scope ?? task?.scope)
    : normalizeWorkspaceViewScope(task?.scope)

  if (!programId) return fallbackScope

  const program = toProgramMap(programsOrMap).get(programId)
  return program ? getProgramWorkspaceScope(program) : fallbackScope
}

export const taskMatchesWorkspaceScope = (task, programsOrMap = [], projectsOrMap = [], scope) =>
  getTaskWorkspaceScope(task, programsOrMap, projectsOrMap) === normalizeWorkspaceViewScope(scope)

export const filterProgramsByWorkspaceScope = (programs = [], scope) =>
  (programs ?? []).filter((program) => programMatchesWorkspaceScope(program, scope))

export const filterProjectsByWorkspaceScope = (projects = [], programsOrMap = [], scope) =>
  (projects ?? []).filter((project) => projectMatchesWorkspaceScope(project, programsOrMap, scope))

export const filterTasksByWorkspaceScope = (tasks = [], programsOrMap = [], projectsOrMap = [], scope) =>
  (tasks ?? []).filter((task) => taskMatchesWorkspaceScope(task, programsOrMap, projectsOrMap, scope))

export const filterMilestonesByWorkspaceScope = (milestones = [], projectsOrMap = [], programsOrMap = [], scope) => {
  const projectMap = toProjectMap(projectsOrMap)
  return (milestones ?? []).filter((milestone) => {
    const project = milestone?.projectId ? projectMap.get(milestone.projectId) : null
    if (!project) return false
    return projectMatchesWorkspaceScope(project, programsOrMap, scope)
  })
}
