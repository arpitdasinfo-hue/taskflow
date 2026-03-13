import { memo } from 'react'
import { CalendarSync, RotateCcw, X } from 'lucide-react'

const TimelineActionToast = memo(function TimelineActionToast({
  itemLabel,
  actionLabel,
  showUndo = true,
  onUndo,
  onDismiss,
}) {
  if (!itemLabel || !actionLabel) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-[20px] px-4 py-3"
      style={{
        background: 'rgba(8,20,35,0.96)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.34)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}
        >
          <CalendarSync size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {actionLabel}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {itemLabel}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {showUndo && (
              <button
                onClick={onUndo}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.22)' }}
              >
                <RotateCcw size={12} />
                Undo
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg flex-shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Dismiss timeline notice"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
})

export default TimelineActionToast
