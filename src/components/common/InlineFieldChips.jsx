import { memo, useRef } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'

const toInputDateValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatInlineDate = (value, emptyLabel) => {
  if (!value) return emptyLabel
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return emptyLabel
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const InlineDateChip = memo(function InlineDateChip({
  label,
  value,
  onChange,
  tone = 'default',
}) {
  const inputRef = useRef(null)
  const palette = tone === 'danger'
    ? { background: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)', color: '#fca5a5' }
    : { background: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }

  const openPicker = (event) => {
    event.stopPropagation()
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }
    input.focus({ preventScroll: true })
    input.click()
  }

  return (
    <span className="relative flex-shrink-0" onClick={(event) => event.stopPropagation()}>
      <input
        ref={inputRef}
        type="date"
        value={toInputDateValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="absolute w-px h-px opacity-0 pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
        style={{ colorScheme: 'light' }}
      />
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap"
        style={{
          background: palette.background,
          border: `1px solid ${palette.border}`,
          color: palette.color,
        }}
        title={label}
      >
        <CalendarDays size={11} />
        {formatInlineDate(value, label)}
      </button>
    </span>
  )
})

export const InlineStatusChip = memo(function InlineStatusChip({
  value,
  onChange,
  labels,
  colors,
}) {
  return (
    <label
      className="relative flex-shrink-0"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      title="Status"
    >
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {Object.entries(labels).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
      <span
        className="pointer-events-none inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap"
        style={{ background: `${colors[value]}18`, color: colors[value] }}
      >
        {labels[value]}
        <ChevronDown size={11} />
      </span>
    </label>
  )
})
