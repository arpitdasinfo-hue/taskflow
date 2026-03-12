import { memo, useMemo, useRef } from 'react'
import { Check } from 'lucide-react'

const chunkColors = (colors, perRow) => {
  const rows = []
  for (let i = 0; i < colors.length; i += perRow) rows.push(colors.slice(i, i + perRow))
  return rows
}

const ColorPalettePicker = memo(function ColorPalettePicker({
  colors = [],
  value = null,
  onChange,
  allowAuto = false,
  autoLabel = 'Auto',
  compact = false,
}) {
  const colorInputRef = useRef(null)
  const palette = useMemo(() => {
    if (value && !colors.includes(value)) return [value, ...colors]
    return colors
  }, [colors, value])
  const rows = useMemo(() => chunkColors(palette, compact ? 6 : 10), [palette, compact])
  const swatchSize = compact ? 20 : 24

  return (
    <div
      className="rounded-xl p-2.5"
      style={{
        background: compact ? 'rgba(8,16,30,0.95)' : 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {!compact && (
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Selected
          </span>
          {value ? (
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: value, boxShadow: `0 0 8px ${value}80` }}
              />
              {value.toUpperCase()}
            </div>
          ) : (
            allowAuto && (
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {autoLabel}
              </span>
            )
          )}
        </div>
      )}

      {allowAuto && (
        <button
          type="button"
          onClick={() => onChange?.(null)}
          className="mb-2.5 text-[11px] px-2.5 py-1 rounded-full border transition-colors"
          style={value === null
            ? { background: 'rgba(var(--accent-rgb),0.15)', borderColor: 'var(--accent)', color: 'var(--accent)' }
            : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }
          }
        >
          {autoLabel}
        </button>
      )}

      <div className="space-y-1.5">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-1.5 flex-wrap">
            {row.map((color) => {
              const active = color === value
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onChange?.(color)}
                  className="rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  style={{
                    width: `${swatchSize}px`,
                    height: `${swatchSize}px`,
                    background: color,
                    border: active ? '2px solid rgba(255,255,255,0.95)' : '1px solid rgba(255,255,255,0.15)',
                    boxShadow: active ? `0 0 0 2px ${color}70` : 'none',
                  }}
                  aria-label={`Select ${color}`}
                  title={color}
                >
                  {active && <Check size={compact ? 9 : 10} color="#fff" strokeWidth={3} className="mx-auto" />}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className={`flex items-center ${compact ? 'justify-end mt-2' : 'justify-between mt-2.5'}`}>
        {!compact && (
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            Need another shade?
          </span>
        )}
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="text-[10px] px-2 py-1 rounded-lg border transition-colors hover:bg-white/5"
          style={{ borderColor: 'rgba(255,255,255,0.16)', color: 'var(--text-secondary)' }}
        >
          Custom
        </button>
      </div>

      <input
        ref={colorInputRef}
        type="color"
        value={value ?? '#22d3ee'}
        onChange={(event) => onChange?.(event.target.value)}
        className="sr-only"
        aria-label="Pick custom color"
      />
    </div>
  )
})

export default ColorPalettePicker
