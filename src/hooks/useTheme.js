import { useEffect } from 'react'
import useSettingsStore from '../store/useSettingsStore'
import { THEMES } from '../themes'

/**
 * Initializes the theme on mount (auto-rotate check + DOM apply).
 * Returns the current effective theme object for use in components.
 * When followSystemTheme is on, returns the light-mode theme when OS is in light mode.
 */
export function useTheme() {
  const themeIndex          = useSettingsStore((s) => s.themeIndex)
  const lightModeThemeIndex = useSettingsStore((s) => s.lightModeThemeIndex)
  const followSystemTheme   = useSettingsStore((s) => s.followSystemTheme)
  const initTheme           = useSettingsStore((s) => s.initTheme)
  const applyEffectiveTheme = useSettingsStore((s) => s.applyEffectiveTheme)

  useEffect(() => {
    initTheme()
  }, [initTheme])

  // Listen for OS color-scheme changes when followSystemTheme is enabled
  useEffect(() => {
    if (!followSystemTheme) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyEffectiveTheme()
    // Apply immediately in case OS mode changed since last render
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [followSystemTheme, applyEffectiveTheme])

  // Return the effective theme (considers OS preference)
  if (followSystemTheme) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const effectiveIndex = isDark ? themeIndex : lightModeThemeIndex
    return THEMES[effectiveIndex] ?? THEMES[0]
  }
  return THEMES[themeIndex] ?? THEMES[0]
}

/** Returns only the current accent color string */
export function useAccent() {
  const themeIndex = useSettingsStore((s) => s.themeIndex)
  return THEMES[themeIndex]?.accent ?? THEMES[0].accent
}
