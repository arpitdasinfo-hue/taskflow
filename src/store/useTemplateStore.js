import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'

const useTemplateStore = create(
  persist(
    immer((set) => ({
      templates: [],

      addTemplate: (data) =>
        set((state) => {
          state.templates.unshift({
            id: nanoid(),
            name: data.name ?? 'Untitled template',
            title: data.title ?? '',
            description: data.description ?? '',
            priority: data.priority ?? 'medium',
            tags: data.tags ?? [],
            projectId: data.projectId ?? null,
            subtasks: (data.subtasks ?? []).map((s) => ({ title: typeof s === 'string' ? s : s.title })),
            createdAt: new Date().toISOString(),
          })
        }),

      updateTemplate: (id, data) =>
        set((state) => {
          const t = state.templates.find((t) => t.id === id)
          if (t) Object.assign(t, data)
        }),

      deleteTemplate: (id) =>
        set((state) => {
          state.templates = state.templates.filter((t) => t.id !== id)
        }),
    })),
    {
      name: 'taskflow-templates',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useTemplateStore
