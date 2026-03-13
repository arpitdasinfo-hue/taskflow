import { memo, useMemo, useState } from 'react'
import { CalendarPlus2, Check, ChevronDown } from 'lucide-react'
import usePlanningStore from '../../store/usePlanningStore'
import { getPeriodBounds } from '../../lib/planning'

const TARGETS = [
  { id: 'day', label: 'Today Focus', bucket: 'focus' },
  { id: 'week', label: 'This Week', bucket: 'must' },
  { id: 'month', label: 'This Month', bucket: 'must' },
]

const CommitTaskMenu = memo(function CommitTaskMenu({
  taskId,
  align = 'right',
  compact = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const commitments = usePlanningStore((state) => state.commitments)
  const commitTask = usePlanningStore((state) => state.commitTask)

  const activeTargets = useMemo(() => {
    const today = getPeriodBounds('day').startKey
    const week = getPeriodBounds('week').startKey
    const month = getPeriodBounds('month').startKey

    return {
      day: commitments.some((entry) => entry.taskId === taskId && entry.periodType === 'day' && entry.periodStart === today),
      week: commitments.some((entry) => entry.taskId === taskId && entry.periodType === 'week' && entry.periodStart === week),
      month: commitments.some((entry) => entry.taskId === taskId && entry.periodType === 'month' && entry.periodStart === month),
    }
  }, [commitments, taskId])

  const handleCommit = (target) => {
    commitTask({ taskId, periodType: target.id, bucket: target.bucket })
    setOpen(false)
  }

  return (
    <div className={`relative ${className}`} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-1 rounded-xl transition-colors ${compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-2 text-xs'}`}
        style={{
          background: open ? 'rgba(var(--accent-rgb),0.14)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: open ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        <CalendarPlus2 size={compact ? 12 : 13} />
        {!compact && <span className="font-medium">Plan</span>}
        <ChevronDown size={compact ? 11 : 12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full mt-2 min-w-[180px] rounded-2xl overflow-hidden z-50 anim-slide-down ${align === 'left' ? 'left-0' : 'right-0'}`}
            style={{
              background: '#ffffff',
              border: '1px solid rgba(15,23,42,0.12)',
              boxShadow: '0 18px 48px rgba(15,23,42,0.18)',
            }}
          >
            {TARGETS.map((target) => {
              const active = activeTargets[target.id]
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => handleCommit(target)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-left hover:bg-slate-100 transition-colors"
                  style={active ? { background: 'rgba(14,165,233,0.08)', color: '#0369a1' } : { color: '#0f172a' }}
                >
                  <span>{target.label}</span>
                  {active && <Check size={14} />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
})

export default CommitTaskMenu
