import { addDays, addWeeks, addMonths } from 'date-fns'

/**
 * Given a recurring task, compute the start/due dates for the next occurrence.
 * Returns { startDate, dueDate } (ISO strings) or null if no more occurrences.
 */
export function computeNextOccurrence(task) {
  const rec = task.recurrence
  if (!rec) return null

  const { type, interval = 1, endType, endDate, endCount, occurrenceCount = 0 } = rec

  // Check count-based end condition before computing next
  if (endType === 'count' && endCount != null && occurrenceCount >= endCount) return null

  // Reference date: prefer dueDate, fall back to startDate, then today
  const refDate = new Date(task.dueDate ?? task.startDate ?? new Date())
  // If the reference date is in the future, don't spawn yet
  // (next occurrence is only spawned when this one is marked done)

  let nextStart = null
  let nextDue   = null

  const durMs = task.dueDate && task.startDate
    ? new Date(task.dueDate) - new Date(task.startDate)
    : 0

  const bump = (date) => {
    if (type === 'daily')   return addDays(date, interval)
    if (type === 'weekly')  return addWeeks(date, interval)
    if (type === 'monthly') return addMonths(date, interval)
    return addDays(date, interval)
  }

  nextDue = bump(refDate)

  // Check date-based end condition
  if (endType === 'date' && endDate && nextDue > new Date(endDate)) return null

  if (task.startDate && durMs > 0) {
    nextStart = new Date(nextDue.getTime() - durMs)
    nextStart = nextStart.toISOString()
  }

  return {
    startDate: nextStart,
    dueDate: nextDue.toISOString(),
  }
}

/**
 * Returns true if a next occurrence should be spawned.
 */
export function shouldSpawnNext(task) {
  if (!task.recurrence) return false
  const { endType, endDate, endCount, occurrenceCount = 0 } = task.recurrence
  if (endType === 'count' && endCount != null && occurrenceCount >= endCount) return false
  if (endType === 'date' && endDate && new Date() > new Date(endDate)) return false
  return true
}
