import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { THEMES, THEME_ROTATION_DAYS } from '../themes'

const DEFAULT_GANTT_CONFIG = {
  zoom: 'month',
  viewMode: 'roadmap',
  searchQuery: '',
  customRangeStart: null,
  customRangeEnd: null,
  showDependencies: true,
  onlyDelayed: false,
  onlyCritical: false,
  onlyDependencyRisk: false,
  filteredProgramIds: [],
  filteredProjectIds: [],
  filteredSubProjectIds: [],
  expandedProjectIds: [],
  rangeStart: null,
  rangeEnd: null,
  updatedAt: null,
}

const daysSince = (iso) => {
  const ms = Date.now() - new Date(iso).getTime()
  return ms / (1000 * 60 * 60 * 24)
}

const withRaisedAlpha = (rgbaValue, delta) => {
  const match = /rgba?\(([^)]+)\)/.exec(rgbaValue || '')
  if (!match) return rgbaValue
  const parts = match[1].split(',').map((part) => part.trim())
  if (parts.length < 4) return rgbaValue
  const alpha = Number(parts[3])
  if (Number.isNaN(alpha)) return rgbaValue
  const nextAlpha = Math.max(0, Math.min(1, alpha + delta))
  return `rgba(${parts[0]},${parts[1]},${parts[2]},${nextAlpha.toFixed(2)})`
}

const resolveThemeTokens = (theme, contrastMode) => {
  if (contrastMode !== 'high') return theme

  return {
    ...theme,
    accentDim: `rgba(${theme.accentRgb},0.22)`,
    glassBg: theme.glassBgHover ?? theme.glassBg,
    glassBgHover: withRaisedAlpha(theme.glassBgHover ?? theme.glassBg, 0.1),
    glassBorder: withRaisedAlpha(theme.glassBorder, 0.18),
    textSecondary: theme.textPrimary,
  }
}

const applyThemeToDom = (theme, { contrastMode = 'standard', uiDensity = 'comfortable' } = {}) => {
  if (typeof document === 'undefined') return

  const tokens = resolveThemeTokens(theme, contrastMode)
  const root = document.documentElement
  const style = root.style

  style.setProperty('--accent', tokens.accent)
  style.setProperty('--accent-rgb', tokens.accentRgb)
  style.setProperty('--accent-dim', tokens.accentDim)
  style.setProperty('--accent-dark', tokens.accentDark)
  style.setProperty('--glass-bg', tokens.glassBg)
  style.setProperty('--glass-bg-hover', tokens.glassBgHover)
  style.setProperty('--glass-border', tokens.glassBorder)
  style.setProperty('--glass-highlight', tokens.glassHighlight ?? 'rgba(255,255,255,0.08)')
  style.setProperty('--shadow-rgb', tokens.shadowRgb ?? tokens.accentRgb)
  style.setProperty('--bg-gradient', tokens.gradient)
  style.setProperty('--text-primary', tokens.textPrimary)
  style.setProperty('--text-secondary', tokens.textSecondary)
  style.setProperty('--density-multiplier', uiDensity === 'compact' ? '0.9' : '1')
  root.dataset.contrast = contrastMode
  root.dataset.density = uiDensity

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', tokens.accent)
}

const normalizeThemePreferences = (raw) => {
  const candidate = raw && typeof raw === 'object' ? raw : {}
  const nextThemeIndex = Number(candidate.themeIndex)
  const nextRotationDays = Number(candidate.themeRotationDays)

  return {
    themeIndex: Number.isFinite(nextThemeIndex)
      ? Math.max(0, Math.min(THEMES.length - 1, Math.round(nextThemeIndex)))
      : 0,
    themeLastChanged: candidate.themeLastChanged || new Date().toISOString(),
    themeMode: candidate.themeMode === 'manual' ? 'manual' : 'auto',
    themeRotationDays: Number.isFinite(nextRotationDays) && nextRotationDays > 0
      ? Math.round(nextRotationDays)
      : THEME_ROTATION_DAYS,
    contrastMode: candidate.contrastMode === 'high' ? 'high' : 'standard',
    uiDensity: candidate.uiDensity === 'compact' ? 'compact' : 'comfortable',
  }
}

const useSettingsStore = create(
  persist(
    immer((set, get) => ({
      themeIndex: 0,
      themeLastChanged: new Date().toISOString(),
      themeMode: 'auto',
      themeRotationDays: THEME_ROTATION_DAYS,
      contrastMode: 'standard',
      uiDensity: 'comfortable',
      view: 'list',
      activePage: 'dashboard',
      selectedTaskId: null,
      filters: { status: [], priority: [], tags: [] },
      activeProjectId: null,
      activeProgramId: null,
      workspaceViewScope: 'professional',
      projectsViewMode: 'portfolio',
      selectedTaskIds: [],
      sortBy: 'createdAt',
      sidebarCollapsed: false,
      ganttConfig: DEFAULT_GANTT_CONFIG,
      savedGanttViews: [],

      applyCurrentTheme: () => {
        const { themeIndex, contrastMode, uiDensity } = get()
        applyThemeToDom(THEMES[themeIndex] ?? THEMES[0], { contrastMode, uiDensity })
      },

      getThemeSyncPayload: () => {
        const state = get()
        return normalizeThemePreferences({
          themeIndex: state.themeIndex,
          themeLastChanged: state.themeLastChanged,
          themeMode: state.themeMode,
          themeRotationDays: state.themeRotationDays,
          contrastMode: state.contrastMode,
          uiDensity: state.uiDensity,
        })
      },

      hydrateThemeFromRemote: (raw) => {
        const next = normalizeThemePreferences(raw)
        set((state) => {
          state.themeIndex = next.themeIndex
          state.themeLastChanged = next.themeLastChanged
          state.themeMode = next.themeMode
          state.themeRotationDays = next.themeRotationDays
          state.contrastMode = next.contrastMode
          state.uiDensity = next.uiDensity
          applyThemeToDom(THEMES[state.themeIndex] ?? THEMES[0], {
            contrastMode: state.contrastMode,
            uiDensity: state.uiDensity,
          })
        })
      },

      // ── Theme ─────────────────────────────────────────────────────────
      initTheme: () => {
        const {
          themeIndex,
          themeLastChanged,
          themeMode,
          themeRotationDays,
          contrastMode,
          uiDensity,
        } = get()
        let idx = themeIndex
        if (themeMode === 'auto' && daysSince(themeLastChanged) >= themeRotationDays) {
          idx = (themeIndex + 1) % THEMES.length
          set((s) => { s.themeIndex = idx; s.themeLastChanged = new Date().toISOString() })
        }
        applyThemeToDom(THEMES[idx] ?? THEMES[0], { contrastMode, uiDensity })
      },

      setTheme: (index) =>
        set((state) => {
          state.themeIndex = Math.max(0, Math.min(THEMES.length - 1, index))
          state.themeLastChanged = new Date().toISOString()
          applyThemeToDom(THEMES[state.themeIndex] ?? THEMES[0], {
            contrastMode: state.contrastMode,
            uiDensity: state.uiDensity,
          })
        }),

      setThemeMode: (mode) =>
        set((state) => {
          state.themeMode = mode === 'manual' ? 'manual' : 'auto'
          applyThemeToDom(THEMES[state.themeIndex] ?? THEMES[0], {
            contrastMode: state.contrastMode,
            uiDensity: state.uiDensity,
          })
        }),

      setThemeRotationDays: (days) =>
        set((state) => {
          const nextDays = Number(days)
          state.themeRotationDays = Number.isFinite(nextDays) && nextDays > 0
            ? Math.round(nextDays)
            : THEME_ROTATION_DAYS
        }),

      setContrastMode: (mode) =>
        set((state) => {
          state.contrastMode = mode === 'high' ? 'high' : 'standard'
          applyThemeToDom(THEMES[state.themeIndex] ?? THEMES[0], {
            contrastMode: state.contrastMode,
            uiDensity: state.uiDensity,
          })
        }),

      setUiDensity: (mode) =>
        set((state) => {
          state.uiDensity = mode === 'compact' ? 'compact' : 'comfortable'
          applyThemeToDom(THEMES[state.themeIndex] ?? THEMES[0], {
            contrastMode: state.contrastMode,
            uiDensity: state.uiDensity,
          })
        }),

      setGanttConfig: (patch) =>
        set((state) => {
          state.ganttConfig = {
            ...state.ganttConfig,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        }),

      resetGanttConfig: () =>
        set((state) => { state.ganttConfig = { ...DEFAULT_GANTT_CONFIG } }),

      saveGanttView: ({ id = null, name, config }) => {
        const normalizedName = String(name || '').trim() || 'Saved view'
        const nextView = {
          id: id ?? nanoid(),
          name: normalizedName,
          config: {
            ...DEFAULT_GANTT_CONFIG,
            ...(config ?? {}),
          },
          updatedAt: new Date().toISOString(),
        }

        set((state) => {
          const existingIndex = state.savedGanttViews.findIndex((view) => view.id === nextView.id)
          if (existingIndex === -1) state.savedGanttViews.unshift(nextView)
          else state.savedGanttViews[existingIndex] = nextView
        })

        return nextView
      },

      deleteGanttView: (id) =>
        set((state) => {
          state.savedGanttViews = state.savedGanttViews.filter((view) => view.id !== id)
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
      setView: (v) => set((s) => {
        s.view = ['list', 'table', 'board'].includes(v) ? v : 'list'
      }),
      toggleView: ()  => set((s) => {
        const order = ['list', 'table', 'board']
        const currentIndex = order.indexOf(s.view)
        s.view = order[(currentIndex + 1) % order.length]
      }),

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

      setWorkspaceViewScope: (scope) => set((s) => {
        s.workspaceViewScope = scope === 'personal' ? 'personal' : 'professional'
        s.activeProgramId = null
        s.activeProjectId = null
        s.selectedTaskId = null
        s.selectedTaskIds = []
        s.ganttConfig = {
          ...s.ganttConfig,
          filteredProgramIds: [],
          filteredProjectIds: [],
          filteredSubProjectIds: [],
          expandedProjectIds: [],
        }
      }),

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

      setProjectsViewMode: (mode) => set((s) => {
        s.projectsViewMode = mode === 'execution' ? 'execution' : 'portfolio'
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
      version: 10,
      partialize: (state) => {
        const { selectedTaskId: _s1, selectedTaskIds: _s2, ...rest } = state
        return rest
      },
      migrate: (state, version) => {
        let s = state || {}
        if (version < 2) {
          s = { ...s, activeProgramId: null, selectedTaskIds: [] }
        }
        if (version < 3) {
          s = {
            ...s,
            themeMode: s?.themeMode ?? 'auto',
            themeRotationDays: s?.themeRotationDays ?? THEME_ROTATION_DAYS,
            contrastMode: s?.contrastMode ?? 'standard',
            uiDensity: s?.uiDensity ?? 'comfortable',
            ganttConfig: s?.ganttConfig ?? { ...DEFAULT_GANTT_CONFIG },
          }
        }
        if (version < 4) {
          s = {
            ...s,
            ganttConfig: {
              ...DEFAULT_GANTT_CONFIG,
              ...(s?.ganttConfig ?? {}),
              viewMode: s?.ganttConfig?.viewMode ?? 'roadmap',
            },
          }
        }
        if (version < 5) {
          s = {
            ...s,
            savedGanttViews: Array.isArray(s?.savedGanttViews) ? s.savedGanttViews : [],
            ganttConfig: {
              ...DEFAULT_GANTT_CONFIG,
              ...(s?.ganttConfig ?? {}),
              viewMode: s?.ganttConfig?.viewMode ?? 'roadmap',
            },
          }
        }
        if (version < 9) {
          s = {
            ...s,
            view: ['list', 'table', 'board'].includes(s?.view) ? s.view : 'list',
          }
        }
        if (version < 10) {
          s = {
            ...s,
            workspaceViewScope: s?.workspaceViewScope === 'personal' ? 'personal' : 'professional',
          }
        }
        if (version < 6) {
          s = {
            ...s,
            savedGanttViews: Array.isArray(s?.savedGanttViews) ? s.savedGanttViews : [],
            ganttConfig: {
              ...DEFAULT_GANTT_CONFIG,
              ...(s?.ganttConfig ?? {}),
              searchQuery: s?.ganttConfig?.searchQuery ?? '',
            },
          }
        }
        if (version < 7) {
          s = {
            ...s,
            savedGanttViews: Array.isArray(s?.savedGanttViews) ? s.savedGanttViews : [],
            ganttConfig: {
              ...DEFAULT_GANTT_CONFIG,
              ...(s?.ganttConfig ?? {}),
              customRangeStart: s?.ganttConfig?.customRangeStart ?? null,
              customRangeEnd: s?.ganttConfig?.customRangeEnd ?? null,
            },
          }
        }
        if (version < 8) {
          s = {
            ...s,
            projectsViewMode: s?.projectsViewMode === 'execution' ? 'execution' : 'portfolio',
          }
        }
        return s
      },
    }
  )
)

export default useSettingsStore
