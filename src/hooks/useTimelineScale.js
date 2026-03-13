import { useMemo, useState } from 'react'
import { DEFAULT_OFFSET_BY_ZOOM, DEFAULT_ZOOM, ZOOM_CONFIGS } from '../components/timeline/timelineConfig'
import { addDays, diffDays, formatRangeLabel, startOfDay, toDisplayDate } from '../components/timeline/timelineUtils'

const getAdaptiveCellWidth = (days) => {
  if (days <= 14) return 56
  if (days <= 31) return 36
  if (days <= 62) return 24
  if (days <= 124) return 16
  return 12
}

const normalizeRange = (startValue, endValue) => {
  const start = toDisplayDate(startValue)
  const end = toDisplayDate(endValue)
  if (!start || !end) return null
  return start <= end ? { start, end } : { start: end, end: start }
}

const useTimelineScale = ({ initialZoom, initialOffsetDays, initialRangeStart, initialRangeEnd } = {}) => {
  const resolvedInitialZoom = ZOOM_CONFIGS[initialZoom] ? initialZoom : DEFAULT_ZOOM
  const initialCustomRange = resolvedInitialZoom === 'custom'
    ? normalizeRange(initialRangeStart, initialRangeEnd)
    : null

  const [zoom, setZoom] = useState(resolvedInitialZoom)
  const [offsetDays, setOffsetDays] = useState(() => {
    if (Number.isFinite(initialOffsetDays)) return initialOffsetDays
    return DEFAULT_OFFSET_BY_ZOOM[resolvedInitialZoom] ?? DEFAULT_OFFSET_BY_ZOOM[DEFAULT_ZOOM]
  })
  const [customRange, setCustomRangeState] = useState(initialCustomRange)

  const presetConfig = ZOOM_CONFIGS[zoom] ?? ZOOM_CONFIGS[DEFAULT_ZOOM]

  const startDate = useMemo(() => {
    if (zoom === 'custom' && customRange?.start) return customRange.start
    return startOfDay(addDays(new Date(), offsetDays))
  }, [zoom, customRange, offsetDays])

  const endDate = useMemo(() => {
    if (zoom === 'custom' && customRange?.end) return customRange.end
    return addDays(startDate, presetConfig.days - 1)
  }, [zoom, customRange, startDate, presetConfig.days])

  const config = useMemo(() => {
    if (zoom !== 'custom') return presetConfig
    const days = Math.max(1, diffDays(startDate, endDate) + 1)
    return {
      id: 'custom',
      label: 'Custom',
      days,
      cellWidth: getAdaptiveCellWidth(days),
    }
  }, [zoom, presetConfig, startDate, endDate])

  const rangeLabel = useMemo(
    () => formatRangeLabel(startDate, endDate),
    [startDate, endDate]
  )

  const shiftRange = (direction) => {
    if (zoom === 'custom' && customRange) {
      const delta = Math.max(1, Math.round(config.days / 3))
      setCustomRangeState({
        start: startOfDay(addDays(customRange.start, direction * delta)),
        end: startOfDay(addDays(customRange.end, direction * delta)),
      })
      return
    }

    setOffsetDays((current) => current + direction * Math.round(config.days / 3))
  }

  const resetToToday = () => {
    if (zoom === 'custom') {
      const duration = Math.max(1, diffDays(startDate, endDate) + 1)
      const nextStart = startOfDay(addDays(new Date(), DEFAULT_OFFSET_BY_ZOOM.month ?? -14))
      setCustomRangeState({
        start: nextStart,
        end: startOfDay(addDays(nextStart, duration - 1)),
      })
      return
    }

    setOffsetDays(DEFAULT_OFFSET_BY_ZOOM[zoom] ?? -7)
  }

  const changeZoom = (nextZoom) => {
    if (!ZOOM_CONFIGS[nextZoom]) return
    if (nextZoom === 'custom') {
      if (zoom === 'custom' && customRange) return
      setZoom('custom')
      setCustomRangeState({
        start: startDate,
        end: endDate,
      })
      return
    }

    if (nextZoom === zoom && zoom !== 'custom') return

    const currentCenterOffset = diffDays(new Date(), startDate) + Math.round(config.days / 2)
    const nextDays = ZOOM_CONFIGS[nextZoom].days
    const nextOffset = currentCenterOffset - Math.round(nextDays / 2)

    setCustomRangeState(null)
    setZoom(nextZoom)
    setOffsetDays(nextOffset)
  }

  const applyCustomRange = (startValue, endValue) => {
    const nextRange = normalizeRange(startValue, endValue)
    if (!nextRange) return false

    setZoom('custom')
    setCustomRangeState(nextRange)
    return true
  }

  const restoreScale = ({ zoom: nextZoom, rangeStart, rangeEnd, customRangeStart, customRangeEnd } = {}) => {
    const preferredZoom = ZOOM_CONFIGS[nextZoom] ? nextZoom : zoom
    const explicitCustomRange = normalizeRange(customRangeStart, customRangeEnd)
    const resolvedRange = explicitCustomRange ?? normalizeRange(rangeStart, rangeEnd)

    if (preferredZoom === 'custom' && resolvedRange) {
      setZoom('custom')
      setCustomRangeState(resolvedRange)
      return
    }

    if (resolvedRange && preferredZoom !== 'custom') {
      const targetDuration = diffDays(resolvedRange.start, resolvedRange.end) + 1
      if (targetDuration !== (ZOOM_CONFIGS[preferredZoom]?.days ?? targetDuration)) {
        setZoom('custom')
        setCustomRangeState(resolvedRange)
        return
      }
      setCustomRangeState(null)
      setZoom(preferredZoom)
      setOffsetDays(diffDays(new Date(), resolvedRange.start))
      return
    }

    const parsedStart = toDisplayDate(rangeStart)
    const nextOffset = parsedStart
      ? diffDays(new Date(), parsedStart)
      : DEFAULT_OFFSET_BY_ZOOM[preferredZoom] ?? DEFAULT_OFFSET_BY_ZOOM[DEFAULT_ZOOM]

    setCustomRangeState(null)
    setZoom(preferredZoom)
    setOffsetDays(nextOffset)
  }

  return {
    zoom,
    offsetDays,
    config,
    startDate,
    endDate,
    rangeLabel,
    isCustomRange: zoom === 'custom',
    customRangeStart: zoom === 'custom' ? startDate.toISOString().slice(0, 10) : '',
    customRangeEnd: zoom === 'custom' ? endDate.toISOString().slice(0, 10) : '',
    changeZoom,
    shiftRange,
    resetToToday,
    applyCustomRange,
    restoreScale,
  }
}

export default useTimelineScale
