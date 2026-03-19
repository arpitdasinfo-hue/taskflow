import { memo } from 'react'
import { RefreshCw } from 'lucide-react'

const TYPES = [
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
]

const Chip = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
    style={active
      ? { background: 'rgba(var(--accent-rgb),0.18)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.32)' }
      : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
  >
    {label}
  </button>
)

/**
 * Recurrence value shape:
 * { type: 'daily'|'weekly'|'monthly', interval: number, endType: 'never'|'date'|'count', endDate: string|null, endCount: number|null }
 *
 * null = no recurrence
 */
const RecurrenceSelector = memo(function RecurrenceSelector({ value, onChange }) {
  const active = !!value

  const update = (patch) => onChange({ ...value, ...patch })

  const enable = () =>
    onChange({ type: 'weekly', interval: 1, endType: 'never', endDate: null, endCount: null, occurrenceCount: 0, parentTaskId: null })

  const disable = () => onChange(null)

  return (
    <div className="space-y-3">
      {/* Enable/disable toggle row */}
      <div className="flex items-center gap-3">
        <RefreshCw size={13} style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Repeat</span>
        <div className="flex items-center gap-1.5 ml-auto">
          {active ? (
            <button
              type="button"
              onClick={disable}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={enable}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
            >
              Add recurrence
            </button>
          )}
        </div>
      </div>

      {active && (
        <>
          {/* Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider min-w-12" style={{ color: 'var(--text-secondary)' }}>Type</span>
            {TYPES.map((t) => (
              <Chip key={t.value} active={value.type === t.value} label={t.label} onClick={() => update({ type: t.value })} />
            ))}
          </div>

          {/* Interval */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider min-w-12" style={{ color: 'var(--text-secondary)' }}>Every</span>
            <input
              type="number"
              min={1}
              max={99}
              value={value.interval}
              onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-14 text-xs px-2 py-1 rounded-lg outline-none text-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {value.type === 'daily' ? 'day(s)' : value.type === 'weekly' ? 'week(s)' : 'month(s)'}
            </span>
          </div>

          {/* End condition */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider min-w-12" style={{ color: 'var(--text-secondary)' }}>Ends</span>
            <Chip active={value.endType === 'never'} label="Never" onClick={() => update({ endType: 'never', endDate: null, endCount: null })} />
            <Chip active={value.endType === 'date'}  label="On date" onClick={() => update({ endType: 'date',  endCount: null })} />
            <Chip active={value.endType === 'count'} label="After N times" onClick={() => update({ endType: 'count', endDate: null })} />
          </div>

          {value.endType === 'date' && (
            <div className="flex items-center gap-2 pl-14">
              <input
                type="date"
                value={value.endDate ?? ''}
                onChange={(e) => update({ endDate: e.target.value || null })}
                className="text-xs px-2 py-1 rounded-lg outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {value.endType === 'count' && (
            <div className="flex items-center gap-2 pl-14">
              <input
                type="number"
                min={1}
                max={999}
                value={value.endCount ?? ''}
                onChange={(e) => update({ endCount: Math.max(1, parseInt(e.target.value) || 1) })}
                placeholder="e.g. 10"
                className="w-20 text-xs px-2 py-1 rounded-lg outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>times</span>
            </div>
          )}
        </>
      )}
    </div>
  )
})

export default RecurrenceSelector
