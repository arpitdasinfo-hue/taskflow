import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'

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
  compact = false,
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
        className={`inline-flex items-center whitespace-nowrap font-medium rounded-full ${
          compact ? 'gap-1 px-2 py-1 text-[10px]' : 'gap-1.5 px-2.5 py-1.5 text-[10px]'
        }`}
        style={{
          background: palette.background,
          border: `1px solid ${palette.border}`,
          color: palette.color,
        }}
        title={label}
      >
        <CalendarDays size={compact ? 10 : 11} />
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
  compact = false,
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined' || !buttonRef.current) return

    const updatePosition = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const menuWidth = Math.max(rect.width, menuRef.current?.offsetWidth ?? 156)
      const menuHeight = menuRef.current?.offsetHeight ?? 180
      const viewportPadding = 8
      const gap = 8

      let left = rect.left
      let top = rect.bottom + gap

      if (left + menuWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - menuWidth - viewportPadding
      }
      if (left < viewportPadding) left = viewportPadding

      if (top + menuHeight > window.innerHeight - viewportPadding) {
        top = Math.max(viewportPadding, rect.top - menuHeight - gap)
      }

      setMenuPos({ top, left, width: menuWidth })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const handleMouseDown = (event) => {
      const target = event.target
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  return (
    <span
      className="relative flex-shrink-0"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className={`inline-flex items-center whitespace-nowrap font-medium rounded-full ${
          compact ? 'gap-1 px-2 py-1 text-[10px]' : 'gap-1.5 px-2.5 py-1.5 text-[10px]'
        }`}
        style={{ background: `${colors[value]}18`, color: colors[value] }}
        title="Status"
      >
        {labels[value]}
        <ChevronDown size={compact ? 10 : 11} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[100] rounded-2xl overflow-hidden"
            style={{
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              minWidth: `${menuPos.width}px`,
              background: '#ffffff',
              border: '1px solid rgba(15,23,42,0.12)',
              boxShadow: '0 20px 48px rgba(15,23,42,0.22)',
            }}
          >
            {Object.entries(labels).map(([optionValue, optionLabel]) => {
              const active = optionValue === value
              return (
                <button
                  key={optionValue}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange(optionValue)
                    setOpen(false)
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100"
                  style={active ? { background: '#eff6ff', color: '#1d4ed8' } : { color: '#0f172a' }}
                >
                  <span>{optionLabel}</span>
                  {active && <Check size={13} />}
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </span>
  )
})
