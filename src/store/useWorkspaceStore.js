import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const pickBestWorkspaceId = async (memberships) => {
  if (!memberships || memberships.length === 0) return null
  if (memberships.length === 1) return memberships[0].workspace_id

  const workspaceIds = memberships.map((m) => m.workspace_id)

  const [programRes, projectRes, taskRes] = await Promise.all([
    supabase.from('programs').select('workspace_id').in('workspace_id', workspaceIds),
    supabase.from('projects').select('workspace_id').in('workspace_id', workspaceIds),
    supabase.from('tasks').select('workspace_id').in('workspace_id', workspaceIds),
  ])

  const score = new Map(workspaceIds.map((id) => [id, 0]))

  ;(programRes.data ?? []).forEach((row) => {
    score.set(row.workspace_id, (score.get(row.workspace_id) ?? 0) + 1)
  })
  ;(projectRes.data ?? []).forEach((row) => {
    score.set(row.workspace_id, (score.get(row.workspace_id) ?? 0) + 2)
  })
  ;(taskRes.data ?? []).forEach((row) => {
    score.set(row.workspace_id, (score.get(row.workspace_id) ?? 0) + 3)
  })

  let bestId = memberships[0].workspace_id
  let bestScore = score.get(bestId) ?? 0

  memberships.forEach((m) => {
    const currentScore = score.get(m.workspace_id) ?? 0
    if (currentScore > bestScore) {
      bestScore = currentScore
      bestId = m.workspace_id
    }
  })

  return bestId
}

const useWorkspaceStore = create((set) => ({
  workspaceId: null,
  loading: false,
  error: '',

  reset: () => set({ workspaceId: null, loading: false, error: '' }),

  loadOrCreateWorkspace: async (userId) => {
    if (!userId) return null

    set({ loading: true, error: '' })

    const { data: memberships, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })

    if (membershipError) {
      set({ loading: false, error: membershipError.message })
      return null
    }

    if ((memberships ?? []).length > 0) {
      const preferredWorkspaceId = await pickBestWorkspaceId(memberships)
      set({ workspaceId: preferredWorkspaceId, loading: false })
      return preferredWorkspaceId
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
