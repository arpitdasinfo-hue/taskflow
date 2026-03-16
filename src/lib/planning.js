import { addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from 'date-fns'

export const PLANNING_BUCKETS = {
  day: ['focus'],
  week: ['must', 'should', 'stretch'],
  month: ['must', 'should', 'stretch'],
}

export const PLANNING_BUCKET_LABELS = {
  focus: 'Today Focus',
  must: 'Must do',
  should: 'Should do',
  stretch: 'Stretch',
}

export const PLANNING_BUCKET_COLORS = {
  focus: '#22d3ee',
  must: '#10b981',
  should: '#f59e0b',
  stretch: '#a78bfa',
}

export const PLANNING_PERIOD_LABELS = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
}

export const toIsoDate = (value) => format(startOfDay(new Date(value)), 'yyyy-MM-dd')

export const getPeriodBounds = (periodType, referenceDate = new Date()) => {
  const date = startOfDay(new Date(referenceDate))

  if (periodType === 'day') {
    return {
      start: date,
      end: date,
      startKey: toIsoDate(date),
      endKey: toIsoDate(date),
      label: format(date, 'EEEE, MMM d'),
    }
  }

  if (periodType === 'month') {
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    return {
      start,
      end,
      startKey: toIsoDate(start),
      endKey: toIsoDate(end),
      label: format(start, 'MMMM yyyy'),
    }
  }

  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return {
    start,
    end,
    startKey: toIsoDate(start),
    endKey: toIsoDate(end),
    label: `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`,
  }
}

export const getPreviousPeriodBounds = (periodType, referenceDate = new Date()) => {
  const bounds = getPeriodBounds(periodType, referenceDate)
  if (periodType === 'day') return getPeriodBounds('day', new Date(bounds.start.getTime() - 24 * 60 * 60 * 1000))
  if (periodType === 'month') return getPeriodBounds('month', addMonths(bounds.start, -1))
  return getPeriodBounds('week', addWeeks(bounds.start, -1))
}

export const getNextPeriodBounds = (periodType, referenceDate = new Date()) => {
  const bounds = getPeriodBounds(periodType, referenceDate)
  if (periodType === 'day') return getPeriodBounds('day', new Date(bounds.start.getTime() + 24 * 60 * 60 * 1000))
  if (periodType === 'month') return getPeriodBounds('month', addMonths(bounds.start, 1))
  return getPeriodBounds('week', addWeeks(bounds.start, 1))
}

export const matchesCommitmentPeriod = (commitment, periodType, periodStart) =>
  commitment?.periodType === periodType && commitment?.periodStart === periodStart

export const groupCommitmentsByBucket = (commitments = [], periodType) => {
  const buckets = Object.fromEntries((PLANNING_BUCKETS[periodType] ?? []).map((bucket) => [bucket, []]))
  commitments.forEach((commitment) => {
    const bucket = commitment.bucket
    if (!buckets[bucket]) buckets[bucket] = []
    buckets[bucket].push(commitment)
  })
  Object.keys(buckets).forEach((bucket) => {
    buckets[bucket].sort((left, right) => {
      const leftOrder = Number.isFinite(left.sortOrder) ? left.sortOrder : 0
      const rightOrder = Number.isFinite(right.sortOrder) ? right.sortOrder : 0
      return leftOrder - rightOrder
    })
  })
  return buckets
}

export const isCommitmentCurrent = (commitment, periodType, referenceDate = new Date()) => {
  const bounds = getPeriodBounds(periodType, referenceDate)
  return matchesCommitmentPeriod(commitment, periodType, bounds.startKey)
}

export const isForToday = (value) => value && isSameDay(new Date(value), new Date())

export const resolveAutoPlanningBucket = (task, periodType) => {
  if (periodType === 'day') return 'focus'
  if (task.status === 'in-progress' || task.status === 'review') return 'must'
  if (task.priority === 'critical' || task.priority === 'high') return 'must'
  if (task.priority === 'medium') return 'should'
  return 'stretch'
}

export const taskQualifiesForPlanningPeriod = (task, periodType, bounds) => {
  if (!task || task.deletedAt || task.status === 'done' || !task.startDate) return false
  if (periodType === 'day') return false

  const startDate = startOfDay(new Date(task.startDate))
  if (Number.isNaN(startDate.getTime())) return false

  return startDate <= bounds.end
}
