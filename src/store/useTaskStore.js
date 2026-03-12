import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'
import useWorkspaceStore from './useWorkspaceStore'
import useAuthStore from './useAuthStore'

const now = () => new Date().toISOString()

/** Check if adding depId as dependency to taskId would create a cycle */
const wouldCreateCycle = (taskId, depId, tasks) => {
  if (taskId === depId) return true
  const visited = new Set()
  const dfs = (id) => {
    if (id === taskId) return true
    if (visited.has(id)) return false
    visited.add(id)
    const task = tasks.find((t) => t.id === id)
    return (task?.dependsOn ?? []).some(dfs)
  }
  return dfs(depId)
}

const getSyncContext = () => {
  const workspaceId = useWorkspaceStore.getState().workspaceId
  const userId = useAuthStore.getState().user?.id ?? null
  return { workspaceId, userId }
}

const toTaskRow = (task, workspaceId, userId) => ({
  id: task.id,
  workspace_id: workspaceId,
  project_id: task.projectId ?? null,
  title: task.title ?? 'Untitled task',
  description: task.description ?? '',
  status: task.status ?? 'todo',
  priority: task.priority ?? 'medium',
  start_date: task.startDate ?? null,
  due_date: task.dueDate ?? null,
  tags: task.tags ?? [],
  depends_on: task.dependsOn ?? [],
  created_by: userId,
  created_at: task.createdAt ?? now(),
  updated_at: task.updatedAt ?? now(),
})

const fromTaskRow = (row) => ({
  id: row.id,
  projectId: row.project_id ?? null,
  title: row.title ?? 'Untitled task',
  description: row.description ?? '',
  status: row.status ?? 'todo',
  priority: row.priority ?? 'medium',
  startDate: row.start_date ?? null,
  dueDate: row.due_date ?? null,
  tags: Array.isArray(row.tags) ? row.tags : [],
  dependsOn: Array.isArray(row.depends_on) ? row.depends_on : [],
  createdAt: row.created_at ?? now(),
  updatedAt: row.updated_at ?? row.created_at ?? now(),
  subtasks: [],
  notes: [],
})

const toSubtaskRow = (taskId, subtask) => ({
  id: subtask.id,
  task_id: taskId,
  title: subtask.title ?? 'Untitled subtask',
  completed: !!subtask.completed,
  created_at: subtask.createdAt ?? now(),
})

const fromSubtaskRow = (row) => ({
  id: row.id,
  title: row.title ?? 'Untitled subtask',
  completed: !!row.completed,
  createdAt: row.created_at ?? now(),
})

const toNoteRow = (taskId, note, userId) => ({
  id: note.id,
  task_id: taskId,
  content: note.content ?? '',
  created_by: userId,
  created_at: note.createdAt ?? now(),
  updated_at: note.updatedAt ?? note.createdAt ?? now(),
})

const fromNoteRow = (row) => ({
  id: row.id,
  content: row.content ?? '',
  createdAt: row.created_at ?? now(),
  updatedAt: row.updated_at ?? row.created_at ?? now(),
})

async function fetchWorkspaceTaskData(workspaceId) {
  const tasksRes = await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (tasksRes.error) throw tasksRes.error

  const taskRows = tasksRes.data ?? []
  const taskIds = taskRows.map((t) => t.id)
  let subtaskRows = []
  let noteRows = []

  if (taskIds.length > 0) {
    const [subtasksRes, notesRes] = await Promise.all([
      supabase
        .from('subtasks')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('notes')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false }),
    ])

    if (subtasksRes.error) throw subtasksRes.error
    if (notesRes.error) throw notesRes.error

    subtaskRows = subtasksRes.data ?? []
    noteRows = notesRes.data ?? []
  }

  return { taskRows, subtaskRows, noteRows }
}

const useTaskStore = create(
  persist(
    immer((set, get) => ({
      tasks: [],
      syncing: false,

      addTask: (data) => {
        let created
        set((state) => {
          const ts = now()
          created = {
            id: nanoid(),
            projectId: data.projectId ?? null,
            title: data.title ?? 'Untitled task',
            description: data.description ?? '',
            status: data.status ?? 'todo',
            priority: data.priority ?? 'medium',
            startDate: data.startDate ?? null,
            dueDate: data.dueDate ?? null,
            tags: data.tags ?? [],
            dependsOn: data.dependsOn ?? [],
            createdAt: ts,
            updatedAt: ts,
            subtasks: [],
            notes: [],
          }
          state.tasks.unshift(created)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId) {
          void supabase.from('tasks').upsert(toTaskRow(created, workspaceId, userId))
        }

        return created
      },

      updateTask: (id, updates) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === id)
          if (!task) return
          Object.assign(task, updates, { updatedAt: now() })
        })

        const updated = get().tasks.find((t) => t.id === id)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase.from('tasks').upsert(toTaskRow(updated, workspaceId, userId))
        }
      },

      deleteTask: (id) => {
        set((state) => {
          state.tasks = state.tasks.filter((t) => t.id !== id)
          state.tasks.forEach((t) => {
            t.dependsOn = (t.dependsOn ?? []).filter((depId) => depId !== id)
          })
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase.from('tasks').delete().eq('id', id)
        }
      },

      // ── Dependency management ──────────────────────────────────────────────
      addDependency: (taskId, depId) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          if (!task.dependsOn) task.dependsOn = []
          if (task.dependsOn.includes(depId)) return
          if (wouldCreateCycle(taskId, depId, state.tasks)) return
          task.dependsOn.push(depId)
          task.updatedAt = now()
        })

        const updated = get().tasks.find((t) => t.id === taskId)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase.from('tasks').upsert(toTaskRow(updated, workspaceId, userId))
        }
      },

      removeDependency: (taskId, depId) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.dependsOn = (task.dependsOn ?? []).filter((id) => id !== depId)
          task.updatedAt = now()
        })

        const updated = get().tasks.find((t) => t.id === taskId)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase.from('tasks').upsert(toTaskRow(updated, workspaceId, userId))
        }
      },

      // ── Bulk operations ────────────────────────────────────────────────────
      bulkUpdateTasks: (ids, updates) => {
        set((state) => {
          const ts = now()
          state.tasks.forEach((task) => {
            if (ids.includes(task.id)) {
              Object.assign(task, updates, { updatedAt: ts })
            }
          })
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId) {
          const rows = get().tasks
            .filter((task) => ids.includes(task.id))
            .map((task) => toTaskRow(task, workspaceId, userId))
          if (rows.length > 0) void supabase.from('tasks').upsert(rows)
        }
      },

      bulkDeleteTasks: (ids) => {
        set((state) => {
          state.tasks = state.tasks.filter((t) => !ids.includes(t.id))
          state.tasks.forEach((t) => {
            t.dependsOn = (t.dependsOn ?? []).filter((depId) => !ids.includes(depId))
          })
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId && ids.length > 0) {
          void supabase.from('tasks').delete().in('id', ids)
        }
      },

      // ── Subtask CRUD ────────────────────────────────────────────────────────
      addSubtask: (taskId, title) => {
        let created
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          created = { id: nanoid(), title, completed: false, createdAt: now() }
          task.subtasks.push(created)
          task.updatedAt = now()
        })

        if (created) {
          void supabase.from('subtasks').upsert(toSubtaskRow(taskId, created))
        }
      },

      toggleSubtask: (taskId, subtaskId) => {
        let updatedSubtask
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const subtask = task.subtasks.find((s) => s.id === subtaskId)
          if (!subtask) return
          subtask.completed = !subtask.completed
          task.updatedAt = now()
          updatedSubtask = { ...subtask }
        })

        if (updatedSubtask) {
          void supabase.from('subtasks').upsert(toSubtaskRow(taskId, updatedSubtask))
        }
      },

      updateSubtask: (taskId, subtaskId, title) => {
        let updatedSubtask
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const subtask = task.subtasks.find((s) => s.id === subtaskId)
          if (!subtask) return
          subtask.title = title
          task.updatedAt = now()
          updatedSubtask = { ...subtask }
        })

        if (updatedSubtask) {
          void supabase.from('subtasks').upsert(toSubtaskRow(taskId, updatedSubtask))
        }
      },

      deleteSubtask: (taskId, subtaskId) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId)
          task.updatedAt = now()
        })

        void supabase.from('subtasks').delete().eq('id', subtaskId)
      },

      // ── Note CRUD ───────────────────────────────────────────────────────────
      addNote: (taskId, content) => {
        let created
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const ts = now()
          created = { id: nanoid(), content, createdAt: ts, updatedAt: ts }
          task.notes.unshift(created)
          task.updatedAt = ts
        })

        const { userId } = getSyncContext()
        if (created) {
          void supabase.from('notes').upsert(toNoteRow(taskId, created, userId))
        }
      },

      updateNote: (taskId, noteId, content) => {
        let updatedNote
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const note = task.notes.find((n) => n.id === noteId)
          if (!note) return
          const ts = now()
          note.content = content
          note.updatedAt = ts
          task.updatedAt = ts
          updatedNote = { ...note }
        })

        const { userId } = getSyncContext()
        if (updatedNote) {
          void supabase.from('notes').upsert(toNoteRow(taskId, updatedNote, userId))
        }
      },

      deleteNote: (taskId, noteId) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.notes = task.notes.filter((n) => n.id !== noteId)
          task.updatedAt = now()
        })

        void supabase.from('notes').delete().eq('id', noteId)
      },

      // ── Supabase sync ─────────────────────────────────────────────────────
      migrateLocalToSupabase: async (workspaceId) => {
        if (!workspaceId) return
        const { userId } = getSyncContext()
        const state = get()

        const taskRows = (state.tasks ?? []).map((task) => toTaskRow(task, workspaceId, userId))
        const subtaskRows = (state.tasks ?? []).flatMap((task) =>
          (task.subtasks ?? []).map((subtask) => toSubtaskRow(task.id, subtask))
        )
        const noteRows = (state.tasks ?? []).flatMap((task) =>
          (task.notes ?? []).map((note) => toNoteRow(task.id, note, userId))
        )

        if (taskRows.length > 0) await supabase.from('tasks').upsert(taskRows)
        if (subtaskRows.length > 0) await supabase.from('subtasks').upsert(subtaskRows)
        if (noteRows.length > 0) await supabase.from('notes').upsert(noteRows)
      },

      loadFromSupabase: async (workspaceId) => {
        if (!workspaceId) return
        set((s) => { s.syncing = true })

        try {
          let { taskRows, subtaskRows, noteRows } = await fetchWorkspaceTaskData(workspaceId)
          const hasRemoteData = taskRows.length > 0

          if (!hasRemoteData) {
            const localState = get()
            if ((localState.tasks?.length ?? 0) > 0) {
              await get().migrateLocalToSupabase(workspaceId)
              const refreshed = await fetchWorkspaceTaskData(workspaceId)
              taskRows = refreshed.taskRows
              subtaskRows = refreshed.subtaskRows
              noteRows = refreshed.noteRows
            }
          }

          const assembled = taskRows.map(fromTaskRow)
          const byId = new Map(assembled.map((task) => [task.id, task]))

          subtaskRows.forEach((row) => {
            const task = byId.get(row.task_id)
            if (task) task.subtasks.push(fromSubtaskRow(row))
          })

          noteRows.forEach((row) => {
            const task = byId.get(row.task_id)
            if (task) task.notes.push(fromNoteRow(row))
          })

          assembled.forEach((task) => {
            task.subtasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            task.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          })

          set((state) => {
            state.tasks = assembled
          })
        } finally {
          set((s) => { s.syncing = false })
        }
      },

      // ── Realtime merge helpers ────────────────────────────────────────────
      upsertTaskFromRealtime: (row) =>
        set((state) => {
          const incoming = fromTaskRow(row)
          const idx = state.tasks.findIndex((t) => t.id === incoming.id)
          if (idx === -1) state.tasks.unshift(incoming)
          else {
            state.tasks[idx] = {
              ...state.tasks[idx],
              ...incoming,
              subtasks: state.tasks[idx].subtasks ?? [],
              notes: state.tasks[idx].notes ?? [],
            }
          }
        }),

      removeTaskFromRealtime: (id) =>
        set((state) => {
          state.tasks = state.tasks.filter((t) => t.id !== id)
          state.tasks.forEach((task) => {
            task.dependsOn = (task.dependsOn ?? []).filter((depId) => depId !== id)
          })
        }),

      upsertSubtaskFromRealtime: (row) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === row.task_id)
          if (!task) return
          const subtask = fromSubtaskRow(row)
          const idx = task.subtasks.findIndex((s) => s.id === subtask.id)
          if (idx === -1) task.subtasks.push(subtask)
          else task.subtasks[idx] = { ...task.subtasks[idx], ...subtask }
          task.updatedAt = now()
        }),

      removeSubtaskFromRealtime: (id, taskId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.subtasks = task.subtasks.filter((s) => s.id !== id)
          task.updatedAt = now()
        }),

      upsertNoteFromRealtime: (row) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === row.task_id)
          if (!task) return
          const note = fromNoteRow(row)
          const idx = task.notes.findIndex((n) => n.id === note.id)
          if (idx === -1) task.notes.unshift(note)
          else task.notes[idx] = { ...task.notes[idx], ...note }
          task.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          task.updatedAt = now()
        }),

      removeNoteFromRealtime: (id, taskId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.notes = task.notes.filter((n) => n.id !== id)
          task.updatedAt = now()
        }),

      getTaskById: (id) => get().tasks.find((t) => t.id === id),
    })),
    {
      name: 'taskflow-tasks',
      storage: createJSONStorage(() => localStorage),
      version: 5,
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
