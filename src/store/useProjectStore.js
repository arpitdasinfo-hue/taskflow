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

const getSyncContext = () => {
  const workspaceId = useWorkspaceStore.getState().workspaceId
  const userId = useAuthStore.getState().user?.id ?? null
  return { workspaceId, userId }
}

const toProgramRow = (program, workspaceId, userId) => ({
  id: program.id,
  workspace_id: workspaceId,
  name: program.name,
  color: program.color,
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
  name: row.name ?? 'Untitled Milestone',
  dueDate: row.due_date ?? null,
  description: row.description ?? '',
  status: row.status ?? (row.completed ? 'completed' : 'pending'),
  createdAt: row.created_at ?? now(),
})

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

      // ── Program CRUD ────────────────────────────────────────────────────
      addProgram: (data) => {
        let created
        set((s) => {
          created = {
            id: nanoid(),
            name: data.name ?? 'New Program',
            color: data.color ?? PROJECT_COLORS[s.programs.length % PROJECT_COLORS.length],
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
              if (error) console.error('[sync] Failed to persist program:', error)
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
          void supabase.from('programs').upsert(toProgramRow(updated, workspaceId, userId))
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
          void supabase.from('programs').upsert(toProgramRow(updated, workspaceId, userId))
        }
      },

      deleteProgram: (id) => {
        set((s) => {
          s.programs = s.programs.filter((p) => p.id !== id)
          s.projects.forEach((p) => { if (p.programId === id) p.programId = null })
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase.from('programs').delete().eq('id', id)
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
              if (error) console.error('[sync] Failed to persist project:', error)
            })
        }

        return created
      },

      updateProject: (id, updates) => {
        set((s) => {
          const project = s.projects.find((p) => p.id === id)
          if (project) Object.assign(project, updates)
        })

        const updated = get().projects.find((p) => p.id === id)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase.from('projects').upsert(toProjectRow(updated, workspaceId, userId))
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
          void supabase.from('projects').upsert(toProjectRow(updated, workspaceId, userId))
        }
      },

      deleteProject: (id) => {
        set((s) => {
          s.projects = s.projects.filter((p) => p.id !== id && p.parentId !== id)
          s.milestones = (s.milestones ?? []).filter((m) => m.projectId !== id)
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase.from('projects').delete().eq('id', id)
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
            name: data.name ?? 'New Milestone',
            dueDate: data.dueDate ?? null,
            description: data.description ?? '',
            status: 'pending',
            createdAt: now(),
          }
          s.milestones.push(created)
        })

        if (created) {
          void supabase.from('milestones').upsert(toMilestoneRow(created))
        }

        return created
      },

      updateMilestone: (id, updates) => {
        set((s) => {
          const milestone = (s.milestones ?? []).find((m) => m.id === id)
          if (milestone) Object.assign(milestone, updates)
        })

        const updated = (get().milestones ?? []).find((m) => m.id === id)
        if (updated) {
          void supabase.from('milestones').upsert(toMilestoneRow(updated))
        }
      },

      deleteMilestone: (id) => {
        set((s) => {
          s.milestones = (s.milestones ?? []).filter((m) => m.id !== id)
        })
        void supabase.from('milestones').delete().eq('id', id)
      },

      toggleMilestone: (id) => {
        set((s) => {
          const milestone = (s.milestones ?? []).find((m) => m.id === id)
          if (milestone) milestone.status = milestone.status === 'completed' ? 'pending' : 'completed'
        })

        const updated = (get().milestones ?? []).find((m) => m.id === id)
        if (updated) {
          void supabase.from('milestones').upsert(toMilestoneRow(updated))
        }
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
      version: 5,
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
        return s
      },
    }
  )
)

export default useProjectStore
