import { useEffect, lazy, Suspense, Component, useMemo, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import TaskDetail from './components/tasks/TaskDetail'
import QuickAdd from './components/tasks/QuickAdd'
import useSettingsStore from './store/useSettingsStore'
import useAuthStore from './store/useAuthStore'
import useWorkspaceStore from './store/useWorkspaceStore'
import useProjectStore from './store/useProjectStore'
import useTaskStore from './store/useTaskStore'
import usePlanningStore from './store/usePlanningStore'
import { supabase, subscribeToWorkspaceRealtime } from './lib/supabase'
import { useTheme } from './hooks/useTheme'
import Auth from './pages/Auth'
import ToastContainer from './components/common/Toast'

// Lazy-load pages for code-splitting
const Dashboard        = lazy(() => import('./pages/Dashboard'))
const Tasks            = lazy(() => import('./pages/Tasks'))
const Today            = lazy(() => import('./pages/Today'))
const Settings         = lazy(() => import('./pages/Settings'))
const Projects         = lazy(() => import('./pages/Projects'))
const ProgramDashboard = lazy(() => import('./pages/ProgramDashboard'))
const Timeline         = lazy(() => import('./pages/Timeline'))
const Trash            = lazy(() => import('./pages/Trash'))
const ShareView        = lazy(() => import('./pages/ShareView'))

const PageFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <div
      className="w-8 h-8 rounded-full border-2 animate-spin"
      style={{ borderColor: 'rgba(var(--accent-rgb),0.2)', borderTopColor: 'var(--accent)' }}
    />
  </div>
)

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="text-3xl">⚠️</div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Something went wrong
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-accent px-4 py-2 text-sm"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function PageRouter({ page }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        {page === 'dashboard'          && <Dashboard />}
        {page === 'tasks'              && <Tasks />}
        {page === 'today'              && <Today />}
        {page === 'settings'           && <Settings />}
        {page === 'projects'           && <Projects />}
        {page === 'program-dashboard'  && <ProgramDashboard />}
        {page === 'timeline'           && <Timeline />}
        {page === 'trash'              && <Trash />}
      </Suspense>
    </ErrorBoundary>
  )
}

function PWAUpdateBanner({ needRefresh, onReload, onDismiss }) {
  if (!needRefresh) return null

  return (
    <div className="fixed left-3 right-3 bottom-16 md:bottom-4 z-50">
      <div
        className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ border: '1px solid var(--glass-border)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            New version available
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Refresh to load the latest build.
          </p>
        </div>

        <button onClick={onReload} className="btn-accent px-3 py-1.5 text-xs">
          Refresh
        </button>

        <button
          onClick={onDismiss}
          className="btn-ghost px-2 py-1.5 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

function SyncIssueBanner({ message, onDismiss }) {
  if (!message) return null

  return (
    <div className="fixed left-3 right-3 top-3 md:left-auto md:right-4 md:w-[420px] z-50">
      <div
        className="glass rounded-2xl px-4 py-3 flex items-start gap-3"
        style={{ border: '1px solid rgba(239,68,68,0.35)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: '#fca5a5' }}>
            Cloud Sync Paused
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="btn-ghost px-2 py-1 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default function App() {
  useTheme() // Initialises CSS variables + auto-rotation on mount

  const activePage     = useSettingsStore((s) => s.activePage)
  const selectedTaskId = useSettingsStore((s) => s.selectedTaskId)
  const themeIndex     = useSettingsStore((s) => s.themeIndex)
  const themeLastChanged = useSettingsStore((s) => s.themeLastChanged)
  const themeMode      = useSettingsStore((s) => s.themeMode)
  const themeRotationDays = useSettingsStore((s) => s.themeRotationDays)
  const contrastMode   = useSettingsStore((s) => s.contrastMode)
  const uiDensity      = useSettingsStore((s) => s.uiDensity)
  const hydrateThemeFromRemote = useSettingsStore((s) => s.hydrateThemeFromRemote)
  const session        = useAuthStore((s) => s.session)
  const user           = useAuthStore((s) => s.user)
  const loading        = useAuthStore((s) => s.loading)
  const init           = useAuthStore((s) => s.init)
  const loadOrCreateWorkspace = useWorkspaceStore((s) => s.loadOrCreateWorkspace)
  const resetWorkspace = useWorkspaceStore((s) => s.reset)
  const workspaceError = useWorkspaceStore((s) => s.error)
  const loadProjectsFromSupabase = useProjectStore((s) => s.loadFromSupabase)
  const projectSyncError = useProjectStore((s) => s.syncError)
  const clearProjectSyncError = useProjectStore((s) => s.clearSyncError)
  const loadTasksFromSupabase = useTaskStore((s) => s.loadFromSupabase)
  const taskSyncError = useTaskStore((s) => s.syncError)
  const clearTaskSyncError = useTaskStore((s) => s.clearSyncError)
  const loadPlanningFromSupabase = usePlanningStore((s) => s.loadFromSupabase)
  const planningSyncError = usePlanningStore((s) => s.syncError)
  const clearPlanningSyncError = usePlanningStore((s) => s.clearSyncError)
  const resetPlanning = usePlanningStore((s) => s.reset)
  const [syncReady, setSyncReady] = useState(false)
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateServiceWorkerRef = useRef(() => {})
  const themeSyncTimerRef = useRef(null)
  const lastAppliedRemoteThemeRef = useRef('')

  const themeSyncPayload = useMemo(() => ({
    themeIndex,
    themeLastChanged,
    themeMode,
    themeRotationDays,
    contrastMode,
    uiDensity,
  }), [
    themeIndex,
    themeLastChanged,
    themeMode,
    themeRotationDays,
    contrastMode,
    uiDensity,
  ])

  const themeSyncPayloadJson = useMemo(
    () => JSON.stringify(themeSyncPayload),
    [themeSyncPayload]
  )

  const remoteThemePayloadJson = useMemo(
    () => JSON.stringify(user?.user_metadata?.taskflow_theme_preferences ?? null),
    [user?.user_metadata]
  )

  const shareToken = window.location.pathname.startsWith('/share/')
    ? window.location.pathname.split('/share/')[1]
    : ''
  const syncIssueMessage = workspaceError || taskSyncError || projectSyncError || planningSyncError

  useEffect(() => { init() }, [init])

  useEffect(() => {
    const updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => {},
      onRegisterError: () => {},
    })

    updateServiceWorkerRef.current = updateServiceWorker
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined

    const syncNeedRefreshState = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        const waitingWorker = registration?.waiting
        if (!waitingWorker) setNeedRefresh(false)
      } catch {
        // Ignore service worker inspection failures and keep the last known UI state.
      }
    }

    const handleControllerChange = () => {
      setNeedRefresh(false)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncNeedRefreshState()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    window.addEventListener('focus', syncNeedRefreshState)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    void syncNeedRefreshState()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      window.removeEventListener('focus', syncNeedRefreshState)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => () => {
    if (themeSyncTimerRef.current) clearTimeout(themeSyncTimerRef.current)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      lastAppliedRemoteThemeRef.current = ''
      return
    }

    if (remoteThemePayloadJson === lastAppliedRemoteThemeRef.current) return

    const remoteTheme = user?.user_metadata?.taskflow_theme_preferences ?? null
    if (remoteTheme) {
      hydrateThemeFromRemote(remoteTheme)
    }

    lastAppliedRemoteThemeRef.current = remoteThemePayloadJson
  }, [user?.id, user?.user_metadata, remoteThemePayloadJson, hydrateThemeFromRemote])

  useEffect(() => {
    if (!session || !user?.id) return
    if (themeSyncPayloadJson === remoteThemePayloadJson) return

    if (themeSyncTimerRef.current) clearTimeout(themeSyncTimerRef.current)
    themeSyncTimerRef.current = setTimeout(async () => {
      const latestUser = useAuthStore.getState().user
      const latestRemoteJson = JSON.stringify(latestUser?.user_metadata?.taskflow_theme_preferences ?? null)
      if (latestRemoteJson === themeSyncPayloadJson) return

      const { error } = await supabase.auth.updateUser({
        data: {
          ...(latestUser?.user_metadata ?? {}),
          taskflow_theme_preferences: themeSyncPayload,
        },
      })

      if (!error) {
        lastAppliedRemoteThemeRef.current = themeSyncPayloadJson
      }
    }, 450)

    return () => {
      if (themeSyncTimerRef.current) clearTimeout(themeSyncTimerRef.current)
    }
  }, [session, user?.id, remoteThemePayloadJson, themeSyncPayload, themeSyncPayloadJson])

  useEffect(() => {
    let cancelled = false
    let channel = null
    let reloadTimer = null

    const scheduleTaskReload = (workspaceId) => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        void useTaskStore.getState().loadFromSupabase(workspaceId)
      }, 280)
    }

    const scheduleProjectReload = (workspaceId) => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        void useProjectStore.getState().loadFromSupabase(workspaceId)
      }, 280)
    }

    const bootWorkspace = async () => {
      if (!session || !user?.id) {
        setSyncReady(false)
        resetWorkspace()
        resetPlanning()
        return
      }

      setSyncReady(false)
      const workspaceId = await loadOrCreateWorkspace(user.id)

      if (!workspaceId || cancelled) {
        if (!cancelled) setSyncReady(true)
        return
      }

      await Promise.all([
        loadProjectsFromSupabase(workspaceId),
        loadTasksFromSupabase(workspaceId),
        loadPlanningFromSupabase(workspaceId),
      ])

      if (cancelled) return

      channel = subscribeToWorkspaceRealtime(workspaceId, {
        onProgram: (payload) => {
          const projectStore = useProjectStore.getState()
          if (payload.eventType === 'DELETE') projectStore.removeProgramFromRealtime(payload.old.id)
          else projectStore.upsertProgramFromRealtime(payload.new)
        },
        onProject: (payload) => {
          const projectStore = useProjectStore.getState()
          if (payload.eventType === 'DELETE') projectStore.removeProjectFromRealtime(payload.old.id)
          else projectStore.upsertProjectFromRealtime(payload.new)
        },
        onMilestone: (payload) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new
          const hasProject = useProjectStore.getState().projects.some((p) => p.id === row.project_id)
          if (!hasProject) {
            scheduleProjectReload(workspaceId)
            return
          }

          const projectStore = useProjectStore.getState()
          if (payload.eventType === 'DELETE') projectStore.removeMilestoneFromRealtime(payload.old.id)
          else projectStore.upsertMilestoneFromRealtime(payload.new)
        },
        onTask: (payload) => {
          const taskStore = useTaskStore.getState()
          if (payload.eventType === 'DELETE') taskStore.removeTaskFromRealtime(payload.old.id)
          else taskStore.upsertTaskFromRealtime(payload.new)
        },
        onTaskCommitment: (payload) => {
          const planningStore = usePlanningStore.getState()
          if (payload.eventType === 'DELETE') planningStore.removeCommitmentFromRealtime(payload.old.id)
          else planningStore.upsertCommitmentFromRealtime(payload.new)
        },
        onSubtask: (payload) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new
          const hasTask = Boolean(useTaskStore.getState().getTaskById(row.task_id))
          if (!hasTask) {
            scheduleTaskReload(workspaceId)
            return
          }

          const taskStore = useTaskStore.getState()
          if (payload.eventType === 'DELETE') taskStore.removeSubtaskFromRealtime(payload.old.id, payload.old.task_id)
          else taskStore.upsertSubtaskFromRealtime(payload.new)
        },
        onNote: (payload) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new
          const hasTask = Boolean(useTaskStore.getState().getTaskById(row.task_id))
          if (!hasTask) {
            scheduleTaskReload(workspaceId)
            return
          }

          const taskStore = useTaskStore.getState()
          if (payload.eventType === 'DELETE') taskStore.removeNoteFromRealtime(payload.old.id, payload.old.task_id)
          else taskStore.upsertNoteFromRealtime(payload.new)
        },
      })

      setSyncReady(true)
    }

    void bootWorkspace()

    return () => {
      cancelled = true
      if (reloadTimer) clearTimeout(reloadTimer)
      if (channel) supabase.removeChannel(channel)
    }
  }, [
    session,
    user?.id,
    loadOrCreateWorkspace,
    loadProjectsFromSupabase,
    loadTasksFromSupabase,
    loadPlanningFromSupabase,
    resetWorkspace,
    resetPlanning,
  ])

  if (shareToken) {
    return (
      <Suspense fallback={<PageFallback />}>
        <ShareView token={shareToken} />
      </Suspense>
    )
  }

  // Show spinner while restoring session
  if (loading || (session && !syncReady)) {
    return (
      <div className="flex h-full min-h-dvh items-center justify-center"
        style={{ background: 'var(--bg-gradient)' }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(var(--accent-rgb),0.2)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    )
  }

  // Show login page if not authenticated
  if (!session) {
    return <Auth />
  }

  return (
    <div className="flex h-full min-h-dvh">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-[60px] md:pb-0 safe-top">
        <PageRouter page={activePage} />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Task detail slide-over / bottom sheet */}
      {selectedTaskId && <TaskDetail />}

      {/* Floating action button */}
      {activePage !== 'trash' && <QuickAdd />}

      <SyncIssueBanner
        message={syncIssueMessage}
        onDismiss={() => {
          useWorkspaceStore.setState({ error: '' })
          clearTaskSyncError()
          clearProjectSyncError()
          clearPlanningSyncError()
        }}
      />

      <ToastContainer />

      <PWAUpdateBanner
        needRefresh={needRefresh}
        onReload={() => {
          setNeedRefresh(false)
          updateServiceWorkerRef.current(true)
        }}
        onDismiss={() => {
          setNeedRefresh(false)
        }}
      />
    </div>
  )
}
