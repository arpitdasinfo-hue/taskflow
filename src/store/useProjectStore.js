import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'
import useWorkspaceStore from './useWorkspaceStore'
import useAuthStore from './useAuthStore'

const now = () => new Date().toISOString()

/** Project colors — one per project for visual distinction */
export const PROJECT_COLORS = [
  '#c084fc',
  '#22d3ee',
  '#34d399',
  '#fb923c',
  '#f472b6',
  '#a5b4fc',
  '#fcd34d',
  '#fb7185',
  '#60a5fa',
  '#2dd4bf',
  '#84cc16',
  '#f59e0b',
  '#ef4444',
  '#e879f9',
  '#6366f1',
  '#14b8a6',
  '#a3e635',
  '#f43f5e',
  '#06b6d4',
  '#10b981',
  '#8b5cf6',
  '#f97316',
]

export const PROGRAM_SCOPE_OPTIONS = [
  { id: 'professional', label: 'Professional' },
  { id: 'personal', label: 'Personal' },
]

export const PROGRAM_SCOPE_CONFIG = {
  professional: {
    label: 'Professional',
    color: '#22d3ee',
    background: 'rgba(34,211,238,0.14)',
  },
  personal: {
    label: 'Personal',
    color: '#f472b6',
    background: 'rgba(244,114,182,0.14)',
  },
}

const getSyncContext = () => {
  const workspaceId = useWorkspaceStore.getState().workspaceId
  const userId = useAuthStore.getState().user?.id ?? null
  return { workspaceId, userId }
}

const normalizeScopeValue = (scope) =>
  scope === 'personal' ? 'personal' : 'professional'

const resolveProjectScope = (project, state) => {
  if (!project) return 'professional'

  const projectMap = new Map((state.projects ?? []).map((entry) => [entry.id, entry]))
  const programMap = new Map((state.programs ?? []).map((entry) => [entry.id, entry]))

  const resolveFromTree = (entry, visited = new Set()) => {
    if (!entry || visited.has(entry.id)) return normalizeScopeValue(entry?.scope)
    visited.add(entry.id)

    if (entry.programId) {
      const program = programMap.get(entry.programId)
      return program ? normalizeScopeValue(program.scope) : normalizeScopeValue(entry.scope)
    }

    if (entry.parentId) {
      const parent = projectMap.get(entry.parentId)
      return parent ? resolveFromTree(parent, visited) : normalizeScopeValue(entry.scope)
    }

    return normalizeScopeValue(entry.scope)
  }

  return resolveFromTree(project)
}

const toProgramRow = (program, workspaceId, userId) => ({
  id: program.id,
  workspace_id: workspaceId,
  name: program.name,
  color: program.color,
  scope: program.scope ?? 'professional',
  description: program.description ?? '',
  status: program.status ?? 'planning',
  start_date: program.startDate ?? null,
  end_date: program.endDate ?? null,
  created_by: userId,
  created_at: program.createdAt ?? now(),
  updated_at: now(),
})

const fromProgramRow = (row) => ({
  id: row.id,
  name: row.name ?? 'Untitled Program',
  color: row.color ?? PROJECT_COLORS[0],
  scope: row.scope ?? 'professional',
  description: row.description ?? '',
  status: row.status ?? 'planning',
  startDate: row.start_date ?? null,
  endDate: row.end_date ?? null,
  createdAt: row.created_at ?? now(),
})

const toProjectRow = (project, workspaceId, userId) => ({
  id: project.id,
  workspace_id: workspaceId,
  program_id: project.programId ?? null,
  parent_id: project.parentId ?? null,
  name: project.name,
  color: project.color,
  scope: normalizeScopeValue(project.scope),
  description: project.description ?? '',
  status: project.status ?? 'active',
  start_date: project.startDate ?? null,
  due_date: project.dueDate ?? null,
  created_by: userId,
  created_at: project.createdAt ?? now(),
  updated_at: now(),
})

const fromProjectRow = (row) => ({
  id: row.id,
  name: row.name ?? 'Untitled Project',
  color: row.color ?? PROJECT_COLORS[0],
  scope: normalizeScopeValue(row.scope),
  description: row.description ?? '',
  programId: row.program_id ?? null,
  parentId: row.parent_id ?? null,
  status: row.status ?? 'active',
  startDate: row.start_date ?? null,
  dueDate: row.due_date ?? null,
  createdAt: row.created_at ?? now(),
})

const toMilestoneRow = (milestone) => ({
  id: milestone.id,
  project_id: milestone.projectId,
  task_id: milestone.taskId ?? null,
  name: milestone.name,
  description: milestone.description ?? '',
  due_date: milestone.dueDate ?? null,
  status: milestone.status ?? 'pending',
  completed: milestone.status === 'completed',
  created_at: milestone.createdAt ?? now(),
})

const fromMilestoneRow = (row) => ({
  id: row.id,
  projectId: row.project_id,
  taskId: row.task_id ?? null,
  name: row.name ?? 'Untitled Milestone',
  dueDate: row.due_date ?? null,
  description: row.description ?? '',
  status: row.status ?? (row.completed ? 'completed' : 'pending'),
  createdAt: row.created_at ?? now(),
})

const getProjectSyncErrorMessage = (error) => {
  const rawMessage = error?.message || 'Unable to sync program, project, or milestone changes to Supabase.'
  const normalized = rawMessage.toLowerCase()

  if (normalized.includes('row-level security')) {
    return 'Program and milestone sync is blocked by Supabase RLS. Please run the latest scripts/supabase_policies.sql in Supabase SQL Editor.'
  }

  if (normalized.includes('project_id')) {
    return 'Milestone sync is blocked because the linked project is not available in Supabase yet. Refresh once and try again.'
  }

  if (normalized.includes('task_id')) {
    return 'Milestone sync is blocked because the milestone-to-task link column is missing. Please run the latest scripts/supabase_schema.sql in Supabase SQL Editor.'
  }

  if (normalized.includes('scope')) {
    return 'Workspace type sync is blocked because programs.scope or projects.scope is missing. Please run the latest scripts/supabase_schema.sql in Supabase SQL Editor.'
  }

  return rawMessage
}

const reportProjectSyncError = (set, error, action) => {
  const message = getProjectSyncErrorMessage(error)
  console.error(`[sync] Failed to ${action}:`, error)
  set((state) => {
    state.syncError = message
  })
}

const clearProjectSyncError = (set) => {
  set((state) => {
    state.syncError = ''
  })
}

const markProjectSyncSuccess = (set) => {
  set((state) => {
    state.syncError = ''
    state.lastSyncedAt = now()
  })
}

async function persistMilestoneRow(milestone) {
  const { error } = await supabase
    .from('milestones')
    .upsert(toMilestoneRow(milestone), { onConflict: 'id' })

  if (error) throw error
}

async function deleteMilestoneRow(id) {
  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) throw error
}

async function ensureMilestoneParents(milestone, workspaceId, userId, getState) {
  if (!workspaceId || !milestone?.projectId) return

  const state = getState()
  const projectMap = new Map((state.projects ?? []).map((project) => [project.id, project]))
  const programMap = new Map((state.programs ?? []).map((program) => [program.id, program]))
  const targetProject = projectMap.get(milestone.projectId)

  if (!targetProject) return

  const projectChain = []
  let currentProject = targetProject
  while (currentProject) {
    projectChain.unshift(currentProject)
    currentProject = currentProject.parentId ? projectMap.get(currentProject.parentId) : null
  }

  const rootProgramId = projectChain[0]?.programId ?? targetProject.programId ?? null
  const rootProgram = rootProgramId ? programMap.get(rootProgramId) : null

  if (rootProgram) {
    const { error: programError } = await supabase
      .from('programs')
      .upsert(toProgramRow(rootProgram, workspaceId, userId), { onConflict: 'id' })

    if (programError) throw programError
  }

  for (const project of projectChain) {
    const { error: projectError } = await supabase
      .from('projects')
      .upsert(toProjectRow(project, workspaceId, userId), { onConflict: 'id' })

    if (projectError) throw projectError
  }
}

async function persistMilestoneWithParents(milestone, workspaceId, userId, getState) {
  await ensureMilestoneParents(milestone, workspaceId, userId, getState)
  await persistMilestoneRow(milestone)
}

export const findMilestoneForTask = (milestones = [], task) => {
  if (!task) return null
  return milestones.find((milestone) => milestone.taskId === task.id)
    ?? (task.projectId
      ? milestones.find((milestone) => !milestone.taskId && milestone.projectId === task.projectId && milestone.name === task.title)
      : null)
}

async function fetchWorkspaceProjectData(workspaceId) {
  const [programRes, projectRes] = await Promise.all([
    supabase
      .from('programs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
    supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
  ])

  if (programRes.error) throw programRes.error
  if (projectRes.error) throw projectRes.error

  const projectIds = (projectRes.data ?? []).map((p) => p.id)
  let milestoneRows = []

  if (projectIds.length > 0) {
    const milestonesRes = await supabase
      .from('milestones')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: true })

    if (milestonesRes.error) throw milestonesRes.error
    milestoneRows = milestonesRes.data ?? []
  }

  return {
    programRows: programRes.data ?? [],
    projectRows: projectRes.data ?? [],
    milestoneRows,
  }
}

const useProjectStore = create(
  persist(
    immer((set, get) => ({
      programs: [],
      projects: [],
      milestones: [],
      syncing: false,
      syncError: '',
      lastSyncedAt: null,

      clearSyncError: () => clearProjectSyncError(set),

      // ── Program CRUD ────────────────────────────────────────────────────
      addProgram: (data) => {
        let created
        set((s) => {
          created = {
            id: nanoid(),
            name: data.name ?? 'New Program',
            color: data.color ?? PROJECT_COLORS[s.programs.length % PROJECT_COLORS.length],
            scope: data.scope ?? 'professional',
            description: data.description ?? '',
            status: data.status ?? 'planning',
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            createdAt: now(),
          }
          s.programs.push(created)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('programs')
            .upsert(toProgramRow(created, workspaceId, userId))
            .then(({ error }) => {
              if (error) reportProjectSyncError(set, error, 'create program')
              else markProjectSyncSuccess(set)
            })
        }

        return created
      },

      updateProgram: (id, updates) => {
        set((s) => {
          const program = s.programs.find((p) => p.id === id)
          if (program) Object.assign(program, updates)
        })

        const updated = get().programs.find((p) => p.id === id)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase
            .from('programs')
            .upsert(toProgramRow(updated, workspaceId, userId))
            .then(({ error }) => {
              if (error) reportProjectSyncError(set, error, 'update program')
              else markProjectSyncSuccess(set)
            })
        }
      },

      moveProgram: (id, beforeProgramId = null) => {
        set((s) => {
          const fromIndex = s.programs.findIndex((p) => p.id === id)
          if (fromIndex === -1) return

          const [program] = s.programs.splice(fromIndex, 1)
          let insertIndex = s.programs.length

          if (beforeProgramId) {
            const targetIndex = s.programs.findIndex((p) => p.id === beforeProgramId)
            if (targetIndex !== -1) insertIndex = targetIndex
          }

          s.programs.splice(insertIndex, 0, program)
        })

        const updated = get().programs.find((p) => p.id === id)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase
            .from('programs')
            .upsert(toProgramRow(updated, workspaceId, userId))
            .then(({ error }) => {
              if (error) reportProjectSyncError(set, error, 'move program')
              else markProjectSyncSuccess(set)
            })
        }
      },

      deleteProgram: (id) => {
        set((s) => {
          s.programs = s.programs.filter((p) => p.id !== id)
          s.projects.forEach((p) => { if (p.programId === id) p.programId = null })
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('programs')
            .delete()
            .eq('id', id)
            .then(({ error }) => {
              if (error) reportProjectSyncError(set, error, 'delete program')
              else markProjectSyncSuccess(set)
            })
        }
      },

      // ── Project CRUD ─────────────────────────────────────────────────────
      addProject: (data) => {
        let created
        set((s) => {
          created = {
            id: nanoid(),
            name: data.name ?? 'New Project',
            color: data.color ?? PROJECT_COLORS[s.projects.length % PROJECT_COLORS.length],
            description: data.description ?? '',
            programId: data.programId ?? null,
            parentId: data.parentId ?? null,
            scope: resolveProjectScope(data, s),
            status: data.status ?? 'active',
            startDate: data.startDate ?? null,
            dueDate: data.dueDate ?? null,
            createdAt: now(),
          }
          s.projects.push(created)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('projects')
            .upsert(toProjectRow(created, workspaceId, userId))
            .then(({ error }) => {
              if (error) reportProjectSyncError(set, error, 'create project')
              else markProjectSyncSuccess(set)
            })
        }

        return created
      },

      updateProject: (id, updates) => {
        set((s) => {
          const project = s.projects.find((p) => p.id === id)
          if (project) {
            Object.assign(project, updates)
            project.scope = resolveProjectScope(project, s)
          }
        })

        const updated = get().projects.find((p) => p.id === id)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase
            .from('projects')
            .upsert(toProjectRow(updated, workspaceId, userId))
            .then(({ error }) => {
              if (error) reportProjectSyncError(set, error, 'update project')
              else markProjectSyncSuccess(set)
            })
        }
      },

      moveProject: (id, options = {}) => {
        const nextProgramId = options.programId ?? null
        const nextParentId = options.parentId ?? null
        const beforeProjectId = options.beforeProjectId ?? null

        set((s) => {
          const fromIndex = s.projects.findIndex((p) => p.id === id)
          if (fromIndex === -1) return

          const [project] = s.projects.splice(fromIndex, 1)
          project.programId = nextProgramId
          project.parentId = nextParentId
          project.scope = resolveProjectScope(project, s)

          let insertIndex = s.projects.length
          if (beforeProjectId) {
            const targetIndex = s.projects.findIndex((p) => p.id === beforeProjectId)
            if (targetIndex !== -1) insertIndex = targetIndex
          } else {
            for (let i = s.projects.length - 1; i >= 0; i -= 1) {
              const current = s.projects[i]
              if ((current.programId ?? null) === nextProgramId && (current.parentId ?? null) === nextParentId) {
                insertIndex = i + 1
                break
              }
            }
          }

          s.projects.splice(insertIndex, 0, project)
        })

        const updated = get().projects.find((p) => p.id === id)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase
            .from('projects')
            .upsert(toProjectRow(updated, workspaceId, userId))
            .then(({ error }) => {
              if (error) reportProjectSyncError(set, error, 'move project')
              else markProjectSyncSuccess(set)
            })
        }
      },

      deleteProject: (id) => {
        set((s) => {
          s.projects = s.projects.filter((p) => p.id !== id && p.parentId !== id)
          s.milestones = (s.milestones ?? []).filter((m) => m.projectId !== id)
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .then(({ error }) => {
              if (error) reportProjectSyncError(set, error, 'delete project')
              else markProjectSyncSuccess(set)
            })
        }
      },

      // ── Milestone CRUD ────────────────────────────────────────────────────
      addMilestone: (data) => {
        let created
        set((s) => {
          if (!s.milestones) s.milestones = []
          created = {
            id: nanoid(),
            projectId: data.projectId,
            taskId: data.taskId ?? null,
            name: data.name ?? 'New Milestone',
            dueDate: data.dueDate ?? null,
            description: data.description ?? '',
            status: 'pending',
            createdAt: now(),
          }
          s.milestones.push(created)
        })

        if (created) {
          const { workspaceId, userId } = getSyncContext()
          void persistMilestoneWithParents(created, workspaceId, userId, get)
            .then(() => markProjectSyncSuccess(set))
            .catch((error) => {
              set((state) => {
                state.milestones = (state.milestones ?? []).filter((milestone) => milestone.id !== created.id)
              })
              reportProjectSyncError(set, error, 'create milestone')
            })
        }

        return created
      },

      updateMilestone: (id, updates) => {
        const previous = (get().milestones ?? []).find((m) => m.id === id)
        if (!previous) return

        set((s) => {
          const milestone = (s.milestones ?? []).find((m) => m.id === id)
          if (milestone) Object.assign(milestone, updates)
        })

        const updated = (get().milestones ?? []).find((m) => m.id === id)
        if (updated) {
          const { workspaceId, userId } = getSyncContext()
          void persistMilestoneWithParents(updated, workspaceId, userId, get)
            .then(() => markProjectSyncSuccess(set))
            .catch((error) => {
              set((state) => {
                const milestone = (state.milestones ?? []).find((entry) => entry.id === id)
                if (milestone) Object.assign(milestone, previous)
              })
              reportProjectSyncError(set, error, 'update milestone')
            })
        }
      },

      deleteMilestone: (id) => {
        const previousMilestones = get().milestones ?? []
        const removedIndex = previousMilestones.findIndex((m) => m.id === id)
        const removedMilestone = removedIndex === -1 ? null : previousMilestones[removedIndex]

        set((s) => {
          s.milestones = (s.milestones ?? []).filter((m) => m.id !== id)
        })

        if (!removedMilestone) return

        void deleteMilestoneRow(id)
          .then(() => markProjectSyncSuccess(set))
          .catch((error) => {
            set((state) => {
              if ((state.milestones ?? []).some((milestone) => milestone.id === id)) return
              state.milestones.splice(Math.max(removedIndex, 0), 0, removedMilestone)
            })
            reportProjectSyncError(set, error, 'delete milestone')
          })
      },

      toggleMilestone: (id) => {
        const previous = (get().milestones ?? []).find((m) => m.id === id)
        if (!previous) return

        set((s) => {
          const milestone = (s.milestones ?? []).find((m) => m.id === id)
          if (milestone) milestone.status = milestone.status === 'completed' ? 'pending' : 'completed'
        })

        const updated = (get().milestones ?? []).find((m) => m.id === id)
        if (updated) {
          const { workspaceId, userId } = getSyncContext()
          void persistMilestoneWithParents(updated, workspaceId, userId, get)
            .then(() => markProjectSyncSuccess(set))
            .catch((error) => {
              set((state) => {
                const milestone = (state.milestones ?? []).find((entry) => entry.id === id)
                if (milestone) Object.assign(milestone, previous)
              })
              reportProjectSyncError(set, error, 'toggle milestone')
            })
        }
      },

      markTaskAsMilestone: (task) => {
        if (!task?.projectId) return null

        const linked = findMilestoneForTask(get().milestones ?? [], task)
        const nextData = {
          projectId: task.projectId,
          taskId: task.id,
          name: task.title ?? 'Untitled task',
          dueDate: task.dueDate ?? null,
          description: task.description ?? '',
        }

        if (linked) {
          get().updateMilestone(linked.id, nextData)
          return { ...linked, ...nextData }
        }

        return get().addMilestone(nextData)
      },

      syncMilestoneFromTask: (task) => {
        if (!task?.id) return
        const linked = findMilestoneForTask(get().milestones ?? [], task)
        if (!linked) return

        const updates = {
          taskId: task.id,
          name: task.title ?? linked.name,
          dueDate: task.dueDate ?? linked.dueDate ?? null,
          description: task.description ?? linked.description ?? '',
        }

        if (task.projectId) updates.projectId = task.projectId

        get().updateMilestone(linked.id, updates)
      },

      // ── Supabase sync ─────────────────────────────────────────────────────
      migrateLocalToSupabase: async (workspaceId) => {
        const { userId } = getSyncContext()
        const state = get()
        if (!workspaceId) return

        const programRows = (state.programs ?? []).map((p) => toProgramRow(p, workspaceId, userId))
        const projectRows = (state.projects ?? []).map((p) => toProjectRow(p, workspaceId, userId))
        const milestoneRows = (state.milestones ?? []).map((m) => toMilestoneRow(m))

        if (programRows.length > 0) await supabase.from('programs').upsert(programRows)
        if (projectRows.length > 0) await supabase.from('projects').upsert(projectRows)
        if (milestoneRows.length > 0) await supabase.from('milestones').upsert(milestoneRows)
      },

      loadFromSupabase: async (workspaceId) => {
        if (!workspaceId) return
        set((s) => { s.syncing = true })

        try {
          let { programRows, projectRows, milestoneRows } = await fetchWorkspaceProjectData(workspaceId)
          const hasRemoteData = programRows.length > 0 || projectRows.length > 0 || milestoneRows.length > 0

          if (!hasRemoteData) {
            const localState = get()
            const hasLocalData =
              (localState.programs?.length ?? 0) > 0 ||
              (localState.projects?.length ?? 0) > 0 ||
              (localState.milestones?.length ?? 0) > 0

            if (hasLocalData) {
              await get().migrateLocalToSupabase(workspaceId)
              const refreshed = await fetchWorkspaceProjectData(workspaceId)
              programRows = refreshed.programRows
              projectRows = refreshed.projectRows
              milestoneRows = refreshed.milestoneRows
            }
          }

          set((s) => {
            s.programs = programRows.map(fromProgramRow)
            s.projects = projectRows.map(fromProjectRow)
            s.milestones = milestoneRows.map(fromMilestoneRow)
          })
          markProjectSyncSuccess(set)
        } catch (error) {
          reportProjectSyncError(set, error, 'load projects and milestones')
        } finally {
          set((s) => { s.syncing = false })
        }
      },

      // ── Realtime merge helpers ────────────────────────────────────────────
      upsertProgramFromRealtime: (row) =>
        set((s) => {
          const program = fromProgramRow(row)
          const idx = s.programs.findIndex((p) => p.id === program.id)
          if (idx === -1) s.programs.push(program)
          else s.programs[idx] = { ...s.programs[idx], ...program }
        }),

      removeProgramFromRealtime: (id) =>
        set((s) => {
          s.programs = s.programs.filter((p) => p.id !== id)
          s.projects.forEach((p) => { if (p.programId === id) p.programId = null })
        }),

      upsertProjectFromRealtime: (row) =>
        set((s) => {
          const project = fromProjectRow(row)
          const idx = s.projects.findIndex((p) => p.id === project.id)
          if (idx === -1) s.projects.push(project)
          else s.projects[idx] = { ...s.projects[idx], ...project }
        }),

      removeProjectFromRealtime: (id) =>
        set((s) => {
          s.projects = s.projects.filter((p) => p.id !== id && p.parentId !== id)
          s.milestones = (s.milestones ?? []).filter((m) => m.projectId !== id)
        }),

      upsertMilestoneFromRealtime: (row) =>
        set((s) => {
          const milestone = fromMilestoneRow(row)
          const idx = (s.milestones ?? []).findIndex((m) => m.id === milestone.id)
          if (idx === -1) s.milestones.push(milestone)
          else s.milestones[idx] = { ...s.milestones[idx], ...milestone }
        }),

      removeMilestoneFromRealtime: (id) =>
        set((s) => {
          s.milestones = (s.milestones ?? []).filter((m) => m.id !== id)
        }),
    })),
    {
      name: 'taskflow-projects',
      storage: createJSONStorage(() => localStorage),
      version: 7,
      migrate: (state, version) => {
        let s = state
        if (version < 2) {
          s = {
            ...s,
            programs: [],
            projects: (s.projects ?? []).map((p) => ({ ...p, programId: null })),
          }
        }
        if (version < 3) {
          s = {
            ...s,
            milestones: s.milestones ?? [],
            programs: (s.programs ?? []).map((p) => ({
              ...p,
              status: p.status ?? 'active',
              startDate: p.startDate ?? null,
              endDate: p.endDate ?? null,
            })),
            projects: (s.projects ?? []).map((p) => ({
              ...p,
              parentId: p.parentId ?? null,
              status: p.status ?? 'active',
              startDate: p.startDate ?? null,
              dueDate: p.dueDate ?? null,
            })),
          }
        }
        if (version < 4) {
          s = { ...s, programs: [], projects: [], milestones: [] }
        }
        if (version < 6) {
          s = {
            ...s,
            programs: (s.programs ?? []).map((program) => ({
              ...program,
              scope: normalizeScopeValue(program.scope),
            })),
            milestones: (s.milestones ?? []).map((milestone) => ({
              ...milestone,
              taskId: milestone.taskId ?? null,
            })),
          }
        }
        if (version < 7) {
          const programs = (s.programs ?? []).map((program) => ({
            ...program,
            scope: normalizeScopeValue(program.scope),
          }))
          const programScopeById = new Map(programs.map((program) => [program.id, normalizeScopeValue(program.scope)]))
          const existingProjects = s.projects ?? []
          const projectById = new Map(existingProjects.map((project) => [project.id, project]))
          const scopeByProjectId = new Map()

          const resolveMigratedProjectScope = (project, visited = new Set()) => {
            if (!project || visited.has(project.id)) return normalizeScopeValue(project?.scope)
            visited.add(project.id)

            if (project.programId) {
              return programScopeById.get(project.programId) ?? 'professional'
            }

            if (project.parentId) {
              const parent = projectById.get(project.parentId)
              return parent ? resolveMigratedProjectScope(parent, visited) : normalizeScopeValue(project.scope)
            }

            return normalizeScopeValue(project.scope)
          }

          const projects = existingProjects.map((project) => {
            const scope = resolveMigratedProjectScope(project)
            scopeByProjectId.set(project.id, scope)
            return {
              ...project,
              scope,
            }
          })

          s = {
            ...s,
            programs,
            projects,
          }
        }
        return s
      },
    }
  )
)

export default useProjectStore
