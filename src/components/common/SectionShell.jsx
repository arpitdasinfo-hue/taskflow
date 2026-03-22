import { memo } from 'react'
import GlassCard from './GlassCard'
import InfoTooltip from './InfoTooltip'

const SectionShell = memo(function SectionShell({
  eyebrow = null,
  title,
  description = null,
  infoText = null,
  actions = null,
  children,
  compact = false,
  className = '',
  padding = null,
}) {
  return (
    <GlassCard
      padding={padding ?? (compact ? 'p-3.5 md:p-4' : 'p-4 md:p-5')}
      rounded="rounded-[24px]"
      className={className}
      style={{ background: compact ? 'rgba(255,255,255,0.024)' : undefined }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
              {eyebrow}
            </div>
          ) : null}

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold`} style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            {infoText ? <InfoTooltip text={infoText} align="right" widthClassName="w-72" /> : null}
          </div>

          {description ? (
            <p className={`${compact ? 'mt-1 text-[11px]' : 'mt-1.5 text-xs md:text-sm'} leading-6`} style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex items-center gap-2 flex-wrap md:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      <div className={compact ? 'mt-3' : 'mt-4'}>
        {children}
      </div>
    </GlassCard>
  )
})

export default SectionShell
