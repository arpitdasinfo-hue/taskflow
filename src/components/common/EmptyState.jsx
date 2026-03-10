import { memo } from 'react'
import { ClipboardList } from 'lucide-react'

const EmptyState = memo(function EmptyState({ icon: Icon = ClipboardList, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center anim-fade-in">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--accent-dim)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
      >
        <Icon size={28} style={{ color: 'var(--accent)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-4 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {action && action}
    </div>
  )
})

export default EmptyState
