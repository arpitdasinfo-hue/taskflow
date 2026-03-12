import { memo, useMemo, useRef, useState } from 'react'
import { STATUS_COLOR } from './timelineConfig'
import { addDays, clamp, diffDays, formatDateShort, startOfDay, toDisplayDate } from './timelineUtils'

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
  const color = STATUS_COLOR[item.status] || rowColor || 'var(--accent)'
  const progress = item.status === 'done' ? 1 : item.status === 'in-progress' ? 0.5 : 0

  if (readOnly) {
    return (
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          left,
          top: '50%',
          transform: 'translateY(-50%)',
          width,
          height: 18,
          background: `${color}30`,
          border: `1px solid ${color}66`,
          zIndex: 4,
        }}
        title={item.title}
      >
        <div
          className="absolute top-0 bottom-0 left-0 rounded-full"
          style={{ width: `${progress * 100}%`, background: `${color}55` }}
        />
        {width > 68 && (
          <span
            className="relative z-[2] px-2 text-[9px] font-medium truncate block text-left"
            style={{ color }}
          >
            {item.title}
          </span>
        )}
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
      <button
        ref={buttonRef}
        onClick={handleClick}
        onPointerDown={(event) => startInteraction(event, 'move')}
        onPointerMove={handlePointerMove}
        onPointerUp={finishInteraction}
        onPointerCancel={finishInteraction}
        className="absolute rounded-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          left,
          top: '50%',
          transform: 'translateY(-50%)',
          width,
          height: 18,
          background: `${color}30`,
          border: `1px solid ${color}66`,
          zIndex: isInteracting ? 6 : 4,
        }}
        title={item.title}
      >
        <div
          className="absolute top-0 bottom-0 left-0 rounded-full"
          style={{ width: `${progress * 100}%`, background: `${color}55` }}
        />

        <span
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
          onPointerDown={(event) => startInteraction(event, 'resize-start')}
          title="Resize start"
        />
        <span
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
          onPointerDown={(event) => startInteraction(event, 'resize-end')}
          title="Resize end"
        />

        {width > 68 && (
          <span
            className="relative z-[2] px-2 text-[9px] font-medium truncate block text-left"
            style={{ color }}
          >
            {item.title}
          </span>
        )}
      </button>

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
            zIndex: 8,
          }}
        >
          {formatDateShort(previewStart)} - {formatDateShort(previewEnd)}
        </div>
      )}
    </>
  )
})

export default TimelineTaskBar
