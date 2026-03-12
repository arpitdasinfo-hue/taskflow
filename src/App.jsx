import { useEffect, lazy, Suspense, Component, useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import TaskDetail from './components/tasks/TaskDetail'
import QuickAdd from './components/tasks/QuickAdd'
import useSettingsStore from './store/useSettingsStore'
import useAuthStore from './store/useAuthStore'
import useWorkspaceStore from './store/useWorkspaceStore'
import useProjectStore from './store/useProjectStore'
import useTaskStore from './store/useTaskStore'
import { supabase, subscribeToWorkspaceRealtime } from './lib/supabase'
import { useTheme } from './hooks/useTheme'
import Auth from './pages/Auth'

// Lazy-load pages for code-splitting
const Dashboard        = lazy(() => import('./pages/Dashboard'))
const Tasks            = lazy(() => import('./pages/Tasks'))
const Today            = lazy(() => import('./pages/Today'))
const Settings         = lazy(() => import('./pages/Settings'))
const Projects         = lazy(() => import('./pages/Projects'))
const ProgramDashboard = lazy(() => import('./pages/ProgramDashboard'))
const Timeline         = lazy(() => import('./pages/Timeline'))
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
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  useTheme() // Initialises CSS variables + auto-rotation on mount

  const activePage     = useSettingsStore((s) => s.activePage)
  const selectedTaskId = useSettingsStore((s) => s.selectedTaskId)
  const session        = useAuthStore((s) => s.session)
  const user           = useAuthStore((s) => s.user)
  const loading        = useAuthStore((s) => s.loading)
  const init           = useAuthStore((s) => s.init)
  const loadOrCreateWorkspace = useWorkspaceStore((s) => s.loadOrCreateWorkspace)
  const resetWorkspace = useWorkspaceStore((s) => s.reset)
  const loadProjectsFromSupabase = useProjectStore((s) => s.loadFromSupabase)
  const loadTasksFromSupabase = useTaskStore((s) => s.loadFromSupabase)
  const [syncReady, setSyncReady] = useState(false)

  const shareToken = window.location.pathname.startsWith('/share/')
    ? window.location.pathname.split('/share/')[1]
    : ''

  useEffect(() => { init() }, [init])

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
        onSubtask: (payload) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new
          const hasTask = useTaskStore.getState().tasks.some((t) => t.id === row.task_id)
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
          const hasTask = useTaskStore.getState().tasks.some((t) => t.id === row.task_id)
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
  }, [session, user?.id, loadOrCreateWorkspace, loadProjectsFromSupabase, loadTasksFromSupabase, resetWorkspace])

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
      <QuickAdd />
    </div>
  )
}
