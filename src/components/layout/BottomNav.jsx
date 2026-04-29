import { memo, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import useSettingsStore from '../../store/useSettingsStore'
import { useTaskStats } from '../../hooks/useFilteredTasks'
import useWorkspaceScopedData from '../../hooks/useWorkspaceScopedData'
import {
  MOBILE_OVERFLOW_NAV_IDS,
  MOBILE_PRIMARY_NAV_IDS,
  getNavItem,
} from './navigationConfig'
import { createDrawerVariants, createOverlayVariants } from '../../lib/motion'

void motion

const BottomNav = memo(function BottomNav() {
  const activePage = useSettingsStore((s) => s.activePage)
  const setPage    = useSettingsStore((s) => s.setPage)
  const setActiveProject = useSettingsStore((s) => s.setActiveProject)
  const setActiveProgram = useSettingsStore((s) => s.setActiveProgram)
  const [showMore, setShowMore] = useState(false)
  const reduceMotion = useReducedMotion()
  const { overdue } = useTaskStats()
  const { trashTasks } = useWorkspaceScopedData()
  const primaryItems = useMemo(() => MOBILE_PRIMARY_NAV_IDS.map((id) => getNavItem(id)).filter(Boolean), [])
  const overflowItems = useMemo(() => MOBILE_OVERFLOW_NAV_IDS.map((id) => getNavItem(id)).filter(Boolean), [])
  const overlayVariants = useMemo(() => createOverlayVariants(reduceMotion), [reduceMotion])
  const drawerVariants = useMemo(() => createDrawerVariants(reduceMotion, 'bottom'), [reduceMotion])

  const isItemActive = (id) => {
    const isDashboardRoute = activePage === 'dashboard' || activePage === 'program-dashboard'
    if (id === 'projects') return activePage === 'projects'
    if (id === 'dashboard') return isDashboardRoute
    return activePage === id
  }

  const handleNavigate = (id) => {
    setShowMore(false)
    setPage(id)
    if (id === 'projects') {
      setActiveProject(null)
      setActiveProgram(null)
    }
  }

  const moreIsActive = showMore || overflowItems.some((item) => isItemActive(item.id))
  const moreHasNotification = trashTasks.length > 0
  const todayHasNotification = overdue > 0

  const renderNavButton = ({ id, label, icon: Icon, isActive, hasNotification = false, onClick }) => (
    <button
      key={id}
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 relative no-select"
      style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
      aria-pressed={isActive}
    >
      {isActive && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      )}

      <div className="relative">
        <Icon size={18} strokeWidth={isActive ? 2.5 : 1.75} />
        {hasNotification && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-red-900" />
        )}
      </div>

      <span
        className="text-[9px] font-medium leading-none truncate max-w-full"
        style={isActive ? { color: 'var(--accent)' } : {}}
      >
        {label}
      </span>
    </button>
  )

  return (
    <>
      <AnimatePresence>
        {showMore && (
          <>
            <motion.button
              type="button"
              aria-label="Close more navigation"
              className="md:hidden fixed inset-0 bottom-[60px] z-[29]"
              style={{ background: 'rgba(4,8,18,0.44)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
              onClick={() => setShowMore(false)}
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            />
            <motion.div
              className="md:hidden fixed left-3 right-3 bottom-[72px] z-[31] rounded-[28px] p-3"
              style={{
                background: 'rgba(10,0,21,0.94)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.34)',
              }}
              variants={drawerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
                    More
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Secondary pages live here to keep the main nav clean.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {overflowItems.map(({ id, label, icon: Icon }) => {
                  const isActive = isItemActive(id)
                  const badgeCount = id === 'trash' ? trashTasks.length : 0
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleNavigate(id)}
                      className="rounded-2xl px-3 py-3 text-left transition-colors"
                      style={isActive
                        ? { background: 'rgba(var(--accent-rgb),0.14)', border: '1px solid rgba(var(--accent-rgb),0.22)' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Icon size={16} style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }} />
                        {badgeCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)' }}>
                            {badgeCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 text-xs font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {label}
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 safe-bottom"
        style={{
          background: 'rgba(10,0,21,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--glass-border)',
        }}
      >
        <div className="grid h-[60px] grid-cols-6 px-1">
          {primaryItems.map((item) => renderNavButton({
            ...item,
            isActive: isItemActive(item.id),
            hasNotification: item.id === 'today' && todayHasNotification,
            onClick: () => handleNavigate(item.id),
          }))}
          {renderNavButton({
            id: 'more',
            label: 'More',
            icon: MoreHorizontal,
            isActive: moreIsActive,
            hasNotification: moreHasNotification,
            onClick: () => setShowMore((current) => !current),
          })}
        </div>
      </nav>
    </>
  )
})

export default BottomNav
