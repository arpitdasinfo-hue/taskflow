import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const AUTH_BACKUP_KEY = 'taskflow-auth-backup-v1'

const storeSessionBackup = (session) => {
  if (typeof window === 'undefined') return
  if (!session?.access_token || !session?.refresh_token) {
    window.localStorage.removeItem(AUTH_BACKUP_KEY)
    return
  }
  window.localStorage.setItem(AUTH_BACKUP_KEY, JSON.stringify({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    updatedAt: Date.now(),
  }))
}

const readSessionBackup = () => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(AUTH_BACKUP_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.accessToken || !parsed?.refreshToken) return null
    return parsed
  } catch {
    return null
  }
}

const useAuthStore = create((set, get) => ({
  session: null,
  user:    null,
  loading: true,
  _didInit: false,
  _unsubscribeAuth: null,

  /** Call once on app mount — restores session + subscribes to changes */
  init: async () => {
    if (get()._didInit) return
    set({ _didInit: true })

    let restoredSession = null
    const { data } = await supabase.auth.getSession()
    restoredSession = data?.session ?? null

    if (!restoredSession) {
      const backup = readSessionBackup()
      if (backup) {
        const { data: recovered, error } = await supabase.auth.setSession({
          access_token: backup.accessToken,
          refresh_token: backup.refreshToken,
        })
        if (!error) restoredSession = recovered?.session ?? null
        else storeSessionBackup(null)
      }
    }

    storeSessionBackup(restoredSession)
    set({ session: restoredSession, user: restoredSession?.user ?? null, loading: false })

    const existingUnsub = get()._unsubscribeAuth
    if (existingUnsub) existingUnsub()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      storeSessionBackup(session)
      set({ session, user: session?.user ?? null })
    })

    set({ _unsubscribeAuth: () => authListener.subscription.unsubscribe() })
  },

  /** Send OTP email (signin: existing users only, signup: allow create) */
  signInWithEmail: async (email, mode = 'signin') => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: mode === 'signup',
      },
    })
    return { error }
  },

  /** Verify OTP code entered in-app */
  verifyEmailOtp: async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    return { error }
  },

  /** Sign out */
  signOut: async () => {
    await supabase.auth.signOut()
    storeSessionBackup(null)
    set({ session: null, user: null })
  },
}))

export default useAuthStore
