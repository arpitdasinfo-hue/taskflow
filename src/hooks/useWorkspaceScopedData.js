import { useMemo } from 'react'
import useProjectStore from '../store/useProjectStore'
import useSettingsStore from '../store/useSettingsStore'
import useTaskStore from '../store/useTaskStore'
import {
  filterMilestonesByWorkspaceScope,
  filterProgramsByWorkspaceScope,
  filterProjectsByWorkspaceScope,
  filterTasksByWorkspaceScope,
} from '../lib/workspaceScope'

export function useWorkspaceScopedData() {
  const workspaceViewScope = useSettingsStore((state) => state.workspaceViewScope)
  const programs = useProjectStore((state) => state.programs)
  const projects = useProjectStore((state) => state.projects)
  const milestones = useProjectStore((state) => state.milestones)
  const tasks = useTaskStore((state) => state.tasks)
  const trashTasks = useTaskStore((state) => state.trashTasks)

  return useMemo(() => {
    const scopedPrograms = filterProgramsByWorkspaceScope(programs, workspaceViewScope)
    const scopedProjects = filterProjectsByWorkspaceScope(projects, programs, workspaceViewScope)
    const scopedTasks = filterTasksByWorkspaceScope(tasks, programs, projects, workspaceViewScope)
    const scopedTrashTasks = filterTasksByWorkspaceScope(trashTasks, programs, projects, workspaceViewScope)
    const scopedMilestones = filterMilestonesByWorkspaceScope(milestones, projects, programs, workspaceViewScope)

    return {
      workspaceViewScope,
      programs: scopedPrograms,
      projects: scopedProjects,
      tasks: scopedTasks,
      trashTasks: scopedTrashTasks,
      milestones: scopedMilestones,
      programById: new Map(scopedPrograms.map((program) => [program.id, program])),
      projectById: new Map(scopedProjects.map((project) => [project.id, project])),
    }
  }, [workspaceViewScope, programs, projects, tasks, trashTasks, milestones])
}

export default useWorkspaceScopedData
