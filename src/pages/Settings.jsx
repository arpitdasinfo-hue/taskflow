import { memo, useMemo, useState } from 'react'
import { Palette, Database, Info, Trash2, Download, Cloud, CheckCircle2, Clock3 } from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import ThemeSelector from '../components/common/ThemeSelector'
import ExportModal from '../components/settings/ExportModal'
import Header from '../components/layout/Header'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'
import { useTaskStats } from '../hooks/useFilteredTasks'

const Section = memo(function Section({ icon: Icon, title, description, action, children, className = '' }) {
  return (
    <GlassCard padding="p-5" className={className}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-dim)' }}
          >
            <Icon size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            {description && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </GlassCard>
  )
})

const StatTile = memo(function StatTile({ icon: Icon, label, value, tone = 'accent' }) {
  const toneStyle = tone === 'success'
    ? { color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }
    : tone === 'muted'
      ? { color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
      : { color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.25)' }

  return (
    <div className="rounded-xl px-3 py-2.5" style={toneStyle}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-90">
        <Icon size={12} />
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold mt-1 leading-none">{value}</div>
    </div>
  )
})

const ActionButton = memo(function ActionButton({ icon: Icon, label, tone = 'accent', onClick }) {
  const style = tone === 'danger'
    ? { background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
    : { background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 justify-center py-2.5 rounded-xl text-xs font-medium transition-colors w-full"
      style={style}
    >
      <Icon size={13} />
      {label}
    </button>
  )
})

const Row = memo(function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
})

const Divider = () => (
  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="my-3" />
)

const Settings = memo(function Settings() {
  const tasks = useTaskStore((s) => s.tasks)
  const { total, done, inProgress } = useTaskStats()
  const themeIndex = useSettingsStore((s) => s.themeIndex)
  const [showExport, setShowExport] = useState(false)

  const pending = Math.max(total - done, 0)
  const completion = total ? `${Math.round((done / total) * 100)}%` : '0%'

  const aboutRows = useMemo(() => ([
    { label: 'App', value: 'TaskFlow' },
    { label: 'Version', value: '1.0.0' },
    { label: 'Storage', value: 'Supabase sync + local cache' },
    { label: 'Theme', value: `${themeIndex + 1} of 12` },
  ]), [themeIndex])

  const exportData = () => {
    const data = JSON.stringify({ tasks, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'taskflow-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearAllData = () => {
    if (window.confirm('Delete ALL tasks? This cannot be undone.')) {
      localStorage.removeItem('taskflow-tasks')
      window.location.reload()
    }
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto py-1 space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr] items-start">
              <Section
                icon={Palette}
                title="Theme Studio"
                description="Choose your active UI theme or let TaskFlow auto-rotate weekly."
                className="h-full"
              >
                <ThemeSelector />
              </Section>

              <Section
                icon={Database}
                title="Workspace Snapshot"
                description="Quick overview of your current task load."
                className="h-full xl:sticky xl:top-4"
              >
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <StatTile icon={Cloud} label="Total" value={total} />
                  <StatTile icon={CheckCircle2} label="Done" value={done} tone="success" />
                  <StatTile icon={Clock3} label="In Progress" value={inProgress} tone="muted" />
                  <StatTile icon={Clock3} label="Pending" value={pending} tone="muted" />
                </div>

                <div className="rounded-xl px-3 py-2.5 mb-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>Completion</span>
                    <span style={{ color: 'var(--text-primary)' }}>{completion}</span>
                  </div>
                  <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: completion, background: 'linear-gradient(90deg, rgba(var(--accent-rgb),0.6), var(--accent))' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <ActionButton icon={Download} label="Export JSON Backup" onClick={exportData} />
                  <ActionButton icon={Trash2} label="Clear All Data" tone="danger" onClick={clearAllData} />
                </div>
              </Section>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <Section
                icon={Download}
                title="Advanced Export"
                description="Build scoped CSV or PDF exports with selected columns."
                action={(
                  <button
                    onClick={() => setShowExport(true)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.12)' }}
                  >
                    Open Exporter
                  </button>
                )}
              >
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Select scope by program/project, include milestones and subtasks, and choose CSV columns before export.
                </div>
              </Section>

              <Section
                icon={Info}
                title="About"
                description="App and storage information."
              >
                <div className="space-y-0.5">
                  {aboutRows.map(({ label, value }, index) => (
                    <div key={label}>
                      <Row label={label} value={value} />
                      {index < aboutRows.length - 1 && <Divider />}
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </>
  )
})

export default Settings
