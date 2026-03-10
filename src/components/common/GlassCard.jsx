import { memo } from 'react'

const GlassCard = memo(function GlassCard({
  children,
  className = '',
  onClick,
  hover = false,
  active = false,
  padding = 'p-4',
  rounded = 'rounded-2xl',
  style,
}) {
  return (
    <div
      className={`glass ${rounded} ${padding} ${hover ? 'glass-hover cursor-pointer' : ''} ${active ? 'glass-active' : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
})

export default GlassCard
