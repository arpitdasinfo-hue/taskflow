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

const SAMPLE_PROJECTS = [
  { id: 'proj-eng',    name: 'Engineering',  color: '#c084fc', description: 'Platform, backend & infra', createdAt: now() },
  { id: 'proj-design', name: 'Design',       color: '#22d3ee', description: 'UX, UI and brand', createdAt: now() },
  { id: 'proj-mktg',   name: 'Marketing',    color: '#34d399', description: 'GTM, campaigns, content', createdAt: now() },
  { id: 'proj-ops',    name: 'Operations',   color: '#fb923c', description: 'Infra, DevOps, releases', createdAt: now() },
]

const useProjectStore = create(
  persist(
    immer((set) => ({
      projects: SAMPLE_PROJECTS,

      addProject: (data) =>
        set((s) => {
          s.projects.push({
            id: nanoid(),
            name: data.name ?? 'New Project',
            color: data.color ?? PROJECT_COLORS[s.projects.length % PROJECT_COLORS.length],
            description: data.description ?? '',
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
      version: 1,
    }
  )
)

export default useProjectStore
