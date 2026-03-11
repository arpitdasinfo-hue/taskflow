import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAuthStore = create((set) => ({
  session: null,
  user:    null,
  loading: true,

  /** Call once on app mount — restores session + subscribes to changes */
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, loading: false })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  /** Send magic link to email */
  signInWithEmail: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error }
  },

  /** Sign out */
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },
}))

export default useAuthStore
