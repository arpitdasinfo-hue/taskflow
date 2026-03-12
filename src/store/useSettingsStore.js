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
      view: 'list',
      activePage: 'dashboard',
      selectedTaskId: null,
      filters: { status: [], priority: [], tags: [] },
      activeProjectId: null,
      activeProgramId: null,
      selectedTaskIds: [],
      sortBy: 'createdAt',
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
      setPage: (page) => set((s) => {
        s.activePage = page
        s.selectedTaskId = null
        s.selectedTaskIds = []
      }),

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
      setActiveProject: (id) => set((s) => {
        s.activeProjectId = id
        s.activeProgramId = null
      }),

      // ── Program filter ────────────────────────────────────────────────
      setActiveProgram: (id) => set((s) => {
        s.activeProgramId = id
        s.activeProjectId = null
      }),

      // ── Bulk selection ─────────────────────────────────────────────────
      toggleTaskSelection: (id) =>
        set((s) => {
          const idx = s.selectedTaskIds.indexOf(id)
          if (idx === -1) s.selectedTaskIds.push(id)
          else s.selectedTaskIds.splice(idx, 1)
        }),

      selectAllTasks: (ids) =>
        set((s) => { s.selectedTaskIds = [...ids] }),

      clearTaskSelection: () =>
        set((s) => { s.selectedTaskIds = [] }),

      // ── Sidebar ───────────────────────────────────────────────────────
      toggleSidebar: () => set((s) => { s.sidebarCollapsed = !s.sidebarCollapsed }),
    })),
    {
      name: 'taskflow-settings',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => {
        const { selectedTaskId: _s1, selectedTaskIds: _s2, ...rest } = state
        return rest
      },
      migrate: (state, version) => {
        let s = state
        if (version < 2) {
          s = { ...s, activeProgramId: null, selectedTaskIds: [] }
        }
        return s
      },
    }
  )
)

export default useSettingsStore
