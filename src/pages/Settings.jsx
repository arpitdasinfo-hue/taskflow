import { memo, useState } from 'react'
import {
  Palette,
  Info,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import GlassCard from '../components/common/GlassCard'
import ThemeSelector from '../components/common/ThemeSelector'
import ExportModal from '../components/settings/ExportModal'
import Header from '../components/layout/Header'
import useSettingsStore from '../store/useSettingsStore'

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
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </p>
            {description && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
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
  const [showExport, setShowExport] = useState(false)

  const [openSections, setOpenSections] = useState({
    theme: false,
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
              id="export"
              icon={Download}
              title="Export"
              description="Generate CSV, PDF, and Excel exports from your workspace."
              open={openSections.export}
              onToggle={toggleSection}
            >
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Export tasks, projects, and Gantt configuration for backup or analysis.
              </p>
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
