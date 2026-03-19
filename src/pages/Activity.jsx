import { memo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Trash2, ArrowRightLeft, Edit3, Calendar, Clock, Trash } from 'lucide-react'
import Header from '../components/layout/Header'
import PageHero from '../components/common/PageHero'
import useActivityStore from '../store/useActivityStore'
import useSettingsStore from '../store/useSettingsStore'

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

const FILTERS = [
  { id: 'all',     label: 'All'     },
  { id: 'created', label: 'Created' },
  { id: 'status',  label: 'Status'  },
  { id: 'updated', label: 'Updates' },
  { id: 'deleted', label: 'Deleted' },
]

function formatVal(field, value) {
  if (value == null) return '—'
  if ((field === 'dueDate' || field === 'startDate') && value) {
    try { return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return value }
  }
  return String(value)
}

function describeActivity(entry) {
  if (entry.action === 'created') return `"${entry.entityTitle}" was created`
  if (entry.action === 'deleted') return `"${entry.entityTitle}" was moved to trash`
  if (entry.action === 'status_changed') return `"${entry.entityTitle}" status: ${formatVal('status', entry.oldValue)} → ${formatVal('status', entry.newValue)}`
  if (entry.action === 'updated' && entry.field) {
    return `"${entry.entityTitle}" ${FIELD_LABEL[entry.field] ?? entry.field}: ${formatVal(entry.field, entry.oldValue)} → ${formatVal(entry.field, entry.newValue)}`
  }
  return `"${entry.entityTitle}" was updated`
}

const Activity = memo(function Activity() {
  const activities    = useActivityStore((s) => s.activities)
  const clearActivity = useActivityStore((s) => s.clearActivity)
  const selectTask    = useSettingsStore((s) => s.selectTask)
  const [filter, setFilter] = useState('all')

  const filtered = activities.filter((a) => {
    if (filter === 'all')     return true
    if (filter === 'created') return a.action === 'created'
    if (filter === 'status')  return a.action === 'status_changed'
    if (filter === 'updated') return a.action === 'updated'
    if (filter === 'deleted') return a.action === 'deleted'
    return true
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
        <PageHero
          title="Activity"
          description="A log of all task changes and events in your workspace."
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                  style={filter === f.id
                    ? { background: 'rgba(var(--accent-rgb),0.2)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
            {activities.length > 0 && (
              <button
                onClick={clearActivity}
                className="text-xs px-3 py-1.5 rounded-xl"
                style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                Clear all
              </button>
            )}
          </div>
        </PageHero>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Clock size={32} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {activities.length === 0 ? 'No activity yet. Changes to tasks will appear here.' : 'No activity matches this filter.'}
            </p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-2 mt-4">
            {filtered.map((entry) => {
              const Icon = ACTION_ICON[entry.action] ?? Edit3
              const color = ACTION_COLOR[entry.action] ?? 'var(--text-secondary)'
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 px-4 py-3 rounded-2xl transition-colors hover:bg-white/3"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${color}18` }}
                  >
                    <Icon size={12} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {describeActivity(entry)}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {entry.taskId && entry.action !== 'deleted' && (
                    <button
                      onClick={() => selectTask(entry.taskId)}
                      className="text-[11px] px-2 py-1 rounded-lg flex-shrink-0 hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
                    >
                      Open
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})

export default Activity
