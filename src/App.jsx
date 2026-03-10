import { useEffect, lazy, Suspense } from 'react'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import TaskDetail from './components/tasks/TaskDetail'
import QuickAdd from './components/tasks/QuickAdd'
import useSettingsStore from './store/useSettingsStore'
import { useTheme } from './hooks/useTheme'

// Lazy-load pages for code-splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Tasks     = lazy(() => import('./pages/Tasks'))
const Today     = lazy(() => import('./pages/Today'))
const Settings  = lazy(() => import('./pages/Settings'))

const PageFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <div
      className="w-8 h-8 rounded-full border-2 animate-spin"
      style={{ borderColor: 'rgba(var(--accent-rgb),0.2)', borderTopColor: 'var(--accent)' }}
    />
  </div>
)

function PageRouter({ page }) {
  return (
    <Suspense fallback={<PageFallback />}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'tasks'     && <Tasks />}
      {page === 'today'     && <Today />}
      {page === 'settings'  && <Settings />}
    </Suspense>
  )
}

export default function App() {
  useTheme() // Initialises CSS variables + auto-rotation on mount

  const activePage     = useSettingsStore((s) => s.activePage)
  const selectedTaskId = useSettingsStore((s) => s.selectedTaskId)

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
