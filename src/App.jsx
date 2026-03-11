import { useEffect, lazy, Suspense, Component } from 'react'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import TaskDetail from './components/tasks/TaskDetail'
import QuickAdd from './components/tasks/QuickAdd'
import useSettingsStore from './store/useSettingsStore'
import useAuthStore from './store/useAuthStore'
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
  const loading        = useAuthStore((s) => s.loading)
  const init           = useAuthStore((s) => s.init)

  useEffect(() => { init() }, [init])

  // Show spinner while restoring session
  if (loading) {
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
