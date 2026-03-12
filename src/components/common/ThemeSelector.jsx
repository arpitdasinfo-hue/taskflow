import { memo } from 'react'
import { Check, RefreshCw, SunMoon } from 'lucide-react'
import { THEMES } from '../../themes'
import useSettingsStore from '../../store/useSettingsStore'
import { formatDistanceToNow } from 'date-fns'

const SEGMENT_BASE =
  'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors'

const Segment = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={SEGMENT_BASE}
    style={active
      ? { background: 'rgba(var(--accent-rgb),0.18)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.32)' }
      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
  >
    {label}
  </button>
)

const ThemeSelector = memo(function ThemeSelector() {
  const themeIndex = useSettingsStore((s) => s.themeIndex)
  const themeLastChanged = useSettingsStore((s) => s.themeLastChanged)
  const themeMode = useSettingsStore((s) => s.themeMode)
  const themeRotationDays = useSettingsStore((s) => s.themeRotationDays)
  const contrastMode = useSettingsStore((s) => s.contrastMode)
  const uiDensity = useSettingsStore((s) => s.uiDensity)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const setThemeMode = useSettingsStore((s) => s.setThemeMode)
  const setThemeRotationDays = useSettingsStore((s) => s.setThemeRotationDays)
  const setContrastMode = useSettingsStore((s) => s.setContrastMode)
  const setUiDensity = useSettingsStore((s) => s.setUiDensity)

  const nextChange = new Date(new Date(themeLastChanged).getTime() + themeRotationDays * 86400000)
  const isInFuture = nextChange > new Date()

  return (
    <div>
      {/* Info bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-xs"
        style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.15)', color: 'var(--text-secondary)' }}
      >
        <SunMoon size={12} style={{ color: 'var(--accent)' }} />
        <span>
          {themeMode === 'auto' ? `Auto mode (${themeRotationDays} days)` : 'Manual mode'} ·
          {' '}
          {contrastMode === 'high' ? 'High contrast' : 'Standard contrast'} ·
          {' '}
          {uiDensity === 'compact' ? 'Compact density' : 'Comfortable density'}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] uppercase tracking-wider min-w-16" style={{ color: 'var(--text-secondary)' }}>
            Mode
          </p>
          <Segment active={themeMode === 'auto'} label="Auto" onClick={() => setThemeMode('auto')} />
          <Segment active={themeMode === 'manual'} label="Manual" onClick={() => setThemeMode('manual')} />
          {themeMode === 'auto' && (
            <>
              <Segment active={themeRotationDays === 7} label="7d" onClick={() => setThemeRotationDays(7)} />
              <Segment active={themeRotationDays === 14} label="14d" onClick={() => setThemeRotationDays(14)} />
              <Segment active={themeRotationDays === 30} label="30d" onClick={() => setThemeRotationDays(30)} />
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] uppercase tracking-wider min-w-16" style={{ color: 'var(--text-secondary)' }}>
            Contrast
          </p>
          <Segment active={contrastMode === 'standard'} label="Standard" onClick={() => setContrastMode('standard')} />
          <Segment active={contrastMode === 'high'} label="High" onClick={() => setContrastMode('high')} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] uppercase tracking-wider min-w-16" style={{ color: 'var(--text-secondary)' }}>
            Density
          </p>
          <Segment active={uiDensity === 'comfortable'} label="Comfortable" onClick={() => setUiDensity('comfortable')} />
          <Segment active={uiDensity === 'compact'} label="Compact" onClick={() => setUiDensity('compact')} />
        </div>

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={12} style={{ color: 'var(--accent)' }} />
          <span>
            {themeMode === 'auto'
              ? (isInFuture
                ? `Next change ${formatDistanceToNow(nextChange, { addSuffix: true })}`
                : 'Will change on next visit')
              : 'Manual mode keeps current theme until changed'}
          </span>
        </div>
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
