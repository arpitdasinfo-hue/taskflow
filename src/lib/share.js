export const SHARE_STATUS = {
  active: 'active',
  disabled: 'disabled',
  revoked: 'revoked',
  expired: 'expired',
}

export const SHARE_MODULE_OPTIONS = [
  { key: 'overview', label: 'Summary' },
  { key: 'analytics', label: 'Portfolio' },
  { key: 'projects', label: 'Delivery' },
  { key: 'tasks', label: 'Watchlist' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'gantt', label: 'Timeline' },
  { key: 'dependencies', label: 'Dependency Signals' },
]

export const TASK_STATUS_OPTIONS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'review', label: 'In Review' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
]

export const TASK_PRIORITY_OPTIONS = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

export const DEFAULT_SHARE_CONFIG = {
  layout: 'manager',
  modules: {
    overview: true,
    analytics: true,
    projects: true,
    tasks: false,
    milestones: true,
    gantt: false,
    dependencies: false,
  },
  filters: {
    includeCompleted: true,
    status: [],
    priority: [],
    dueFrom: '',
    dueTo: '',
  },
}

const uniq = (items) => [...new Set((items ?? []).filter(Boolean))]

export const normalizeShareConfig = (raw) => {
  const candidate = raw && typeof raw === 'object' ? raw : {}
  const normalizedModules = {
    ...DEFAULT_SHARE_CONFIG.modules,
    ...(candidate.modules && typeof candidate.modules === 'object' ? candidate.modules : {}),
  }

  delete normalizedModules.details

  return {
    layout: candidate.layout === 'manager' ? 'manager' : DEFAULT_SHARE_CONFIG.layout,
    modules: normalizedModules,
    filters: {
      includeCompleted: candidate?.filters?.includeCompleted ?? DEFAULT_SHARE_CONFIG.filters.includeCompleted,
      status: uniq(candidate?.filters?.status),
      priority: uniq(candidate?.filters?.priority),
      dueFrom: candidate?.filters?.dueFrom || '',
      dueTo: candidate?.filters?.dueTo || '',
    },
  }
}

export const shareStatus = (link) => {
  if (!link) return SHARE_STATUS.disabled
  if (link.revoked_at) return SHARE_STATUS.revoked
  if (link.disabled) return SHARE_STATUS.disabled
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return SHARE_STATUS.expired
  return SHARE_STATUS.active
}

export const isShareLinkActive = (link) => shareStatus(link) === SHARE_STATUS.active

export const scopeLabel = (resourceType) => {
  if (resourceType === 'workspace') return 'Workspace'
  if (resourceType === 'program') return 'Program'
  if (resourceType === 'project') return 'Project'
  return resourceType || 'Scope'
}
