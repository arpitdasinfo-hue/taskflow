import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'

const now = () => new Date().toISOString()

/** Check if adding depId as dependency to taskId would create a cycle */
const wouldCreateCycle = (taskId, depId, tasks) => {
  if (taskId === depId) return true
  const visited = new Set()
  const dfs = (id) => {
    if (id === taskId) return true
    if (visited.has(id)) return false
    visited.add(id)
    const t = tasks.find((t) => t.id === id)
    return (t?.dependsOn ?? []).some(dfs)
  }
  return dfs(depId)
}

const useTaskStore = create(
  persist(
    immer((set, get) => ({
      tasks: [],

      addTask: (data) =>
        set((state) => {
          state.tasks.unshift({
            id: nanoid(),
            projectId: data.projectId ?? null,
            title: data.title ?? 'Untitled task',
            description: data.description ?? '',
            status: data.status ?? 'todo',
            priority: data.priority ?? 'medium',
            dueDate: data.dueDate ?? null,
            tags: data.tags ?? [],
            dependsOn: data.dependsOn ?? [],
            createdAt: now(),
            updatedAt: now(),
            subtasks: [],
            notes: [],
          })
        }),

      updateTask: (id, updates) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === id)
          if (!task) return
          Object.assign(task, updates, { updatedAt: now() })
        }),

      deleteTask: (id) =>
        set((state) => {
          state.tasks = state.tasks.filter((t) => t.id !== id)
          // Remove this task from other tasks' dependsOn
          state.tasks.forEach((t) => {
            t.dependsOn = (t.dependsOn ?? []).filter((depId) => depId !== id)
          })
        }),

      // ── Dependency management ──────────────────────────────────────────────
      addDependency: (taskId, depId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          if (!task.dependsOn) task.dependsOn = []
          if (task.dependsOn.includes(depId)) return
          if (wouldCreateCycle(taskId, depId, state.tasks)) return
          task.dependsOn.push(depId)
          task.updatedAt = now()
        }),

      removeDependency: (taskId, depId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.dependsOn = (task.dependsOn ?? []).filter((id) => id !== depId)
          task.updatedAt = now()
        }),

      // ── Bulk operations ────────────────────────────────────────────────────
      bulkUpdateTasks: (ids, updates) =>
        set((state) => {
          const ts = now()
          state.tasks.forEach((task) => {
            if (ids.includes(task.id)) {
              Object.assign(task, updates, { updatedAt: ts })
            }
          })
        }),

      bulkDeleteTasks: (ids) =>
        set((state) => {
          state.tasks = state.tasks.filter((t) => !ids.includes(t.id))
          state.tasks.forEach((t) => {
            t.dependsOn = (t.dependsOn ?? []).filter((depId) => !ids.includes(depId))
          })
        }),

      // ── Subtask CRUD ────────────────────────────────────────────────────────
      addSubtask: (taskId, title) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.subtasks.push({ id: nanoid(), title, completed: false, createdAt: now() })
          task.updatedAt = now()
        }),

      toggleSubtask: (taskId, subtaskId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const sub = task.subtasks.find((s) => s.id === subtaskId)
          if (sub) { sub.completed = !sub.completed; task.updatedAt = now() }
        }),

      updateSubtask: (taskId, subtaskId, title) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const sub = task.subtasks.find((s) => s.id === subtaskId)
          if (sub) { sub.title = title; task.updatedAt = now() }
        }),

      deleteSubtask: (taskId, subtaskId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId)
          task.updatedAt = now()
        }),

      // ── Note CRUD ───────────────────────────────────────────────────────────
      addNote: (taskId, content) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const ts = now()
          task.notes.unshift({ id: nanoid(), content, createdAt: ts, updatedAt: ts })
          task.updatedAt = ts
        }),

      updateNote: (taskId, noteId, content) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const note = task.notes.find((n) => n.id === noteId)
          if (note) { note.content = content; note.updatedAt = now(); task.updatedAt = now() }
        }),

      deleteNote: (taskId, noteId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.notes = task.notes.filter((n) => n.id !== noteId)
          task.updatedAt = now()
        }),

      getTaskById: (id) => get().tasks.find((t) => t.id === id),
    })),
    {
      name: 'taskflow-tasks',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (state, version) => {
        let s = state
        if (version < 2) {
          s = { ...s, tasks: (s.tasks ?? []).map((t) => ({ ...t, projectId: t.projectId ?? null })) }
        }
        if (version < 3) {
          s = { ...s, tasks: (s.tasks ?? []).map((t) => ({ ...t, dependsOn: t.dependsOn ?? [] })) }
        }
        if (version < 4) {
          s = { ...s, tasks: [] }
        }
        return s
      },
    }
  )
)

export default useTaskStore
