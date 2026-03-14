import { memo } from 'react'
import GlassCard from './GlassCard'

const ScopeBar = memo(function ScopeBar({
  eyebrow = 'Scope',
  title,
  description = null,
  controls,
  actions = null,
  compact = false,
  className = '',
}) {
  return (
    <GlassCard
      padding={compact ? 'p-3.5' : 'p-4'}
      rounded="rounded-[24px]"
      className={className}
      style={{
        background: compact ? 'rgba(255,255,255,0.028)' : undefined,
      }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-secondary)' }}>
            {eyebrow}
          </div>
          {title && (
            <div className="mt-2 text-sm md:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </div>
          )}
          {description && (
            <p className="mt-1 text-xs md:text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
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
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {controls}
      </div>
    </GlassCard>
  )
})

export default ScopeBar
