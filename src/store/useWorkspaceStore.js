import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useWorkspaceStore = create((set) => ({
  workspaceId: null,
  loading: false,
  error: '',

  reset: () => set({ workspaceId: null, loading: false, error: '' }),

  loadOrCreateWorkspace: async (userId) => {
    if (!userId) return null

    set({ loading: true, error: '' })

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (membershipError) {
      set({ loading: false, error: membershipError.message })
      return null
    }

    if (membership?.workspace_id) {
      set({ workspaceId: membership.workspace_id, loading: false })
      return membership.workspace_id
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({ name: 'My Workspace', created_by: userId })
      .select('id')
      .single()

    if (workspaceError || !workspace?.id) {
      set({ loading: false, error: workspaceError?.message || 'Unable to create workspace.' })
      return null
    }

    const { error: memberInsertError } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: workspace.id, user_id: userId, role: 'owner' })

    if (memberInsertError) {
      set({ loading: false, error: memberInsertError.message })
      return null
    }

    set({ workspaceId: workspace.id, loading: false })
    return workspace.id
  },
}))

export default useWorkspaceStore
