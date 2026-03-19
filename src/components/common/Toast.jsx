import { memo } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import useToastStore from '../../store/useToastStore'

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

const COLORS = {
  success: { icon: '#10b981', border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.08)' },
  error:   { icon: '#ef4444', border: 'rgba(239,68,68,0.25)',  bg: 'rgba(239,68,68,0.08)'  },
  warning: { icon: '#f59e0b', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.08)' },
  info:    { icon: 'var(--accent)', border: 'rgba(var(--accent-rgb),0.25)', bg: 'rgba(var(--accent-rgb),0.08)' },
}

const ToastItem = memo(function ToastItem({ id, message, type = 'info' }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const Icon = ICONS[type] ?? Info
  const color = COLORS[type] ?? COLORS.info

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm max-w-[360px] w-full shadow-lg animate-fade-in"
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      role="alert"
    >
      <Icon size={15} className="flex-shrink-0 mt-0.5" style={{ color: color.icon }} />
      <p className="flex-1 leading-snug" style={{ color: 'var(--text-primary)' }}>{message}</p>
      <button
        onClick={() => removeToast(id)}
        className="flex-shrink-0 p-0.5 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
})

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  )
}
