import { STATUS_COLOR } from './timelineConfig'
import { clamp, formatDateShort, startOfDay, toDisplayDate } from './timelineUtils'

const BAR_METRICS = {
  program: { height: 22, radius: 999, labelMinWidth: 92, compactLabelMinWidth: 78, handleWidth: 8, capWidth: 3 },
  project: { height: 18, radius: 999, labelMinWidth: 78, compactLabelMinWidth: 68, handleWidth: 7, capWidth: 3 },
  task: { height: 12, radius: 999, labelMinWidth: 62, compactLabelMinWidth: 56, handleWidth: 6, capWidth: 2 },
}

const STATUS_LABEL = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
}

const clip = (value, max) =>
  value.length > max ? `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…` : value

const acronym = (value) =>
  String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

export const withAlpha = (color, alphaHex, fallback = 'rgba(var(--accent-rgb),0.18)') => {
  if (typeof color === 'string' && color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    if (color.length === 4) {
      const expanded = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      return `${expanded}${alphaHex}`
    }
    return `${color}${alphaHex}`
  }

  return fallback
}

export const getBarDisplayLabel = ({ title, width, cellWidth, type }) => {
  if (!title) return ''

  const text = String(title).trim()
  if (!text) return ''

  const compactTimeWindow = cellWidth <= 14
  const metrics = BAR_METRICS[type] ?? BAR_METRICS.task
  const labelFloor = compactTimeWindow ? metrics.compactLabelMinWidth : metrics.labelMinWidth

  if (width < labelFloor) return ''

  if (compactTimeWindow) {
    if (width >= 110) return clip(text, type === 'program' ? 16 : 12)
    if (width >= 76) return acronym(text) || clip(text, 8)
    return clip(text, 6)
  }

  if (width >= 220) return clip(text, type === 'program' ? 30 : 24)
  if (width >= 140) return clip(text, type === 'program' ? 20 : 16)
  if (width >= 92) return clip(text, 11)
  return clip(text, 8)
}

export const getBarVisuals = ({ type, item, rowColor, width, cellWidth, readOnly = false }) => {
  const metrics = BAR_METRICS[type] ?? BAR_METRICS.task
  const color = item.color || STATUS_COLOR[item.status] || rowColor || 'var(--accent)'
  const due = toDisplayDate(item.dueDate)
  const isLate = !!(due && due < startOfDay(new Date()) && item.status !== 'done')
  const isBlocked = item.status === 'blocked'
  const isDone = item.status === 'done'
  const progress = typeof item.progress === 'number'
    ? clamp(item.progress, 0, 1)
    : isDone
      ? 1
      : item.status === 'in-progress'
        ? 0.56
        : item.status === 'review'
          ? 0.82
          : 0
  const accentColor = isLate ? '#fb7185' : isDone ? '#34d399' : color
  const baseFill = readOnly
    ? `linear-gradient(180deg, ${withAlpha(color, '20')} 0%, ${withAlpha(color, '12')} 100%)`
    : `linear-gradient(180deg, ${withAlpha(color, '2A')} 0%, ${withAlpha(color, '16')} 100%)`
  const background = isBlocked
    ? `repeating-linear-gradient(135deg, ${withAlpha(color, readOnly ? '26' : '2F')} 0 8px, rgba(255,255,255,0.04) 8px 16px)`
    : baseFill
  const progressFill = isDone
    ? 'linear-gradient(90deg, rgba(16,185,129,0.92), rgba(52,211,153,0.55))'
    : item.status === 'review'
      ? 'linear-gradient(90deg, rgba(245,158,11,0.88), rgba(251,191,36,0.38))'
      : `linear-gradient(90deg, ${withAlpha(accentColor, readOnly ? 'AA' : 'CC', 'rgba(var(--accent-rgb),0.72)')}, ${withAlpha(accentColor, readOnly ? '44' : '66', 'rgba(var(--accent-rgb),0.26)')})`
  const borderColor = isLate ? '#fb7185' : withAlpha(color, readOnly ? '96' : 'B8', 'rgba(var(--accent-rgb),0.52)')
  const glowColor = isLate ? 'rgba(251,113,133,0.26)' : withAlpha(color, readOnly ? '1E' : '28', 'rgba(var(--accent-rgb),0.18)')
  const boxShadow = isLate
    ? '0 0 0 1px rgba(251,113,133,0.34), 0 10px 24px rgba(251,113,133,0.18)'
    : readOnly
      ? `0 8px 18px ${glowColor}`
      : width > 120
        ? `0 10px 24px ${glowColor}`
        : `0 6px 14px ${glowColor}`

  return {
    ...metrics,
    color,
    accentColor,
    progress,
    isLate,
    isBlocked,
    isDone,
    background,
    progressFill,
    borderColor,
    boxShadow,
    label: getBarDisplayLabel({ title: item.title || '', width, cellWidth, type }),
  }
}

export const getBarHoverMeta = ({ type, item, progress }) => {
  const start = toDisplayDate(item.startDate)
  const due = toDisplayDate(item.dueDate)

  return {
    sectionLabel: type === 'program' ? 'Program timeline' : type === 'project' ? 'Project window' : 'Task schedule',
    statusLabel: STATUS_LABEL[item.status] ?? item.status ?? 'Planned',
    startLabel: start ? formatDateShort(start) : 'Not set',
    dueLabel: due ? formatDateShort(due) : 'Not set',
    progressLabel: `${Math.round(progress * 100)}% complete`,
  }
}
