import { memo } from 'react'

const STATUS_CONFIG = {
  planning:  { label: 'Planning',   color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  active:    { label: 'Active',     color: '#22d3ee', bg: 'rgba(34,211,238,0.15)'  },
  'on-hold': { label: 'On Hold',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  completed: { label: 'Completed',  color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
}

const HEALTH_CONFIG = {
  'on-track':  { label: 'On Track',  color: '#10b981' },
  'at-risk':   { label: 'At Risk',   color: '#f59e0b' },
  'off-track': { label: 'Off Track', color: '#ef4444' },
}

export const ProgramStatusBadge = memo(function ProgramStatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.planning
  const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]'
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold ${textSize}`}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
})

export const ProgramHealthBadge = memo(function ProgramHealthBadge({ health }) {
  const cfg = HEALTH_CONFIG[health] ?? HEALTH_CONFIG['on-track']
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
      style={{ background: `${cfg.color}18`, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
})

export const STATUS_OPTIONS = Object.keys(STATUS_CONFIG)
export { STATUS_CONFIG }
