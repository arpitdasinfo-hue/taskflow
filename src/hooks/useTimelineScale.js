import { useMemo, useState } from 'react'
import { DEFAULT_OFFSET_BY_ZOOM, DEFAULT_ZOOM, ZOOM_CONFIGS } from '../components/timeline/timelineConfig'
import { addDays, formatRangeLabel, startOfDay } from '../components/timeline/timelineUtils'

const useTimelineScale = ({ initialZoom, initialOffsetDays } = {}) => {
  const resolvedInitialZoom = ZOOM_CONFIGS[initialZoom] ? initialZoom : DEFAULT_ZOOM
  const [zoom, setZoom] = useState(resolvedInitialZoom)
  const [offsetDays, setOffsetDays] = useState(() => {
    if (Number.isFinite(initialOffsetDays)) return initialOffsetDays
    return DEFAULT_OFFSET_BY_ZOOM[resolvedInitialZoom] ?? DEFAULT_OFFSET_BY_ZOOM[DEFAULT_ZOOM]
  })

  const config = ZOOM_CONFIGS[zoom]

  const startDate = useMemo(
    () => startOfDay(addDays(new Date(), offsetDays)),
    [offsetDays]
  )

  const endDate = useMemo(
    () => addDays(startDate, config.days - 1),
    [startDate, config.days]
  )

  const rangeLabel = useMemo(
    () => formatRangeLabel(startDate, endDate),
    [startDate, endDate]
  )

  const shiftRange = (direction) =>
    setOffsetDays((current) => current + direction * Math.round(config.days / 3))

  const resetToToday = () =>
    setOffsetDays(DEFAULT_OFFSET_BY_ZOOM[zoom] ?? -7)

  const changeZoom = (nextZoom) => {
    if (!ZOOM_CONFIGS[nextZoom] || nextZoom === zoom) return

    const currentCenterOffset = offsetDays + Math.round(config.days / 2)
    const nextDays = ZOOM_CONFIGS[nextZoom].days
    const nextOffset = currentCenterOffset - Math.round(nextDays / 2)

    setZoom(nextZoom)
    setOffsetDays(nextOffset)
  }

  return {
    zoom,
    config,
    startDate,
    endDate,
    rangeLabel,
    changeZoom,
    shiftRange,
    resetToToday,
  }
}

export default useTimelineScale
