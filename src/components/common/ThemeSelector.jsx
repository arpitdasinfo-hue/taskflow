import { memo } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import { THEMES, THEME_ROTATION_DAYS } from '../../themes'
import useSettingsStore from '../../store/useSettingsStore'
import { formatDistanceToNow } from 'date-fns'

const ThemeSelector = memo(function ThemeSelector() {
  const themeIndex      = useSettingsStore((s) => s.themeIndex)
  const themeLastChanged = useSettingsStore((s) => s.themeLastChanged)
  const setTheme        = useSettingsStore((s) => s.setTheme)

  const nextChange = new Date(new Date(themeLastChanged).getTime() + THEME_ROTATION_DAYS * 86400000)
  const isInFuture = nextChange > new Date()

  return (
    <div>
      {/* Info bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-xs"
        style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.15)', color: 'var(--text-secondary)' }}
      >
        <RefreshCw size={12} style={{ color: 'var(--accent)' }} />
        <span>
          Auto-rotates every {THEME_ROTATION_DAYS} days ·{' '}
          {isInFuture
            ? `Next change ${formatDistanceToNow(nextChange, { addSuffix: true })}`
            : 'Will change on next visit'}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {THEMES.map((theme, idx) => (
          <button
            key={theme.id}
            onClick={() => setTheme(idx)}
            className="group relative rounded-2xl overflow-hidden aspect-[4/3] focus-visible:ring-2 transition-transform hover:scale-105"
            style={{ outline: idx === themeIndex ? `2px solid ${theme.accent}` : 'none', outlineOffset: '2px' }}
            aria-label={`Select ${theme.name} theme`}
            aria-pressed={idx === themeIndex}
          >
            {/* Gradient bg */}
            <div className="absolute inset-0" style={{ background: theme.gradient }} />

            {/* Glass preview swatch */}
            <div
              className="absolute inset-2 rounded-xl"
              style={{
                background: theme.glassBg,
                border: `1px solid ${theme.glassBorder}`,
                backdropFilter: 'blur(8px)',
              }}
            />

            {/* Accent dot row */}
            <div className="absolute bottom-2 left-2 flex gap-1">
              {theme.preview.map((c, i) => (
                <span key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />
              ))}
            </div>

            {/* Theme name */}
            <div
              className="absolute top-1.5 left-0 right-0 px-1.5 text-center text-[9px] font-semibold leading-tight"
              style={{ color: theme.textPrimary, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              {theme.name}
            </div>

            {/* Active check */}
            {idx === themeIndex && (
              <div
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: theme.accent }}
              >
                <Check size={10} color="#fff" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
})

export default ThemeSelector
