import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'

const now = () => new Date().toISOString()
const days = (n) => new Date(Date.now() + n * 86400000).toISOString()

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
  {
    id: 'prog-tech', name: 'Technology', color: '#c084fc',
    description: 'Engineering, design & platform',
    status: 'active', startDate: days(-30), endDate: days(90),
    createdAt: now(),
  },
  {
    id: 'prog-biz', name: 'Business', color: '#22d3ee',
    description: 'GTM, partnerships & PNL',
    status: 'active', startDate: days(-15), endDate: days(60),
    createdAt: now(),
  },
]

const SAMPLE_PROJECTS = [
  {
    id: 'proj-eng',    name: 'Engineering', color: '#c084fc',
    programId: 'prog-tech', parentId: null,
    description: 'Platform, backend & infra',
    status: 'active', startDate: days(-30), dueDate: days(60),
    createdAt: now(),
  },
  {
    id: 'proj-eng-backend', name: 'Backend Services', color: '#a5b4fc',
    programId: 'prog-tech', parentId: 'proj-eng',
    description: 'API, database & microservices',
    status: 'active', startDate: days(-20), dueDate: days(45),
    createdAt: now(),
  },
  {
    id: 'proj-design', name: 'Design',      color: '#a5b4fc',
    programId: 'prog-tech', parentId: null,
    description: 'UX, UI and brand',
    status: 'active', startDate: days(-25), dueDate: days(30),
    createdAt: now(),
  },
  {
    id: 'proj-mktg',   name: 'Marketing',   color: '#34d399',
    programId: 'prog-biz',  parentId: null,
    description: 'GTM, campaigns, content',
    status: 'active', startDate: days(-10), dueDate: days(45),
    createdAt: now(),
  },
  {
    id: 'proj-ops',    name: 'Operations',  color: '#fb923c',
    programId: 'prog-biz',  parentId: null,
    description: 'Infra, DevOps, releases',
    status: 'on-hold', startDate: days(-20), dueDate: days(80),
    createdAt: now(),
  },
]

const SAMPLE_MILESTONES = [
  {
    id: 'ms-1', projectId: 'proj-eng',
    name: 'OAuth Launch', dueDate: days(5),
    description: 'Social login live in production',
    status: 'pending', createdAt: now(),
  },
  {
    id: 'ms-2', projectId: 'proj-eng',
    name: 'DB Migration Complete', dueDate: days(10),
    description: 'Postgres 16 fully migrated',
    status: 'pending', createdAt: now(),
  },
  {
    id: 'ms-3', projectId: 'proj-design',
    name: 'Design System v1', dueDate: days(30),
    description: 'Figma component library shipped',
    status: 'pending', createdAt: now(),
  },
  {
    id: 'ms-4', projectId: 'proj-mktg',
    name: 'Q2 Launch Day', dueDate: days(18),
    description: 'Product launch campaign goes live',
    status: 'pending', createdAt: now(),
  },
  {
    id: 'ms-5', projectId: 'proj-ops',
    name: 'K8s Migration Done', dueDate: days(35),
    description: 'All services on EKS',
    status: 'pending', createdAt: now(),
  },
]

const useProjectStore = create(
  persist(
    immer((set) => ({
      programs: SAMPLE_PROGRAMS,
      projects: SAMPLE_PROJECTS,
      milestones: SAMPLE_MILESTONES,

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
      version: 3,
      migrate: (state, version) => {
        let s = state
        if (version < 2) {
          s = {
            ...s,
            programs: SAMPLE_PROGRAMS,
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
        return s
      },
    }
  )
)

export default useProjectStore
