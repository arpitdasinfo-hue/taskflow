export const ZOOM_CONFIGS = {
  week: { id: 'week', label: 'Week', days: 14, cellWidth: 56 },
  month: { id: 'month', label: 'Month', days: 56, cellWidth: 24 },
  quarter: { id: 'quarter', label: 'Quarter', days: 112, cellWidth: 14 },
}

export const STATUS_COLOR = {
  todo: '#94a3b8',
  'in-progress': '#22d3ee',
  review: '#f59e0b',
  done: '#10b981',
  blocked: '#ef4444',
}

export const PRIORITY_COLOR = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#94a3b8',
}

export const ROW_HEIGHT = {
  program: 42,
  project: 38,
  task: 34,
}

export const DEFAULT_ZOOM = 'month'

export const DEFAULT_OFFSET_BY_ZOOM = {
  week: -3,
  month: -14,
  quarter: -28,
}
