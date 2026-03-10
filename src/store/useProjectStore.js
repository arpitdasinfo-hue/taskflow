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

// ── Sample data: Programs → Projects hierarchy ─────────────────────────────
const SAMPLE_PROGRAMS = [
  { id: 'prog-tech', name: 'Technology', color: '#c084fc', description: 'Engineering, design & platform', createdAt: now() },
  { id: 'prog-biz',  name: 'Business',   color: '#22d3ee', description: 'GTM, partnerships & PNL',       createdAt: now() },
]

const SAMPLE_PROJECTS = [
  { id: 'proj-eng',    name: 'Engineering', color: '#c084fc', programId: 'prog-tech', description: 'Platform, backend & infra', createdAt: now() },
  { id: 'proj-design', name: 'Design',      color: '#a5b4fc', programId: 'prog-tech', description: 'UX, UI and brand',          createdAt: now() },
  { id: 'proj-mktg',   name: 'Marketing',   color: '#34d399', programId: 'prog-biz',  description: 'GTM, campaigns, content',   createdAt: now() },
  { id: 'proj-ops',    name: 'Operations',  color: '#fb923c', programId: 'prog-biz',  description: 'Infra, DevOps, releases',   createdAt: now() },
]

const useProjectStore = create(
  persist(
    immer((set) => ({
      programs: SAMPLE_PROGRAMS,
      projects: SAMPLE_PROJECTS,

      // ── Program CRUD ────────────────────────────────────────────────────
      addProgram: (data) =>
        set((s) => {
          s.programs.push({
            id: nanoid(),
            name: data.name ?? 'New Program',
            color: data.color ?? PROJECT_COLORS[s.programs.length % PROJECT_COLORS.length],
            description: data.description ?? '',
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
            createdAt: now(),
          })
        }),

      updateProject: (id, updates) =>
        set((s) => {
          const p = s.projects.find((p) => p.id === id)
          if (p) Object.assign(p, updates)
        }),

      deleteProject: (id) =>
        set((s) => { s.projects = s.projects.filter((p) => p.id !== id) }),
    })),
    {
      name: 'taskflow-projects',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (state, version) => {
        if (version < 2) {
          return {
            ...state,
            programs: SAMPLE_PROGRAMS,
            projects: (state.projects ?? []).map((p) => ({ ...p, programId: null })),
          }
        }
        return state
      },
    }
  )
)

export default useProjectStore
