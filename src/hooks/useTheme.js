import { useEffect } from 'react'
import useSettingsStore from '../store/useSettingsStore'
import { THEMES } from '../themes'

/**
 * Initializes the theme on mount (auto-rotate check + DOM apply).
 * Returns the current theme object for use in components.
 */
export function useTheme() {
  const themeIndex = useSettingsStore((s) => s.themeIndex)
  const initTheme  = useSettingsStore((s) => s.initTheme)

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return THEMES[themeIndex] ?? THEMES[0]
}

/** Returns only the current accent color string */
export function useAccent() {
  const themeIndex = useSettingsStore((s) => s.themeIndex)
  return THEMES[themeIndex]?.accent ?? THEMES[0].accent
}
