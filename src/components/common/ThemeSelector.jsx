import { memo } from 'react'
import { Check, RefreshCw, SunMoon, Monitor } from 'lucide-react'
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
  const themeIndex          = useSettingsStore((s) => s.themeIndex)
  const lightModeThemeIndex = useSettingsStore((s) => s.lightModeThemeIndex)
  const followSystemTheme   = useSettingsStore((s) => s.followSystemTheme)
  const themeLastChanged    = useSettingsStore((s) => s.themeLastChanged)
  const themeMode           = useSettingsStore((s) => s.themeMode)
  const themeRotationDays   = useSettingsStore((s) => s.themeRotationDays)
  const contrastMode        = useSettingsStore((s) => s.contrastMode)
  const uiDensity           = useSettingsStore((s) => s.uiDensity)
  const setTheme                = useSettingsStore((s) => s.setTheme)
  const setThemeMode            = useSettingsStore((s) => s.setThemeMode)
  const setThemeRotationDays    = useSettingsStore((s) => s.setThemeRotationDays)
  const setContrastMode         = useSettingsStore((s) => s.setContrastMode)
  const setUiDensity            = useSettingsStore((s) => s.setUiDensity)
  const setFollowSystemTheme    = useSettingsStore((s) => s.setFollowSystemTheme)
  const setLightModeThemeIndex  = useSettingsStore((s) => s.setLightModeThemeIndex)

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
          {uiDensity === 'compact' ? 'Compact density' : 'Comfortable density'} ·
          {' '}
          Synced across signed-in devices
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

        {/* Follow system appearance */}
        <div
          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <Monitor size={13} style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Follow system appearance</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Switch to a different theme when OS is in light mode
              </p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={followSystemTheme}
            onClick={() => setFollowSystemTheme(!followSystemTheme)}
            className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors"
            style={{ background: followSystemTheme ? 'var(--accent)' : 'rgba(255,255,255,0.15)' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: followSystemTheme ? 'translateX(22px)' : 'translateX(2px)' }}
            />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        className="rounded-2xl px-3 py-2.5 mb-4 text-xs"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
      >
        Themes now use deeper atmospheric backgrounds with subtle structure overlays, so the canvas feels less flat and more intentional across desktop and mobile.
      </div>

      {followSystemTheme && (
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
          Dark mode theme (default)
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {THEMES.map((theme, idx) => (
          <button
            key={theme.id}
            onClick={() => setTheme(idx)}
            className="group relative rounded-[26px] overflow-hidden aspect-[5/4] focus-visible:ring-2 transition-transform hover:-translate-y-1"
            style={{
              outline: idx === themeIndex ? `2px solid ${theme.accent}` : 'none',
              outlineOffset: '2px',
              boxShadow: idx === themeIndex ? `0 18px 42px rgba(${theme.accentRgb},0.22)` : '0 12px 28px rgba(0,0,0,0.18)',
            }}
            aria-label={`Select ${theme.name} theme`}
            aria-pressed={idx === themeIndex}
          >
            <div className="absolute inset-0" style={{ background: theme.gradient }} />
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 28%, rgba(0,0,0,0.28) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 92px)',
              }}
            />

            <div
              className="absolute inset-3 rounded-2xl"
              style={{
                background: theme.glassBg,
                border: `1px solid ${theme.glassBorder}`,
                backdropFilter: 'blur(10px)',
              }}
            />

            <div className="absolute inset-3 rounded-2xl border border-white/10 opacity-70" />

            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3">
              <div
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ background: 'rgba(0,0,0,0.24)', color: theme.textSecondary, border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {theme.family || 'Theme'}
              </div>
              {idx === themeIndex && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: theme.accent }}
                >
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
            </div>

            <div className="absolute left-3 right-3 bottom-3">
              <div
                className="rounded-2xl px-3 py-3 text-left"
                style={{ background: 'rgba(4,10,18,0.42)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: theme.textPrimary, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
                    >
                      {theme.name}
                    </div>
                    <div
                      className="text-[11px] mt-1 leading-snug line-clamp-2"
                      style={{ color: theme.textSecondary, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                    >
                      {theme.mood || 'Curated atmosphere'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {theme.preview.map((c, i) => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Light-mode theme picker */}
      {followSystemTheme && (
        <div className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Light mode theme (when OS is light)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {THEMES.map((theme, idx) => (
              <button
                key={`light-${theme.id}`}
                onClick={() => setLightModeThemeIndex(idx)}
                className="group relative rounded-[26px] overflow-hidden aspect-[5/4] focus-visible:ring-2 transition-transform hover:-translate-y-1"
                style={{
                  outline: idx === lightModeThemeIndex ? `2px solid ${theme.accent}` : 'none',
                  outlineOffset: '2px',
                  boxShadow: idx === lightModeThemeIndex ? `0 18px 42px rgba(${theme.accentRgb},0.22)` : '0 12px 28px rgba(0,0,0,0.18)',
                }}
                aria-label={`Select ${theme.name} as light mode theme`}
                aria-pressed={idx === lightModeThemeIndex}
              >
                <div className="absolute inset-0" style={{ background: theme.gradient }} />
                <div
                  className="absolute inset-0 opacity-80"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 28%, rgba(0,0,0,0.28) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 92px)',
                  }}
                />
                <div
                  className="absolute inset-3 rounded-2xl"
                  style={{ background: theme.glassBg, border: `1px solid ${theme.glassBorder}`, backdropFilter: 'blur(10px)' }}
                />
                <div className="absolute inset-3 rounded-2xl border border-white/10 opacity-70" />
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3">
                  <div
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ background: 'rgba(0,0,0,0.24)', color: theme.textSecondary, border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {theme.family || 'Theme'}
                  </div>
                  {idx === lightModeThemeIndex && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: theme.accent }}>
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="absolute left-3 right-3 bottom-3">
                  <div
                    className="rounded-2xl px-3 py-3 text-left"
                    style={{ background: 'rgba(4,10,18,0.42)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
                  >
                    <div className="text-sm font-semibold truncate" style={{ color: theme.textPrimary, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                      {theme.name}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {theme.preview.map((c, i) => (
                        <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default ThemeSelector
