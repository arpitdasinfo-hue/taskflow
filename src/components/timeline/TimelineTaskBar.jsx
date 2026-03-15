import { memo, useMemo, useRef, useState } from 'react'
import { addDays, clamp, diffDays, formatDateShort, startOfDay, toDisplayDate } from './timelineUtils'
import TimelineHoverCard from './TimelineHoverCard'
import { getBarHoverMeta, getBarVisuals } from './timelineBarVisuals'

const TimelineTaskBar = memo(function TimelineTaskBar({
  taskId,
  item,
  rowColor,
  startDate,
  days,
  cellWidth,
  onSelectTask,
  onUpdateTaskSchedule,
  readOnly = false,
}) {
  const buttonRef = useRef(null)
  const interactionRef = useRef(null)
  const suppressClickRef = useRef(false)
  const draftRangeRef = useRef(null)
  const [draftRange, setDraftRange] = useState(null)
  const [isInteracting, setIsInteracting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const baseRange = useMemo(() => {
    const start = toDisplayDate(item.startDate) || toDisplayDate(item.dueDate)
    const end = toDisplayDate(item.dueDate) || toDisplayDate(item.startDate)
    if (!start || !end) return null
    return {
      startOffset: diffDays(startDate, start),
      endOffset: diffDays(startDate, end),
    }
  }, [item.startDate, item.dueDate, startDate])

  if (!baseRange) return null

  const activeRange = draftRange ?? baseRange
  const clampedStart = clamp(activeRange.startOffset, 0, days - 1)
  const clampedEnd = clamp(activeRange.endOffset, 0, days - 1)
  const left = clampedStart * cellWidth + 1
  const width = Math.max(10, (clampedEnd - clampedStart + 1) * cellWidth - 2)
  const visuals = getBarVisuals({
    type: 'task',
    item,
    rowColor,
    width,
    cellWidth,
    readOnly,
  })
  const hoverMeta = getBarHoverMeta({ type: 'task', item, progress: visuals.progress })

  if (readOnly) {
    return (
      <div
        className="absolute"
        style={{ left, top: '50%', transform: 'translateY(-50%)', zIndex: isHovered ? 40 : 4 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered ? (
          <TimelineHoverCard
            title={item.title}
            color={visuals.accentColor}
            compact
            {...hoverMeta}
          />
        ) : null}
        <div
          className="relative rounded-full overflow-hidden"
          style={{
            width,
            height: visuals.height,
            background: visuals.background,
            border: `1px solid ${visuals.borderColor}`,
            boxShadow: visuals.boxShadow,
          }}
          title={item.title}
        >
          <div
            className="absolute inset-x-0 top-0"
            style={{ height: '44%', background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0))' }}
          />
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full"
            style={{ width: `${visuals.progress * 100}%`, background: visuals.progressFill }}
          />
          <div className="absolute top-[2px] bottom-[2px] left-[3px] rounded-full" style={{ width: visuals.capWidth, background: visuals.accentColor }} />
          <div className="absolute top-[2px] bottom-[2px] right-[3px] rounded-full" style={{ width: visuals.capWidth, background: visuals.isLate ? '#fb7185' : 'rgba(255,255,255,0.28)' }} />
          {visuals.label ? (
            <span
              className="relative z-[2] px-2 text-[9px] font-semibold truncate block text-left"
              style={{ color: '#e8edf5' }}
            >
              {visuals.label}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  const startInteraction = (event, mode) => {
    if (!buttonRef.current) return
    event.preventDefault()
    event.stopPropagation()

    const interaction = {
      mode,
      pointerId: event.pointerId,
      pointerStartX: event.clientX,
      baseStart: baseRange.startOffset,
      baseEnd: baseRange.endOffset,
    }

    interactionRef.current = interaction
    suppressClickRef.current = false
    const initialDraft = { startOffset: interaction.baseStart, endOffset: interaction.baseEnd }
    draftRangeRef.current = initialDraft
    setDraftRange(initialDraft)
    setIsInteracting(true)

    try {
      buttonRef.current.setPointerCapture(event.pointerId)
    } catch {
      // Some environments can throw on capture changes; drag still works without capture.
    }
  }

  const handlePointerMove = (event) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    event.preventDefault()

    const delta = Math.round((event.clientX - interaction.pointerStartX) / cellWidth)
    let nextStart = interaction.baseStart
    let nextEnd = interaction.baseEnd

    if (interaction.mode === 'move') {
      nextStart = interaction.baseStart + delta
      nextEnd = interaction.baseEnd + delta
    } else if (interaction.mode === 'resize-start') {
      nextStart = Math.min(interaction.baseEnd, interaction.baseStart + delta)
    } else if (interaction.mode === 'resize-end') {
      nextEnd = Math.max(interaction.baseStart, interaction.baseEnd + delta)
    }

    const changed = nextStart !== interaction.baseStart || nextEnd !== interaction.baseEnd
    if (changed) suppressClickRef.current = true
    const nextDraft = { startOffset: nextStart, endOffset: nextEnd }
    draftRangeRef.current = nextDraft
    setDraftRange(nextDraft)
  }

  const finishInteraction = (event) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return

    event.preventDefault()
    event.stopPropagation()

    try {
      if (buttonRef.current?.hasPointerCapture(event.pointerId)) {
        buttonRef.current.releasePointerCapture(event.pointerId)
      }
    } catch {
      // Safe no-op if capture state is already released.
    }

    interactionRef.current = null
    setIsInteracting(false)

    const finalRange = draftRangeRef.current ?? {
      startOffset: interaction.baseStart,
      endOffset: interaction.baseEnd,
    }

    const changed =
      finalRange.startOffset !== interaction.baseStart ||
      finalRange.endOffset !== interaction.baseEnd

    if (changed) {
      const nextStart = addDays(startOfDay(startDate), finalRange.startOffset)
      const nextEnd = addDays(startOfDay(startDate), finalRange.endOffset)
      onUpdateTaskSchedule?.(taskId, {
        startDate: nextStart.toISOString(),
        dueDate: nextEnd.toISOString(),
      }, {
        startDate: item.startDate ?? null,
        dueDate: item.dueDate ?? null,
      })
    }

    draftRangeRef.current = null
    setDraftRange(null)
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onSelectTask?.(taskId)
  }

  const previewStart = addDays(startOfDay(startDate), activeRange.startOffset)
  const previewEnd = addDays(startOfDay(startDate), activeRange.endOffset)

  return (
    <>
      <div
        className="absolute"
        style={{ left, top: '50%', transform: 'translateY(-50%)', zIndex: isInteracting || isHovered ? 40 : 4 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered ? (
          <TimelineHoverCard
            title={item.title}
            color={visuals.accentColor}
            compact={cellWidth <= 14}
            {...hoverMeta}
          />
        ) : null}
        <button
          ref={buttonRef}
          onClick={handleClick}
          onPointerDown={(event) => startInteraction(event, 'move')}
          onPointerMove={handlePointerMove}
          onPointerUp={finishInteraction}
          onPointerCancel={finishInteraction}
          className="relative rounded-full overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            width,
            height: visuals.height,
            background: visuals.background,
            border: `1px solid ${visuals.borderColor}`,
            boxShadow: visuals.boxShadow,
          }}
          title={item.title}
        >
          <div
            className="absolute inset-x-0 top-0"
            style={{ height: '42%', background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0))' }}
          />
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full"
            style={{ width: `${visuals.progress * 100}%`, background: visuals.progressFill }}
          />
          <div className="absolute top-[2px] bottom-[2px] left-[3px] rounded-full" style={{ width: visuals.capWidth, background: visuals.accentColor }} />
          <div className="absolute top-[2px] bottom-[2px] right-[3px] rounded-full" style={{ width: visuals.capWidth, background: visuals.isLate ? '#fb7185' : 'rgba(255,255,255,0.28)' }} />

          <span
            className="absolute left-0 top-0 bottom-0 hover:bg-white/20"
            style={{ width: visuals.handleWidth, cursor: 'ew-resize' }}
            onPointerDown={(event) => startInteraction(event, 'resize-start')}
            title="Resize start"
          />
          <span
            className="absolute right-0 top-0 bottom-0 hover:bg-white/20"
            style={{ width: visuals.handleWidth, cursor: 'ew-resize' }}
            onPointerDown={(event) => startInteraction(event, 'resize-end')}
            title="Resize end"
          />

          {visuals.label ? (
            <span
              className="relative z-[2] px-2 text-[9px] font-semibold truncate block text-left"
              style={{ color: '#eef6fb' }}
            >
              {visuals.label}
            </span>
          ) : null}
        </button>
      </div>

      {isInteracting && (
        <div
          className="absolute px-2 py-0.5 text-[10px] rounded-lg pointer-events-none"
          style={{
            left: Math.max(2, left),
            top: '50%',
            transform: 'translateY(-145%)',
            background: 'rgba(8,20,35,0.96)',
            color: 'var(--text-secondary)',
            border: '1px solid rgba(255,255,255,0.16)',
            zIndex: 45,
          }}
        >
          {formatDateShort(previewStart)} - {formatDateShort(previewEnd)}
        </div>
      )}
    </>
  )
})

export default TimelineTaskBar
