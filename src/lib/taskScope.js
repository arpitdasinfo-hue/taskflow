const toProjectMap = (projectsOrMap = []) =>
  projectsOrMap instanceof Map
    ? projectsOrMap
    : new Map((projectsOrMap ?? []).map((project) => [project.id, project]))

export const getTaskProject = (task, projectsOrMap = []) => {
  const projectId = task?.projectId ?? null
  if (!projectId) return null
  return toProjectMap(projectsOrMap).get(projectId) ?? null
}

export const getTaskProgramId = (task, projectsOrMap = []) => {
  if (!task) return null
  if (task.programId) return task.programId
  return getTaskProject(task, projectsOrMap)?.programId ?? null
}

export const getTaskProgram = (task, programs = [], projectsOrMap = []) => {
  const programId = getTaskProgramId(task, projectsOrMap)
  if (!programId) return null
  return (programs ?? []).find((program) => program.id === programId) ?? null
}

export const taskMatchesProgram = (task, programId, projectsOrMap = []) =>
  getTaskProgramId(task, projectsOrMap) === (programId ?? null)

export const isDirectProgramTask = (task, projectsOrMap = []) =>
  !task?.projectId && !!getTaskProgramId(task, projectsOrMap)
