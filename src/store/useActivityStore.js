import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'
import useWorkspaceStore from './useWorkspaceStore'
import useAuthStore from './useAuthStore'

const MAX_ENTRIES = 500

const getSyncContext = () => ({
  workspaceId: useWorkspaceStore.getState().workspaceId,
  userId: useAuthStore.getState().user?.id ?? useAuthStore.getState().session?.user?.id,
})

const toActivityRow = (entry, workspaceId, userId) => ({
  id: entry.id,
  workspace_id: workspaceId,
  task_id: entry.taskId ?? null,
  entity_type: entry.entityType ?? 'task',
  entity_id: entry.entityId,
  entity_title: entry.entityTitle ?? '',
  action: entry.action,
  field: entry.field ?? null,
  old_value: entry.oldValue != null ? entry.oldValue : null,
  new_value: entry.newValue != null ? entry.newValue : null,
  created_by: userId ?? null,
  timestamp: entry.timestamp,
})

const fromActivityRow = (row) => ({
  id: row.id,
  taskId: row.task_id ?? null,
  entityType: row.entity_type ?? 'task',
  entityId: row.entity_id,
  entityTitle: row.entity_title ?? '',
  action: row.action,
  field: row.field ?? null,
  oldValue: row.old_value ?? null,
  newValue: row.new_value ?? null,
  timestamp: row.timestamp,
})

const useActivityStore = create(
  persist(
    immer((set) => ({
      activities: [],
      syncing: false,
      syncError: null,

      loadFromSupabase: async (workspaceId) => {
        set((s) => { s.syncing = true; s.syncError = null })
        try {
          const { data, error } = await supabase
            .from('activity_log')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('timestamp', { ascending: false })
            .limit(MAX_ENTRIES)
          if (error) throw error
          set((s) => {
            s.activities = (data ?? []).map(fromActivityRow)
            s.syncing = false
          })
        } catch (err) {
          set((s) => { s.syncing = false; s.syncError = err.message ?? 'Activity sync failed' })
        }
      },

      logActivity: (entry) => {
        const created = {
          id: nanoid(),
          taskId: entry.taskId ?? null,
          entityType: entry.entityType ?? 'task',
          entityId: entry.entityId,
          entityTitle: entry.entityTitle ?? '',
          action: entry.action,
          field: entry.field ?? null,
          oldValue: entry.oldValue ?? null,
          newValue: entry.newValue ?? null,
          timestamp: new Date().toISOString(),
        }

        set((state) => {
          state.activities.unshift(created)
          if (state.activities.length > MAX_ENTRIES) {
            state.activities = state.activities.slice(0, MAX_ENTRIES)
          }
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('activity_log')
            .insert(toActivityRow(created, workspaceId, userId))
        }
      },

      clearActivity: () => {
        set((state) => { state.activities = [] })
        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('activity_log')
            .delete()
            .eq('workspace_id', workspaceId)
        }
      },
    })),
    {
      name: 'taskflow-activity',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activities: state.activities }),
    }
  )
)

export default useActivityStore
