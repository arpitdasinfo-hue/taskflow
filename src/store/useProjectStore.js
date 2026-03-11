import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'

const now = () => new Date().toISOString()

/** Project colors — one per project for visual distinction */
export const PROJECT_COLORS = [
  '#c084fc', // purple
  '#22d3ee', // cyan
  '#34d399', // green
  '#fb923c', // orange
  '#f472b6', // pink
  '#a5b4fc', // indigo
  '#fcd34d', // yellow
  '#fb7185', // rose
]

const useProjectStore = create(
  persist(
    immer((set) => ({
      programs: [],
      projects: [],
      milestones: [],

      // ── Program CRUD ────────────────────────────────────────────────────
      addProgram: (data) =>
        set((s) => {
          s.programs.push({
            id: nanoid(),
            name: data.name ?? 'New Program',
            color: data.color ?? PROJECT_COLORS[s.programs.length % PROJECT_COLORS.length],
            description: data.description ?? '',
            status: data.status ?? 'planning',
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            createdAt: now(),
          })
        }),

      updateProgram: (id, updates) =>
        set((s) => {
          const p = s.programs.find((p) => p.id === id)
          if (p) Object.assign(p, updates)
        }),

      deleteProgram: (id) =>
        set((s) => {
          s.programs = s.programs.filter((p) => p.id !== id)
          s.projects.forEach((p) => { if (p.programId === id) p.programId = null })
        }),

      // ── Project CRUD ─────────────────────────────────────────────────────
      addProject: (data) =>
        set((s) => {
          s.projects.push({
            id: nanoid(),
            name: data.name ?? 'New Project',
            color: data.color ?? PROJECT_COLORS[s.projects.length % PROJECT_COLORS.length],
            description: data.description ?? '',
            programId: data.programId ?? null,
            parentId: data.parentId ?? null,
            status: data.status ?? 'planning',
            startDate: data.startDate ?? null,
            dueDate: data.dueDate ?? null,
            createdAt: now(),
          })
        }),

      updateProject: (id, updates) =>
        set((s) => {
          const p = s.projects.find((p) => p.id === id)
          if (p) Object.assign(p, updates)
        }),

      deleteProject: (id) =>
        set((s) => {
          // Cascade: also delete sub-projects
          s.projects = s.projects.filter((p) => p.id !== id && p.parentId !== id)
          // Also delete milestones for this project
          s.milestones = (s.milestones ?? []).filter((m) => m.projectId !== id)
        }),

      // ── Milestone CRUD ────────────────────────────────────────────────────
      addMilestone: (data) =>
        set((s) => {
          if (!s.milestones) s.milestones = []
          s.milestones.push({
            id: nanoid(),
            projectId: data.projectId,
            name: data.name ?? 'New Milestone',
            dueDate: data.dueDate ?? null,
            description: data.description ?? '',
            status: 'pending',
            createdAt: now(),
          })
        }),

      updateMilestone: (id, updates) =>
        set((s) => {
          const m = (s.milestones ?? []).find((m) => m.id === id)
          if (m) Object.assign(m, updates)
        }),

      deleteMilestone: (id) =>
        set((s) => {
          s.milestones = (s.milestones ?? []).filter((m) => m.id !== id)
        }),

      toggleMilestone: (id) =>
        set((s) => {
          const m = (s.milestones ?? []).find((m) => m.id === id)
          if (m) m.status = m.status === 'completed' ? 'pending' : 'completed'
        }),
    })),
    {
      name: 'taskflow-projects',
      storage: createJSONStorage(() => localStorage),
      version: 4,
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
