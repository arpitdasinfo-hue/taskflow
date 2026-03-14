import { memo, useState } from 'react'
import {
  Palette,
  Info,
  Download,
  Link2,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import InfoTooltip from '../components/common/InfoTooltip'
import ThemeSelector from '../components/common/ThemeSelector'
import ExportModal from '../components/settings/ExportModal'
import SharedViewsPanel from '../components/settings/SharedViewsPanel'
import Header from '../components/layout/Header'
import useSettingsStore from '../store/useSettingsStore'
import useTaskStore from '../store/useTaskStore'
import useProjectStore from '../store/useProjectStore'
import usePlanningStore from '../store/usePlanningStore'
import useWorkspaceStore from '../store/useWorkspaceStore'
import useAuthStore from '../store/useAuthStore'

const formatLastSeen = (value) => {
  if (!value) return 'Not yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not yet'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const Section = memo(function Section({
  id,
  icon: Icon,
  title,
  description,
  open,
  onToggle,
  children,
}) {
  return (
    <GlassCard padding="p-5" className="mb-4">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)' }}
          >
            <Icon size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </p>
              <InfoTooltip text={description} align="right" widthClassName="w-64" />
            </div>
          </div>
        </div>

        <span style={{ color: 'var(--text-secondary)' }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>

      {open && <div className="mt-4">{children}</div>}
    </GlassCard>
  )
})

const Settings = memo(function Settings() {
  const themeIndex = useSettingsStore((s) => s.themeIndex)
  const user = useAuthStore((s) => s.user)
  const workspaceId = useWorkspaceStore((s) => s.workspaceId)
  const workspaceError = useWorkspaceStore((s) => s.error)
  const taskSyncing = useTaskStore((s) => s.syncing)
  const taskSyncError = useTaskStore((s) => s.syncError)
  const clearTaskSyncError = useTaskStore((s) => s.clearSyncError)
  const taskLastSyncedAt = useTaskStore((s) => s.lastSyncedAt)
  const projectSyncing = useProjectStore((s) => s.syncing)
  const planningSyncing = usePlanningStore((s) => s.syncing)
  const [showExport, setShowExport] = useState(false)

  const [openSections, setOpenSections] = useState({
    theme: false,
    sharing: false,
    sync: false,
    export: false,
    about: false,
  })

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-24 md:pb-8">
          <div className="max-w-3xl mx-auto py-1">
            <Section
              id="theme"
              icon={Palette}
              title="Theme"
              description="Control visual style, contrast, and density."
              open={openSections.theme}
              onToggle={toggleSection}
            >
              <ThemeSelector />
            </Section>

            <Section
              id="sharing"
              icon={Link2}
              title="Shared Views"
              description="Create permanent shared dashboards with configurable sections and filters."
              open={openSections.sharing}
              onToggle={toggleSection}
            >
              <SharedViewsPanel />
            </Section>

            <Section
              id="sync"
              icon={Activity}
              title="Sync Diagnostics"
              description="Workspace, account, and cloud sync visibility for troubleshooting persistence issues."
              open={openSections.sync}
              onToggle={toggleSection}
            >
              <div className="space-y-3">
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{
                    background: taskSyncError || workspaceError ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    border: taskSyncError || workspaceError ? '1px solid rgba(239,68,68,0.16)' : '1px solid rgba(16,185,129,0.16)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {taskSyncError || workspaceError ? (
                      <AlertTriangle size={14} style={{ color: '#fca5a5' }} />
                    ) : (
                      <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                    )}
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {taskSyncError || workspaceError ? 'Cloud sync needs attention' : 'Cloud sync healthy'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-6" style={{ color: 'var(--text-secondary)' }}>
                    {workspaceError || taskSyncError || 'Workspace is connected and task writes are reaching Supabase.'}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { label: 'Signed-in account', value: user?.email || 'Unknown user' },
                    { label: 'Workspace id', value: workspaceId || 'Workspace not resolved' },
                    { label: 'Task sync', value: taskSyncing ? 'Syncing now' : taskSyncError ? 'Issue detected' : 'Healthy' },
                    { label: 'Last task sync', value: formatLastSeen(taskLastSyncedAt) },
                    { label: 'Project sync', value: projectSyncing ? 'Syncing now' : 'Idle' },
                    { label: 'Planner sync', value: planningSyncing ? 'Syncing now' : 'Idle' },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-2xl px-4 py-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
                        {label}
                      </div>
                      <div className="mt-2 text-sm font-medium break-all" style={{ color: 'var(--text-primary)' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {taskSyncError && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <RefreshCw size={14} style={{ color: 'var(--accent)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Keep this panel open while testing persistence after a refresh.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearTaskSyncError}
                      className="px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.24)' }}
                    >
                      Clear banner
                    </button>
                  </div>
                )}
              </div>
            </Section>

            <Section
              id="export"
              icon={Download}
              title="Export"
              description="Generate CSV, PDF, and Excel exports from your workspace."
              open={openSections.export}
              onToggle={toggleSection}
            >
              <button
                onClick={() => setShowExport(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{
                  background: 'rgba(var(--accent-rgb),0.1)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(var(--accent-rgb),0.2)',
                }}
                >
                <Download size={13} />
                Export Data (CSV / PDF / Excel)
              </button>
            </Section>

            <Section
              id="about"
              icon={Info}
              title="About"
              description="Product and version information."
              open={openSections.about}
              onToggle={toggleSection}
            >
              <div className="space-y-2.5">
                {[
                  { label: 'App', value: 'TaskFlow' },
                  { label: 'Version', value: '1.0.0' },
                  { label: 'Storage', value: 'Supabase sync + local cache' },
                  { label: 'Theme', value: `${themeIndex + 1} of 12` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="text-sm text-right" style={{ color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </>
  )
})

export default Settings
