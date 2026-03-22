import { memo } from 'react'
import GlassCard from './GlassCard'
import InfoTooltip from './InfoTooltip'

const ScopeBar = memo(function ScopeBar({
  eyebrow = 'Scope',
  title,
  description = null,
  infoText = null,
  controls,
  actions = null,
  compact = false,
  minimal = false,
  className = '',
}) {
  const dense = compact || minimal
  const hasHeader = Boolean(eyebrow || title || description || actions)

  if (!hasHeader) {
    return (
      <GlassCard
        padding={dense ? 'p-3' : 'p-4'}
        rounded="rounded-[24px]"
        className={className}
        style={{
          background: dense ? 'rgba(255,255,255,0.028)' : undefined,
        }}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {controls}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-wrap lg:justify-end">
              {actions}
            </div>
          )}
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard
      padding={dense ? 'p-3' : 'p-4'}
      rounded="rounded-[24px]"
      className={className}
      style={{
        background: dense ? 'rgba(255,255,255,0.028)' : undefined,
      }}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
              {eyebrow}
            </div>
          )}
          {title && (
            <div className="mt-1.5 text-sm md:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              <span className="inline-flex items-center gap-2 flex-wrap">
                <span>{title}</span>
                <InfoTooltip text={infoText} align="right" widthClassName="w-72" />
              </span>
            </div>
          )}
          {description && (
            <p className={`${dense ? 'mt-1 text-[11px]' : 'mt-1 text-xs md:text-sm'} leading-6`} style={{ color: 'var(--text-secondary)' }}>
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
      <div className={`${dense ? 'mt-3' : 'mt-4'} flex flex-wrap items-center gap-2`}>
        {controls}
      </div>
    </GlassCard>
  )
})

export default ScopeBar
