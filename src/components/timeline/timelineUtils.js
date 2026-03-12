export const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export const diffDays = (from, to) =>
  Math.round((startOfDay(to) - startOfDay(from)) / 86400000)

export const toDisplayDate = (value, fallback = null) => {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback
  return startOfDay(parsed)
}

export const formatDateShort = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export const formatRangeLabel = (start, end) => {
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  }

  if (sameYear) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`
  }

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
