import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'

const MAX_ENTRIES = 500

const useActivityStore = create(
  persist(
    immer((set) => ({
      activities: [],

      logActivity: (entry) =>
        set((state) => {
          state.activities.unshift({
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
          })
          // FIFO eviction
          if (state.activities.length > MAX_ENTRIES) {
            state.activities = state.activities.slice(0, MAX_ENTRIES)
          }
        }),

      clearActivity: () => set((state) => { state.activities = [] }),
    })),
    {
      name: 'taskflow-activity',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useActivityStore
