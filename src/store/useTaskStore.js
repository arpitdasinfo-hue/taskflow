import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'
import useWorkspaceStore from './useWorkspaceStore'
import useAuthStore from './useAuthStore'
import useProjectStore from './useProjectStore'
import { getProgramWorkspaceScope, getTaskWorkspaceScope, normalizeWorkspaceViewScope } from '../lib/workspaceScope'

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

const getTaskSyncErrorMessage = (error) => {
  const rawMessage = error?.message || 'Unable to sync task changes to Supabase.'
  const normalized = rawMessage.toLowerCase()

  if (normalized.includes('deleted_at')) {
    return 'Task trash sync is blocked. Please run the latest tasks.deleted_at migration from scripts/supabase_schema.sql in Supabase.'
  }

  if (normalized.includes('start_date')) {
    return 'Task schedule sync is blocked. Please confirm the tasks.start_date column exists in Supabase and matches the latest schema.'
  }

  if (normalized.includes('scope')) {
    return 'Task workspace sync is blocked. Please confirm the tasks.scope column exists in Supabase and matches the latest schema.'
  }

  if (normalized.includes('row-level security')) {
    return 'Task sync is blocked by Supabase RLS. Please run the latest scripts/supabase_policies.sql in Supabase SQL Editor.'
  }

  return rawMessage
}

const reportTaskSyncError = (set, error, action) => {
  const message = getTaskSyncErrorMessage(error)
  console.error(`[sync] Failed to ${action}:`, error)
  set((state) => {
    state.syncError = message
  })
}

const clearTaskSyncError = (set) => {
  set((state) => {
    state.syncError = ''
  })
}

const markTaskSyncSuccess = (set) => {
  set((state) => {
    state.syncError = ''
    state.lastSyncedAt = now()
  })
}

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

const getProgramIdForProject = (projectId) => {
  if (!projectId) return null
  const project = useProjectStore.getState().projects.find((entry) => entry.id === projectId)
  return project?.programId ?? null
}

const getProgramScopeForProgram = (programId) => {
  if (!programId) return 'professional'
  const program = useProjectStore.getState().programs.find((entry) => entry.id === programId)
  return getProgramWorkspaceScope(program)
}

const normalizeTaskScope = (task = null, updates = {}) => {
  const nextProjectId = hasOwn(updates, 'projectId') ? updates.projectId ?? null : task?.projectId ?? null
  let nextProgramId = hasOwn(updates, 'programId') ? updates.programId ?? null : task?.programId ?? null

  if (nextProjectId) nextProgramId = getProgramIdForProject(nextProjectId)

  const currentTaskScope = task
    ? getTaskWorkspaceScope(task, useProjectStore.getState().programs, useProjectStore.getState().projects)
    : 'professional'
  const requestedScope = hasOwn(updates, 'scope')
    ? normalizeWorkspaceViewScope(updates.scope)
    : normalizeWorkspaceViewScope(task?.scope ?? currentTaskScope)

  return {
    projectId: nextProjectId,
    programId: nextProgramId,
    scope: nextProgramId ? getProgramScopeForProgram(nextProgramId) : requestedScope,
  }
}

const buildTaskPatchFromUpdates = (task, updates = {}) => {
  const patch = {
    updated_at: task.updatedAt ?? now(),
  }

  if (hasOwn(updates, 'title')) patch.title = task.title ?? 'Untitled task'
  if (hasOwn(updates, 'description')) patch.description = task.description ?? ''
  if (hasOwn(updates, 'status')) patch.status = task.status ?? 'todo'
  if (hasOwn(updates, 'priority')) patch.priority = task.priority ?? 'medium'
  if (hasOwn(updates, 'startDate')) patch.start_date = task.startDate ?? null
  if (hasOwn(updates, 'dueDate')) patch.due_date = task.dueDate ?? null
  if (hasOwn(updates, 'tags')) patch.tags = task.tags ?? []
  if (hasOwn(updates, 'dependsOn')) patch.depends_on = task.dependsOn ?? []
  if (hasOwn(updates, 'deletedAt')) patch.deleted_at = task.deletedAt ?? null

  if (hasOwn(updates, 'projectId') || hasOwn(updates, 'programId') || hasOwn(updates, 'scope')) {
    const scope = normalizeTaskScope(task)
    patch.project_id = scope.projectId
    patch.program_id = scope.programId
    patch.scope = scope.scope
  }

  return patch
}

async function persistTaskPatch(task, patch, workspaceId, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', task.id)
    .select('id')
    .maybeSingle()

  if (error) throw error

  if (!data) {
    const { error: upsertError } = await supabase
      .from('tasks')
      .upsert(toTaskRow(task, workspaceId, userId))

    if (upsertError) throw upsertError
  }
}

const toTaskRow = (task, workspaceId, userId) => {
  const scope = normalizeTaskScope(task)
  return {
    id: task.id,
    workspace_id: workspaceId,
    project_id: scope.projectId,
    program_id: scope.programId,
    scope: scope.scope,
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
    deleted_at: task.deletedAt ?? null,
  }
}

const fromTaskRow = (row) => ({
  id: row.id,
  projectId: row.project_id ?? null,
  programId: row.program_id ?? null,
  scope: normalizeWorkspaceViewScope(row.scope),
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
  deletedAt: row.deleted_at ?? null,
  subtasks: [],
  notes: [],
})

const sortTasksByCreatedAt = (tasks = []) =>
  [...tasks].sort((left, right) => new Date(right.createdAt ?? 0) - new Date(left.createdAt ?? 0))

const sortTasksByDeletedAt = (tasks = []) =>
  [...tasks].sort((left, right) => new Date(right.deletedAt ?? right.updatedAt ?? 0) - new Date(left.deletedAt ?? left.updatedAt ?? 0))

const splitDeletedTasks = (tasks = [], trashTasks = []) => {
  const active = []
  const trash = []

  ;[...(tasks ?? []), ...(trashTasks ?? [])].forEach((task) => {
    if (!task?.id) return
    if (task.deletedAt) trash.push(task)
    else active.push(task)
  })

  return {
    tasks: sortTasksByCreatedAt(active),
    trashTasks: sortTasksByDeletedAt(trash),
  }
}

const detachTaskDependencies = (tasks = [], removedIds = []) => {
  if (!removedIds.length) return
  const removedSet = new Set(removedIds)
  tasks.forEach((task) => {
    task.dependsOn = (task.dependsOn ?? []).filter((depId) => !removedSet.has(depId))
  })
}

const findTaskCollection = (state, taskId) => {
  const activeIndex = state.tasks.findIndex((task) => task.id === taskId)
  if (activeIndex !== -1) return { key: 'tasks', index: activeIndex, task: state.tasks[activeIndex] }

  const trashIndex = state.trashTasks.findIndex((task) => task.id === taskId)
  if (trashIndex !== -1) return { key: 'trashTasks', index: trashIndex, task: state.trashTasks[trashIndex] }

  return null
}

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
      trashTasks: [],
      syncing: false,
      syncError: '',
      lastSyncedAt: null,

      clearSyncError: () => clearTaskSyncError(set),

      addTask: (data) => {
        let created
        set((state) => {
          const ts = now()
          created = {
            id: nanoid(),
            ...normalizeTaskScope(null, {
              projectId: data.projectId ?? null,
              programId: data.programId ?? null,
              scope: data.scope ?? null,
            }),
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
            deletedAt: null,
            subtasks: [],
            notes: [],
          }
          state.tasks.unshift(created)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('tasks')
            .upsert(toTaskRow(created, workspaceId, userId))
            .then(({ error }) => {
              if (error) reportTaskSyncError(set, error, 'create task')
              else markTaskSyncSuccess(set)
            })
        }

        return created
      },

      updateTask: (id, updates) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === id)
          if (!task) return
          Object.assign(task, updates, normalizeTaskScope(task, updates), { updatedAt: now() })
        })

        const updated = get().tasks.find((t) => t.id === id)
        if (updated) useProjectStore.getState().syncMilestoneFromTask(updated)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          const patch = buildTaskPatchFromUpdates(updated, updates)
          void persistTaskPatch(updated, patch, workspaceId, userId)
            .then(() => markTaskSyncSuccess(set))
            .catch((error) => reportTaskSyncError(set, error, 'update task'))
        }
      },

      moveTask: (id, options = {}) => {
        const beforeTaskId = options.beforeTaskId ?? null

        set((state) => {
          const fromIndex = state.tasks.findIndex((t) => t.id === id)
          if (fromIndex === -1) return

          const [task] = state.tasks.splice(fromIndex, 1)
          const scope = normalizeTaskScope(task, options)
          task.projectId = scope.projectId
          task.programId = scope.programId
          task.scope = scope.scope
          task.updatedAt = now()

          let insertIndex = state.tasks.length
          if (beforeTaskId) {
            const targetIndex = state.tasks.findIndex((t) => t.id === beforeTaskId)
            if (targetIndex !== -1) insertIndex = targetIndex
          } else {
            for (let i = state.tasks.length - 1; i >= 0; i -= 1) {
              if (
                (state.tasks[i].projectId ?? null) === (task.projectId ?? null) &&
                (state.tasks[i].programId ?? null) === (task.programId ?? null)
              ) {
                insertIndex = i + 1
                break
              }
            }
          }

          state.tasks.splice(insertIndex, 0, task)
        })

        const updated = get().tasks.find((t) => t.id === id)
        if (updated) useProjectStore.getState().syncMilestoneFromTask(updated)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          const patch = buildTaskPatchFromUpdates(updated, { projectId: updated.projectId, programId: updated.programId })
          void persistTaskPatch(updated, patch, workspaceId, userId)
            .then(() => markTaskSyncSuccess(set))
            .catch((error) => reportTaskSyncError(set, error, 'move task'))
        }
      },

      deleteTask: (id) => {
        let deletedTask = null
        set((state) => {
          const index = state.tasks.findIndex((task) => task.id === id)
          if (index === -1) return

          const [task] = state.tasks.splice(index, 1)
          const ts = now()
          task.deletedAt = ts
          task.updatedAt = ts
          state.trashTasks.unshift(task)
          detachTaskDependencies(state.tasks, [id])
          deletedTask = { ...task }
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && deletedTask) {
          const patch = buildTaskPatchFromUpdates(deletedTask, { deletedAt: deletedTask.deletedAt })
          void persistTaskPatch(deletedTask, patch, workspaceId, userId)
            .then(() => markTaskSyncSuccess(set))
            .catch((error) => reportTaskSyncError(set, error, 'move task to trash'))
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
          const patch = buildTaskPatchFromUpdates(updated, { dependsOn: updated.dependsOn })
          void persistTaskPatch(updated, patch, workspaceId, userId)
            .then(() => markTaskSyncSuccess(set))
            .catch((error) => reportTaskSyncError(set, error, 'update task dependency'))
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
          const patch = buildTaskPatchFromUpdates(updated, { dependsOn: updated.dependsOn })
          void persistTaskPatch(updated, patch, workspaceId, userId)
            .then(() => markTaskSyncSuccess(set))
            .catch((error) => reportTaskSyncError(set, error, 'remove task dependency'))
        }
      },

      // ── Bulk operations ────────────────────────────────────────────────────
      bulkUpdateTasks: (ids, updates) => {
        set((state) => {
          const ts = now()
          state.tasks.forEach((task) => {
            if (ids.includes(task.id)) {
              Object.assign(task, updates, normalizeTaskScope(task, updates), { updatedAt: ts })
            }
          })
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId) {
          const updatedTasks = get().tasks.filter((task) => ids.includes(task.id))
          updatedTasks.forEach((task) => useProjectStore.getState().syncMilestoneFromTask(task))
          if (updatedTasks.length > 0) {
            void Promise.all(
              updatedTasks.map((task) =>
                persistTaskPatch(task, buildTaskPatchFromUpdates(task, updates), workspaceId, userId)
              )
            )
              .then(() => markTaskSyncSuccess(set))
              .catch((error) => reportTaskSyncError(set, error, 'bulk update tasks'))
          }
        }
      },

      bulkDeleteTasks: (ids) => {
        let deletedRows = []
        set((state) => {
          const removedSet = new Set(ids)
          const ts = now()
          const nextActive = []

          state.tasks.forEach((task) => {
            if (removedSet.has(task.id)) {
              task.deletedAt = ts
              task.updatedAt = ts
              state.trashTasks.unshift(task)
              deletedRows.push({ ...task })
            } else {
              nextActive.push(task)
            }
          })

          state.tasks = nextActive
          detachTaskDependencies(state.tasks, ids)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && deletedRows.length > 0) {
          void Promise.all(
            deletedRows.map((task) =>
              persistTaskPatch(task, buildTaskPatchFromUpdates(task, { deletedAt: task.deletedAt }), workspaceId, userId)
            )
          )
            .then(() => markTaskSyncSuccess(set))
            .catch((error) => reportTaskSyncError(set, error, 'bulk move tasks to trash'))
        }
      },

      restoreTask: (id) => {
        let restoredTask = null
        set((state) => {
          const index = state.trashTasks.findIndex((task) => task.id === id)
          if (index === -1) return

          const [task] = state.trashTasks.splice(index, 1)
          task.deletedAt = null
          task.updatedAt = now()
          state.tasks.unshift(task)
          restoredTask = { ...task }
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && restoredTask) {
          const patch = buildTaskPatchFromUpdates(restoredTask, { deletedAt: restoredTask.deletedAt })
          void persistTaskPatch(restoredTask, patch, workspaceId, userId)
            .then(() => markTaskSyncSuccess(set))
            .catch((error) => reportTaskSyncError(set, error, 'restore task'))
        }
      },

      purgeTask: (id) => {
        set((state) => {
          state.trashTasks = state.trashTasks.filter((task) => task.id !== id)
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase.from('tasks').delete().eq('id', id).then(({ error }) => {
            if (error) reportTaskSyncError(set, error, 'delete task permanently')
            else markTaskSyncSuccess(set)
          })
        }
      },

      emptyTrash: () => {
        const ids = get().trashTasks.map((task) => task.id)
        if (ids.length === 0) return

        set((state) => {
          state.trashTasks = []
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase.from('tasks').delete().in('id', ids).then(({ error }) => {
            if (error) reportTaskSyncError(set, error, 'empty trash')
            else markTaskSyncSuccess(set)
          })
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

        const allTasks = [...(state.tasks ?? []), ...(state.trashTasks ?? [])]
        const taskRows = allTasks.map((task) => toTaskRow(task, workspaceId, userId))
        const subtaskRows = allTasks.flatMap((task) =>
          (task.subtasks ?? []).map((subtask) => toSubtaskRow(task.id, subtask))
        )
        const noteRows = allTasks.flatMap((task) =>
          (task.notes ?? []).map((note) => toNoteRow(task.id, note, userId))
        )

        if (taskRows.length > 0) {
          const { error } = await supabase.from('tasks').upsert(taskRows)
          if (error) throw error
        }
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
            if ((localState.tasks?.length ?? 0) > 0 || (localState.trashTasks?.length ?? 0) > 0) {
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
            const sanitized = splitDeletedTasks(assembled, [])
            state.tasks = sanitized.tasks
            state.trashTasks = sanitized.trashTasks
          })
          markTaskSyncSuccess(set)
        } catch (error) {
          reportTaskSyncError(set, error, 'load tasks from Supabase')
        } finally {
          set((s) => { s.syncing = false })
        }
      },

      // ── Realtime merge helpers ────────────────────────────────────────────
      upsertTaskFromRealtime: (row) =>
        set((state) => {
          const incoming = fromTaskRow(row)
          const targetKey = incoming.deletedAt ? 'trashTasks' : 'tasks'
          const otherKey = incoming.deletedAt ? 'tasks' : 'trashTasks'
          const existing = findTaskCollection(state, incoming.id)

          state[otherKey] = state[otherKey].filter((task) => task.id !== incoming.id)

          if (!existing || existing.key !== targetKey) {
            const previousTask = existing?.task ?? null
            state[targetKey].unshift({
              ...(previousTask ?? {}),
              ...incoming,
              subtasks: previousTask?.subtasks ?? [],
              notes: previousTask?.notes ?? [],
            })
          } else {
            state[targetKey][existing.index] = {
              ...state[targetKey][existing.index],
              ...incoming,
              subtasks: state[targetKey][existing.index].subtasks ?? [],
              notes: state[targetKey][existing.index].notes ?? [],
            }
          }

          if (incoming.deletedAt) detachTaskDependencies(state.tasks, [incoming.id])
          state.tasks = sortTasksByCreatedAt(state.tasks)
          state.trashTasks = sortTasksByDeletedAt(state.trashTasks)
        }),

      removeTaskFromRealtime: (id) =>
        set((state) => {
          state.tasks = state.tasks.filter((t) => t.id !== id)
          state.trashTasks = state.trashTasks.filter((t) => t.id !== id)
          detachTaskDependencies(state.tasks, [id])
        }),

      upsertSubtaskFromRealtime: (row) =>
        set((state) => {
          const match = findTaskCollection(state, row.task_id)
          if (!match) return
          const task = match.task
          const subtask = fromSubtaskRow(row)
          const idx = task.subtasks.findIndex((s) => s.id === subtask.id)
          if (idx === -1) task.subtasks.push(subtask)
          else task.subtasks[idx] = { ...task.subtasks[idx], ...subtask }
          task.updatedAt = now()
        }),

      removeSubtaskFromRealtime: (id, taskId) =>
        set((state) => {
          const match = findTaskCollection(state, taskId)
          if (!match) return
          const task = match.task
          task.subtasks = task.subtasks.filter((s) => s.id !== id)
          task.updatedAt = now()
        }),

      upsertNoteFromRealtime: (row) =>
        set((state) => {
          const match = findTaskCollection(state, row.task_id)
          if (!match) return
          const task = match.task
          const note = fromNoteRow(row)
          const idx = task.notes.findIndex((n) => n.id === note.id)
          if (idx === -1) task.notes.unshift(note)
          else task.notes[idx] = { ...task.notes[idx], ...note }
          task.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          task.updatedAt = now()
        }),

      removeNoteFromRealtime: (id, taskId) =>
        set((state) => {
          const match = findTaskCollection(state, taskId)
          if (!match) return
          const task = match.task
          task.notes = task.notes.filter((n) => n.id !== id)
          task.updatedAt = now()
        }),

      getTaskById: (id) => {
        const state = get()
        return state.tasks.find((task) => task.id === id) ?? state.trashTasks.find((task) => task.id === id)
      },
    })),
    {
      name: 'taskflow-tasks',
      storage: createJSONStorage(() => localStorage),
      version: 9,
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
        if (version < 6) {
          s = { ...s, tasks: (s.tasks ?? []).map((t) => ({ ...t, programId: t.programId ?? null })) }
        }
        if (version < 7) {
          s = {
            ...s,
            tasks: (s.tasks ?? []).map((task) => ({ ...task, deletedAt: task.deletedAt ?? null })),
            trashTasks: [],
          }
        }
        if (version < 8) {
          const sanitized = splitDeletedTasks(s?.tasks ?? [], s?.trashTasks ?? [])
          s = { ...s, tasks: sanitized.tasks, trashTasks: sanitized.trashTasks }
        }
        if (version < 9) {
          s = {
            ...s,
            tasks: (s.tasks ?? []).map((task) => ({
              ...task,
              scope: normalizeWorkspaceViewScope(task.scope),
            })),
            trashTasks: (s.trashTasks ?? []).map((task) => ({
              ...task,
              scope: normalizeWorkspaceViewScope(task.scope),
            })),
          }
        }
        return s
      },
    }
  )
)

export default useTaskStore
