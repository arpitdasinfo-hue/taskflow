const toTimestamp = (value) => {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

const compareNullable = (left, right) => {
  if (left === right) return 0
  if (left === null) return 1
  if (right === null) return -1
  return left - right
}

export const sortTasksByStartDate = (items = []) => [...items].sort((left, right) => {
  const startCompare = compareNullable(toTimestamp(left.startDate), toTimestamp(right.startDate))
  if (startCompare !== 0) return startCompare

  const leftDue = toTimestamp(left.dueDate)
  const rightDue = toTimestamp(right.dueDate)
  if (leftDue !== null && rightDue !== null) {
    const dueCompare = compareNullable(leftDue, rightDue)
    if (dueCompare !== 0) return dueCompare
  }

  const createdCompare = compareNullable(toTimestamp(left.createdAt), toTimestamp(right.createdAt))
  if (createdCompare !== 0) return createdCompare

  return String(left.title || '').localeCompare(String(right.title || ''))
})
