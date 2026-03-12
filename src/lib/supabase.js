import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function subscribeToWorkspaceRealtime(workspaceId, handlers = {}) {
  const channel = supabase.channel(`workspace:${workspaceId}:${Date.now()}`)

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'programs', filter: `workspace_id=eq.${workspaceId}` },
    (payload) => handlers.onProgram?.(payload)
  )

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'projects', filter: `workspace_id=eq.${workspaceId}` },
    (payload) => handlers.onProject?.(payload)
  )

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'milestones' },
    (payload) => handlers.onMilestone?.(payload)
  )

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` },
    (payload) => handlers.onTask?.(payload)
  )

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'subtasks' },
    (payload) => handlers.onSubtask?.(payload)
  )

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'notes' },
    (payload) => handlers.onNote?.(payload)
  )

  channel.subscribe()
  return channel
}
