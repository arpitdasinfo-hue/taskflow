import { memo, useState } from 'react'
import { Info } from 'lucide-react'

const InfoTooltip = memo(function InfoTooltip({ text, className = '' }) {
  const [show, setShow] = useState(false)

  if (!text) return null

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <Info size={13} style={{ color: 'var(--accent)', opacity: show ? 0.8 : 0.45 }} />
      {show && (
        <div
          className="absolute bottom-full left-0 mb-1.5 z-50 w-56 px-3 py-2 rounded-xl text-xs pointer-events-none"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          {text}
        </div>
      )}
    </span>
  )
})

export default InfoTooltip
