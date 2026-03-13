import { memo, useState } from 'react'
import { Info } from 'lucide-react'

const ALIGN_CLASS = {
  left: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
}

const InfoTooltip = memo(function InfoTooltip({
  text,
  className = '',
  align = 'left',
  widthClassName = 'w-56',
  iconSize = 13,
}) {
  const [show, setShow] = useState(false)

  if (!text) return null

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      onClick={() => setShow((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setShow((value) => !value)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <Info size={iconSize} style={{ color: 'var(--accent)', opacity: show ? 0.85 : 0.45 }} />
      {show && (
        <div
          className={`absolute bottom-full mb-1.5 z-50 ${widthClassName} px-3 py-2 rounded-xl text-xs ${ALIGN_CLASS[align] ?? ALIGN_CLASS.left}`}
          style={{
            background: 'rgba(10,16,28,0.96)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#e2e8f0',
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
