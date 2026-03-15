import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { createPortal } from 'react-dom'

const VIEWPORT_PADDING = 12
const TOOLTIP_GAP = 10

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const InfoTooltip = memo(function InfoTooltip({
  text,
  className = '',
  align = 'left',
  widthClassName = 'w-56',
  iconSize = 13,
}) {
  const [show, setShow] = useState(false)
  const [position, setPosition] = useState(null)
  const anchorRef = useRef(null)
  const tooltipRef = useRef(null)

  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !tooltipRef.current || typeof window === 'undefined') return

    const anchorRect = anchorRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left
    if (align === 'center') {
      left = anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2)
    } else if (align === 'right') {
      left = anchorRect.right - tooltipRect.width
    } else {
      left = anchorRect.left
    }

    left = clamp(left, VIEWPORT_PADDING, viewportWidth - tooltipRect.width - VIEWPORT_PADDING)

    let top = anchorRect.top - tooltipRect.height - TOOLTIP_GAP
    let placement = 'top'
    if (top < VIEWPORT_PADDING) {
      top = anchorRect.bottom + TOOLTIP_GAP
      placement = 'bottom'
    }
    if (top + tooltipRect.height > viewportHeight - VIEWPORT_PADDING) {
      top = clamp(top, VIEWPORT_PADDING, viewportHeight - tooltipRect.height - VIEWPORT_PADDING)
    }

    setPosition({ left, top, placement })
  }, [align])

  if (!text) return null

  useEffect(() => {
    if (!show || typeof window === 'undefined') return undefined

    const update = () => updatePosition()
    const frameId = window.requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      setPosition(null)
    }
  }, [show, updatePosition])

  return (
    <span
      ref={anchorRef}
      className={`inline-flex items-center ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      onClick={() => setShow((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setShow((value) => !value)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="More information"
    >
      <Info size={iconSize} style={{ color: 'var(--accent)', opacity: show ? 0.85 : 0.45 }} />
      {show && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className={`${widthClassName} fixed z-[120] px-3 py-2 rounded-xl text-xs pointer-events-none`}
          style={{
            left: position?.left ?? -9999,
            top: position?.top ?? -9999,
            opacity: position ? 1 : 0,
            background: 'rgba(10,16,28,0.96)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#e2e8f0',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  )
})

export default InfoTooltip
