import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'
import useWorkspaceStore from './useWorkspaceStore'
import useAuthStore from './useAuthStore'

const getSyncContext = () => ({
  workspaceId: useWorkspaceStore.getState().workspaceId,
  userId: useAuthStore.getState().user?.id ?? useAuthStore.getState().session?.user?.id,
})

const toTemplateRow = (tmpl, workspaceId, userId) => ({
  id: tmpl.id,
  workspace_id: workspaceId,
  name: tmpl.name ?? 'Untitled template',
  title: tmpl.title ?? '',
  description: tmpl.description ?? '',
  priority: tmpl.priority ?? 'medium',
  tags: tmpl.tags ?? [],
  project_id: tmpl.projectId ?? null,
  subtasks: tmpl.subtasks ?? [],
  created_by: userId ?? null,
  created_at: tmpl.createdAt ?? new Date().toISOString(),
})

const fromTemplateRow = (row) => ({
  id: row.id,
  name: row.name ?? 'Untitled template',
  title: row.title ?? '',
  description: row.description ?? '',
  priority: row.priority ?? 'medium',
  tags: Array.isArray(row.tags) ? row.tags : [],
  projectId: row.project_id ?? null,
  subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
  createdAt: row.created_at ?? new Date().toISOString(),
})

const useTemplateStore = create(
  persist(
    immer((set, get) => ({
      templates: [],
      syncing: false,
      syncError: null,

      loadFromSupabase: async (workspaceId) => {
        set((s) => { s.syncing = true; s.syncError = null })
        try {
          const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
          if (error) throw error
          set((s) => {
            s.templates = (data ?? []).map(fromTemplateRow)
            s.syncing = false
          })
        } catch (err) {
          set((s) => { s.syncing = false; s.syncError = err.message ?? 'Templates sync failed' })
        }
      },

      addTemplate: (data) => {
        let created
        set((state) => {
          created = {
            id: nanoid(),
            name: data.name ?? 'Untitled template',
            title: data.title ?? '',
            description: data.description ?? '',
            priority: data.priority ?? 'medium',
            tags: data.tags ?? [],
            projectId: data.projectId ?? null,
            subtasks: (data.subtasks ?? []).map((s) => ({ title: typeof s === 'string' ? s : s.title })),
            createdAt: new Date().toISOString(),
          }
          state.templates.unshift(created)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('templates')
            .insert(toTemplateRow(created, workspaceId, userId))
        }
      },

      updateTemplate: (id, data) => {
        set((state) => {
          const t = state.templates.find((t) => t.id === id)
          if (t) Object.assign(t, data)
        })

        const updated = get().templates.find((t) => t.id === id)
        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updated) {
          void supabase
            .from('templates')
            .upsert(toTemplateRow(updated, workspaceId, userId))
        }
      },

      deleteTemplate: (id) => {
        set((state) => {
          state.templates = state.templates.filter((t) => t.id !== id)
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void supabase
            .from('templates')
            .delete()
            .eq('id', id)
        }
      },
    })),
    {
      name: 'taskflow-templates',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ templates: state.templates }),
    }
  )
)

export default useTemplateStore
