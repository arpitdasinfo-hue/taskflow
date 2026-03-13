export const ZOOM_CONFIGS = {
  week: { id: 'week', label: '2 Weeks', days: 14, cellWidth: 56 },
  month: { id: 'month', label: '2 Months', days: 56, cellWidth: 24 },
  quarter: { id: 'quarter', label: 'Quarter', days: 112, cellWidth: 14 },
  custom: { id: 'custom', label: 'Custom', days: 30, cellWidth: 24 },
}

export const TIMELINE_VIEW_MODES = {
  roadmap: {
    id: 'roadmap',
    label: 'Roadmap',
    description: 'Programs and projects first. Tasks stay tucked under the hierarchy.',
  },
  delivery: {
    id: 'delivery',
    label: 'Delivery',
    description: 'Execution view with projects, tasks, milestones, and schedule context.',
  },
  risk: {
    id: 'risk',
    label: 'Risk',
    description: 'Pull forward delayed, blocked, and dependency-risk work.',
  },
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
  program: 48,
  project: 42,
  task: 36,
}

export const DEFAULT_ZOOM = 'month'

export const DEFAULT_OFFSET_BY_ZOOM = {
  week: -3,
  month: -14,
  quarter: -28,
  custom: -14,
}
