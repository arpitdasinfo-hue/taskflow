import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { THEMES, THEME_ROTATION_DAYS } from '../themes'

const applyThemeToDom = (theme) => {
  const r = document.documentElement.style
  r.setProperty('--accent', theme.accent)
  r.setProperty('--accent-rgb', theme.accentRgb)
  r.setProperty('--accent-dim', theme.accentDim)
  r.setProperty('--accent-dark', theme.accentDark)
  r.setProperty('--glass-bg', theme.glassBg)
  r.setProperty('--glass-bg-hover', theme.glassBgHover)
  r.setProperty('--glass-border', theme.glassBorder)
  r.setProperty('--glass-highlight', theme.glassHighlight ?? 'rgba(255,255,255,0.08)')
  r.setProperty('--shadow-rgb', theme.shadowRgb ?? theme.accentRgb)
  r.setProperty('--bg-gradient', theme.gradient)
  r.setProperty('--text-primary', theme.textPrimary)
  r.setProperty('--text-secondary', theme.textSecondary)
  // Update PWA theme-color meta
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.accent)
}

const daysSince = (iso) => {
  const ms = Date.now() - new Date(iso).getTime()
  return ms / (1000 * 60 * 60 * 24)
}

const useSettingsStore = create(
  persist(
    immer((set, get) => ({
      themeIndex: 0,
      themeLastChanged: new Date().toISOString(),
      view: 'list',                // 'list' | 'board'
      activePage: 'dashboard',     // 'dashboard' | 'tasks' | 'today' | 'settings'
      selectedTaskId: null,
      filters: { status: [], priority: [], tags: [] },
      activeProjectId: null,       // null = all projects
      sortBy: 'createdAt',         // 'createdAt' | 'dueDate' | 'priority' | 'updatedAt'
      sidebarCollapsed: false,

      // ── Theme ─────────────────────────────────────────────────────────
      initTheme: () => {
        const { themeIndex, themeLastChanged } = get()
        let idx = themeIndex
        if (daysSince(themeLastChanged) >= THEME_ROTATION_DAYS) {
          idx = (themeIndex + 1) % THEMES.length
          set((s) => { s.themeIndex = idx; s.themeLastChanged = new Date().toISOString() })
        }
        applyThemeToDom(THEMES[idx])
      },

      setTheme: (index) =>
        set((state) => {
          state.themeIndex = index
          state.themeLastChanged = new Date().toISOString()
          applyThemeToDom(THEMES[index])
        }),

      // ── Navigation ────────────────────────────────────────────────────
      setPage: (page) => set((s) => { s.activePage = page; s.selectedTaskId = null }),

      // ── Task selection ─────────────────────────────────────────────────
      selectTask: (id) => set((s) => { s.selectedTaskId = id }),
      closeTask: ()   => set((s) => { s.selectedTaskId = null }),

      // ── View ──────────────────────────────────────────────────────────
      setView: (v) => set((s) => { s.view = v }),
      toggleView: ()  => set((s) => { s.view = s.view === 'list' ? 'board' : 'list' }),

      // ── Filters ───────────────────────────────────────────────────────
      toggleFilter: (type, value) =>
        set((s) => {
          const arr = s.filters[type]
          const idx = arr.indexOf(value)
          if (idx === -1) arr.push(value)
          else arr.splice(idx, 1)
        }),

      clearFilters: () =>
        set((s) => { s.filters = { status: [], priority: [], tags: [] } }),

      setSortBy: (v) => set((s) => { s.sortBy = v }),

      // ── Project filter ────────────────────────────────────────────────
      setActiveProject: (id) => set((s) => { s.activeProjectId = id; s.activePage = 'tasks' }),

      // ── Sidebar ───────────────────────────────────────────────────────
      toggleSidebar: () => set((s) => { s.sidebarCollapsed = !s.sidebarCollapsed }),
    })),
    {
      name: 'taskflow-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Don't persist selectedTaskId — always start fresh
      partialize: (state) => {
        const { selectedTaskId: _skip, ...rest } = state
        return rest
      },
    }
  )
)

export default useSettingsStore
