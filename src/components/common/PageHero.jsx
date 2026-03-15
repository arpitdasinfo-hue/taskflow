import { memo } from 'react'
import GlassCard from './GlassCard'
import InfoTooltip from './InfoTooltip'

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

const HeroStat = memo(function HeroStat({ label, value, tone = 'default', compact = false }) {
  const palette = STAT_TONE[tone] ?? STAT_TONE.default

  return (
    <div
      className={`rounded-2xl ${compact ? 'px-3 py-2 min-w-[102px]' : 'px-4 py-3 min-w-[124px]'}`}
      style={{ background: palette.background, border: `1px solid ${palette.border}` }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className={`${compact ? 'mt-1 text-[1.8rem]' : 'mt-2 text-2xl'} font-bold leading-none`} style={{ color: palette.color }}>
        {value}
      </div>
    </div>
  )
})

const PageHero = memo(function PageHero({
  eyebrow = null,
  title,
  description = null,
  infoText = null,
  actions = null,
  stats = [],
  children = null,
  compact = false,
  className = '',
}) {
  return (
    <GlassCard padding={compact ? 'p-4 md:p-5' : 'p-6'} rounded="rounded-[30px]" className={className}>
      <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-5'} xl:flex-row xl:items-start xl:justify-between`}>
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--text-secondary)' }}>
              {eyebrow}
            </div>
          )}
          <div className={`mt-2 flex flex-col ${compact ? 'gap-2' : 'gap-3'} lg:flex-row lg:items-start lg:justify-between`}>
            <div className="min-w-0">
              <h1 className={`${compact ? 'text-[1.6rem] md:text-[1.95rem]' : 'text-2xl md:text-[2rem]'} font-bold leading-tight`} style={{ color: 'var(--text-primary)' }}>
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span>{title}</span>
                  <InfoTooltip text={infoText} align="right" widthClassName="w-72" />
                </span>
              </h1>
              {description && (
                <p className={`${compact ? 'mt-2 max-w-2xl text-sm leading-6' : 'mt-3 max-w-3xl text-sm md:text-base leading-7'}`} style={{ color: 'var(--text-secondary)' }}>
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
          {children && <div className={compact ? 'mt-3' : 'mt-4'}>{children}</div>}
        </div>

        {stats.length > 0 && (
          <div className={`grid grid-cols-2 gap-2 ${compact ? 'md:grid-cols-4 xl:max-w-[500px]' : 'md:grid-cols-4 xl:max-w-[520px]'}`}>
            {stats.map((stat) => (
              <HeroStat key={stat.label} compact={compact} {...stat} />
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  )
})

export default PageHero
