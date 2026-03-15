import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const VIEWPORT_PADDING = 12
const TOOLTIP_GAP = 10

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const TimelineHoverCard = memo(function TimelineHoverCard({
  title,
  sectionLabel,
  statusLabel,
  startLabel,
  dueLabel,
  progressLabel,
  color,
  compact = false,
  anchorRef = null,
}) {
  const [position, setPosition] = useState(null)
  const cardRef = useRef(null)

  const updatePosition = useCallback(() => {
    if (!anchorRef?.current || !cardRef.current || typeof window === 'undefined') return

    const anchorRect = anchorRef.current.getBoundingClientRect()
    const cardRect = cardRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = anchorRect.left + (anchorRect.width / 2) - (cardRect.width / 2)
    left = clamp(left, VIEWPORT_PADDING, viewportWidth - cardRect.width - VIEWPORT_PADDING)

    let top = anchorRect.top - cardRect.height - TOOLTIP_GAP
    if (top < VIEWPORT_PADDING) {
      top = anchorRect.bottom + TOOLTIP_GAP
    }
    top = clamp(top, VIEWPORT_PADDING, viewportHeight - cardRect.height - VIEWPORT_PADDING)

    setPosition({ left, top })
  }, [anchorRef])

  useEffect(() => {
    if (!anchorRef?.current || typeof window === 'undefined') return undefined

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
  }, [anchorRef, updatePosition])

  const content = (
    <div
      ref={cardRef}
      className={`${compact ? 'w-52' : 'w-60'} rounded-2xl px-3 py-2 pointer-events-none`}
      style={{
        background: 'rgba(6,12,22,0.985)',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 20px 44px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.04)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 140,
        ...(anchorRef?.current
          ? {
              position: 'fixed',
              left: position?.left ?? -9999,
              top: position?.top ?? -9999,
              opacity: position ? 1 : 0,
            }
          : {
              position: 'absolute',
              left: 0,
              bottom: '100%',
              marginBottom: 8,
            }),
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#94a3b8' }}>
            {sectionLabel}
          </p>
          <p className="text-xs font-semibold truncate" style={{ color: '#f8fafc' }}>
            {title}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#f8fafc' }}
        >
          {statusLabel}
        </span>
        <span className="text-[10px]" style={{ color: '#cbd5e1' }}>
          {progressLabel}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <p style={{ color: '#94a3b8' }}>Start</p>
          <p style={{ color: '#f8fafc' }}>{startLabel}</p>
        </div>
        <div>
          <p style={{ color: '#94a3b8' }}>Due</p>
          <p style={{ color: '#f8fafc' }}>{dueLabel}</p>
        </div>
      </div>
    </div>
  )

  if (anchorRef?.current && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return (
    content
  )
})

export default TimelineHoverCard
