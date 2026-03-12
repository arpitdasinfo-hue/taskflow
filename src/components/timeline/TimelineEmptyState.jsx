import { memo } from 'react'
import { Calendar } from 'lucide-react'

const TimelineEmptyState = memo(function TimelineEmptyState({ filtered }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(var(--accent-rgb),0.12)' }}>
        <Calendar size={22} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {filtered ? 'No scheduled items match this view' : 'No Gantt data yet'}
      </p>
      <p className="text-xs text-center max-w-sm" style={{ color: 'var(--text-secondary)' }}>
        {filtered
          ? 'Try clearing filters to broaden the Gantt view.'
          : 'Set start dates or due dates on projects/tasks and they will appear in this Gantt chart.'}
      </p>
    </div>
  )
})

export default TimelineEmptyState
