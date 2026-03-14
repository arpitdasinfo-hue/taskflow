import { memo } from 'react'
import GlassCard from './GlassCard'

const STAT_TONE = {
  default: {
    background: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
  },
  accent: {
    background: 'rgba(var(--accent-rgb),0.12)',
    border: 'rgba(var(--accent-rgb),0.2)',
    color: 'var(--accent)',
  },
  success: {
    background: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.2)',
    color: '#10b981',
  },
  danger: {
    background: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.2)',
    color: '#ef4444',
  },
}

const HeroStat = memo(function HeroStat({ label, value, tone = 'default' }) {
  const palette = STAT_TONE[tone] ?? STAT_TONE.default

  return (
    <div
      className="rounded-2xl px-4 py-3 min-w-[124px]"
      style={{ background: palette.background, border: `1px solid ${palette.border}` }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold leading-none" style={{ color: palette.color }}>
        {value}
      </div>
    </div>
  )
})

const PageHero = memo(function PageHero({
  eyebrow = null,
  title,
  description = null,
  actions = null,
  stats = [],
  children = null,
  className = '',
}) {
  return (
    <GlassCard padding="p-6" rounded="rounded-[30px]" className={className}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
              {eyebrow}
            </div>
          )}
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-[2rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h1>
              {description && (
                <p className="mt-3 max-w-3xl text-sm md:text-base leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-wrap xl:justify-end">
                {actions}
              </div>
            )}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:max-w-[520px]">
            {stats.map((stat) => (
              <HeroStat key={stat.label} {...stat} />
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  )
})

export default PageHero
