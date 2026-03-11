import { memo, useState } from 'react'
import { Palette, Database, Info, Trash2, Download, FileText, Table } from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import ThemeSelector from '../components/common/ThemeSelector'
import ExportModal from '../components/settings/ExportModal'
import Header from '../components/layout/Header'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'
import { useTaskStats } from '../hooks/useFilteredTasks'

const Section = memo(function Section({ icon: Icon, title, children }) {
  return (
    <GlassCard padding="p-5" className="mb-4">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-dim)' }}
        >
          <Icon size={14} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
      </div>
      {children}
    </GlassCard>
  )
})

const Settings = memo(function Settings() {
  const tasks    = useTaskStore((s) => s.tasks)
  const { total, done, inProgress } = useTaskStats()
  const themeIndex = useSettingsStore((s) => s.themeIndex)
  const [showExport, setShowExport] = useState(false)

  const exportData = () => {
    const data = JSON.stringify({ tasks, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'taskflow-backup.json'
    a.click(); URL.revokeObjectURL(url)
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

        {/* Theme */}
        <Section icon={Palette} title="Theme">
          <ThemeSelector />
        </Section>

        {/* Data */}
        <Section icon={Database} title="Data & Storage">
          <div className="space-y-3">
            {[
              { label: 'Total Tasks',   value: total      },
              { label: 'Completed',     value: done       },
              { label: 'In Progress',   value: inProgress },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="pt-3 flex gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
              >
                <Download size={13} />
                Export JSON
              </button>
              <button
                onClick={clearAllData}
                className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 size={13} />
                Clear All Data
              </button>
            </div>
          </div>
        </Section>

        {/* Export */}
        <Section icon={Download} title="Export">
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Export your tasks and projects data for backup or analysis.
          </p>
          <button
            onClick={() => setShowExport(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
          >
            <Download size={13} />
            Export Data (CSV / PDF)
          </button>
        </Section>

        {/* About */}
        <Section icon={Info} title="About">
          <div className="space-y-2.5">
            {[
              { label: 'App',      value: 'TaskFlow' },
              { label: 'Version',  value: '1.0.0'    },
              { label: 'Storage',  value: 'Local — 100% private, no server' },
              { label: 'Theme',    value: `${themeIndex + 1} of 12` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
    {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </>
  )
})

export default Settings
