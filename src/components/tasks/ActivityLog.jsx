import { memo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Trash2, ArrowRightLeft, Edit3, Calendar } from 'lucide-react'
import useActivityStore from '../../store/useActivityStore'
import useSettingsStore from '../../store/useSettingsStore'

const ACTION_ICON = {
  created:        Plus,
  deleted:        Trash2,
  status_changed: ArrowRightLeft,
  updated:        Edit3,
  planned:        Calendar,
}

const ACTION_COLOR = {
  created:        '#10b981',
  deleted:        '#ef4444',
  status_changed: 'var(--accent)',
  updated:        '#f59e0b',
  planned:        '#7dd3fc',
}

const FIELD_LABEL = {
  status:    'Status',
  priority:  'Priority',
  title:     'Title',
  dueDate:   'Due date',
  startDate: 'Start date',
}

function formatVal(field, value) {
  if (value == null) return '—'
  if ((field === 'dueDate' || field === 'startDate') && value) {
    try { return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return value }
  }
  return String(value)
}

const ActivityLog = memo(function ActivityLog({ taskId }) {
  const activities = useActivityStore((s) =>
    s.activities.filter((a) => a.taskId === taskId)
  )
  const selectTask = useSettingsStore((s) => s.selectTask)

  if (activities.length === 0) {
    return (
      <p className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
        No activity recorded yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((entry) => {
        const Icon = ACTION_ICON[entry.action] ?? Edit3
        const color = ACTION_COLOR[entry.action] ?? 'var(--text-secondary)'
        return (
          <div key={entry.id} className="flex items-start gap-3">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${color}18` }}
            >
              <Icon size={11} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                {entry.action === 'created' && <>Task created</>}
                {entry.action === 'deleted' && <>Moved to trash</>}
                {entry.action === 'status_changed' && (
                  <>Status: <span style={{ color: 'var(--text-secondary)' }}>{formatVal('status', entry.oldValue)}</span>{' → '}<span style={{ color }}>{formatVal('status', entry.newValue)}</span></>
                )}
                {entry.action === 'updated' && entry.field && (
                  <>{FIELD_LABEL[entry.field] ?? entry.field}: <span style={{ color: 'var(--text-secondary)' }}>{formatVal(entry.field, entry.oldValue)}</span>{' → '}<span style={{ color }}>{formatVal(entry.field, entry.newValue)}</span></>
                )}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
})

export default ActivityLog
