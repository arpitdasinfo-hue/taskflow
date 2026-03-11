import { memo, useState, useMemo } from 'react'
import { X, Download, ChevronLeft, ChevronRight, Table, FileText, Check } from 'lucide-react'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore from '../../store/useProjectStore'

const fmt = (iso) => iso ? new Date(iso).toISOString().split('T')[0] : ''
const fmtHuman = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// ── Checkbox toggle pill ──────────────────────────────────────────────────────
const Pill = memo(function Pill({ label, active, color, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
      style={active
        ? { background: color ? `${color}25` : 'rgba(var(--accent-rgb),0.2)', color: color || 'var(--accent)', border: `1px solid ${color ? color + '50' : 'rgba(var(--accent-rgb),0.4)'}` }
        : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }
      }>
      {color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
      {active && !color && <Check size={9} className="flex-shrink-0" />}
      {label}
    </button>
  )
})

// ── Column checkbox ───────────────────────────────────────────────────────────
const ColCheck = memo(function ColCheck({ label, active, onChange }) {
  return (
    <button onClick={onChange}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
      style={active
        ? { background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.25)' }
        : { background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.07)' }
      }>
      <span className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border"
        style={active ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : { borderColor: 'rgba(255,255,255,0.2)' }}>
        {active && <Check size={9} color="#fff" />}
      </span>
      {label}
    </button>
  )
})

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
    {children}
  </p>
)

// ── Export logic ──────────────────────────────────────────────────────────────
function buildCSV(tasks, projects, programs, columns, includeSubtasks, includeMilestones, milestones) {
  const getProject = (id) => projects.find((p) => p.id === id)
  const getProgram = (projectId) => {
    const proj = getProject(projectId)
    if (!proj?.programId) return null
    return programs.find((p) => p.id === proj.programId)
  }

  const COL_DEFS = [
    { key: 'id',          label: 'ID',                val: (t) => t.id },
    { key: 'title',       label: 'Title',             val: (t) => `"${(t.title ?? '').replace(/"/g, '""')}"` },
    { key: 'status',      label: 'Status',            val: (t) => t.status },
    { key: 'priority',    label: 'Priority',          val: (t) => t.priority },
    { key: 'project',     label: 'Project',           val: (t) => `"${getProject(t.projectId)?.name ?? '—'}"` },
    { key: 'program',     label: 'Program',           val: (t) => `"${getProgram(t.projectId)?.name ?? '—'}"` },
    { key: 'dueDate',     label: 'Due Date',          val: (t) => fmt(t.dueDate) },
    { key: 'startDate',   label: 'Start Date',        val: (t) => fmt(t.startDate) },
    { key: 'tags',        label: 'Tags',              val: (t) => `"${(t.tags ?? []).join(', ')}"` },
    { key: 'dependencies',label: 'Dependencies',      val: (t) => `"${(t.dependsOn ?? []).join(', ')}"` },
    { key: 'notes',       label: 'Notes',             val: (t) => `"${(t.notes ?? []).map(n => n.content.replace(/"/g, '""')).join(' | ')}"` },
    { key: 'createdAt',   label: 'Created At',        val: (t) => fmt(t.createdAt) },
  ]

  const activeCols = COL_DEFS.filter((c) => columns[c.key])

  const rows = []
  rows.push(activeCols.map((c) => c.label).join(','))

  tasks.forEach((task) => {
    rows.push(activeCols.map((c) => c.val(task)).join(','))

    if (includeSubtasks && task.subtasks?.length) {
      task.subtasks.forEach((sub) => {
        const synth = { ...task, id: sub.id, title: `  ↳ ${sub.title}`, status: sub.completed ? 'done' : 'todo',
          dueDate: null, startDate: null, tags: [], dependsOn: [], notes: [], createdAt: sub.createdAt }
        rows.push(activeCols.map((c) => c.val(synth)).join(','))
      })
    }
  })

  if (includeMilestones && milestones.length) {
    rows.push('') // blank line separator
    rows.push('MILESTONES')
    rows.push(['Name', 'Project', 'Due Date', 'Status'].join(','))
    milestones.forEach((m) => {
      const proj = getProject(m.projectId)
      rows.push([
        `"${m.name.replace(/"/g, '""')}"`,
        `"${proj?.name ?? '—'}"`,
        fmt(m.dueDate),
        m.status,
      ].join(','))
    })
  }

  return rows.join('\n')
}

function buildPDF(tasks, projects, programs, milestones, include) {
  const getProject = (id) => projects.find((p) => p.id === id)
  const getProgram = (projectId) => {
    const proj = getProject(projectId)
    if (!proj?.programId) return null
    return programs.find((p) => p.id === proj.programId)
  }

  const now = new Date()
  const totalTasks   = tasks.length
  const doneTasks    = tasks.filter((t) => t.status === 'done').length
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length
  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
  const completion   = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  const summaryHTML = include.summaries ? `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px">
      ${[['Total', totalTasks, '#111827'], ['Done', doneTasks, '#10b981'], ['Blocked', blockedTasks, '#ef4444'], ['Overdue', overdueTasks, '#f59e0b']]
        .map(([l, v, c]) => `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:700;color:${c}">${v}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">${l}</div></div>`).join('')}
    </div>` : ''

  const programHTML = include.tasks ? programs.map((prog) => {
    const progProjects = projects.filter((p) => p.programId === prog.id)
    const progProjectIds = new Set(progProjects.map((p) => p.id))
    const progTasks = tasks.filter((t) => t.projectId && progProjectIds.has(t.projectId))
    const progDone  = progTasks.filter((t) => t.status === 'done').length
    const progComp  = progTasks.length ? Math.round((progDone / progTasks.length) * 100) : 0
    const taskRows  = progTasks.slice(0, 30).map((t) => `<tr>
      <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;max-width:280px">${t.title}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${getProject(t.projectId)?.name ?? '—'}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${t.status}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${t.priority}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${fmtHuman(t.dueDate)}</td>
    </tr>`).join('')
    return `<div style="margin-bottom:28px;page-break-inside:avoid">
      <h2 style="font-size:15px;font-weight:700;color:${prog.color};margin:0 0 2px 0">${prog.name}</h2>
      <p style="font-size:11px;color:#6b7280;margin:0 0 8px 0">${prog.description || ''} · ${progProjects.length} projects · ${progTasks.length} tasks · ${progComp}% done</p>
      ${progTasks.length ? `<table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f9fafb">
          ${['Task', 'Project', 'Status', 'Priority', 'Due'].map(h => `<th style="padding:5px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">${h}</th>`).join('')}
        </tr></thead>
        <tbody>${taskRows}</tbody>
      </table>${progTasks.length > 30 ? `<p style="font-size:10px;color:#9ca3af;margin-top:3px">+${progTasks.length - 30} more</p>` : ''}` : '<p style="font-size:11px;color:#9ca3af">No tasks</p>'}
    </div>`
  }).join('') : ''

  const milestoneHTML = include.milestones && milestones.length ? `
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 12px 0">Milestones</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr style="background:#f9fafb">${['Milestone','Project','Due Date','Status'].map(h => `<th style="padding:5px 8px;text-align:left;border-bottom:2px solid #e5e7eb">${h}</th>`).join('')}</tr></thead>
      <tbody>${milestones.map((m) => `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${m.name}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${getProject(m.projectId)?.name ?? '—'}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${fmtHuman(m.dueDate)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6">${m.status}</td>
      </tr>`).join('')}</tbody>
    </table>` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>TaskFlow Report</title>
    <style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;margin:0;padding:32px}@media print{body{padding:0}.no-print{display:none}}</style>
    </head><body>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e5e7eb">
      <div><h1 style="font-size:22px;font-weight:800;margin:0">TaskFlow Report</h1>
        <p style="font-size:12px;color:#6b7280;margin:4px 0 0">Generated ${fmtHuman(now.toISOString())}</p></div>
      <div style="text-align:right;font-size:12px;color:#6b7280"><div>${totalTasks} tasks</div><div>${completion}% complete</div></div>
    </div>
    ${summaryHTML}
    ${include.tasks && programs.length ? `<h2 style="font-size:17px;font-weight:700;margin:0 0 16px 0">Programs</h2>${programHTML}` : ''}
    ${milestoneHTML}
    <div class="no-print" style="margin-top:32px;text-align:center">
      <button onclick="window.print()" style="background:#111827;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
        Print / Save as PDF
      </button>
    </div></body></html>`
}

// ── ExportModal ───────────────────────────────────────────────────────────────
const COLUMN_OPTIONS = [
  { key: 'id',          label: 'ID'           },
  { key: 'title',       label: 'Title'        },
  { key: 'status',      label: 'Status'       },
  { key: 'priority',    label: 'Priority'     },
  { key: 'project',     label: 'Project'      },
  { key: 'program',     label: 'Program'      },
  { key: 'dueDate',     label: 'Due Date'     },
  { key: 'startDate',   label: 'Start Date'   },
  { key: 'tags',        label: 'Tags'         },
  { key: 'dependencies',label: 'Dependencies' },
  { key: 'notes',       label: 'Notes'        },
  { key: 'createdAt',   label: 'Created At'   },
]

const DEFAULT_COLUMNS = { id: false, title: true, status: true, priority: true, project: true,
  program: true, dueDate: true, startDate: false, tags: false, dependencies: false, notes: false, createdAt: false }

const DEFAULT_INCLUDE = { tasks: true, subtasks: false, milestones: false, summaries: true }

const ExportModal = memo(function ExportModal({ onClose }) {
  const tasks      = useTaskStore((s) => s.tasks)
  const projects   = useProjectStore((s) => s.projects)
  const programs   = useProjectStore((s) => s.programs)
  const milestones = useProjectStore((s) => s.milestones)

  const [step, setStep]     = useState(1)
  const [format, setFormat] = useState('csv')
  const [scope, setScope]   = useState('all') // 'all' | 'programs' | 'projects'
  const [selProgramIds, setSelProgramIds] = useState(new Set())
  const [selProjectIds, setSelProjectIds] = useState(new Set())
  const [include, setInclude] = useState(DEFAULT_INCLUDE)
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [exporting, setExporting] = useState(false)

  const toggleProgramSel = (id) => setSelProgramIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleProjectSel = (id) => setSelProjectIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleCol    = (key) => setColumns((c) => ({ ...c, [key]: !c[key] }))
  const toggleInclude = (key) => setInclude((c) => ({ ...c, [key]: !c[key] }))
  const selectAllCols = () => setColumns(Object.fromEntries(COLUMN_OPTIONS.map((c) => [c.key, true])))
  const clearAllCols  = () => setColumns(Object.fromEntries(COLUMN_OPTIONS.map((c) => [c.key, false])))

  // Resolve scope to tasks/projects/milestones
  const scopedData = useMemo(() => {
    let resolvedProjects = projects
    if (scope === 'programs' && selProgramIds.size > 0)
      resolvedProjects = projects.filter((p) => selProgramIds.has(p.programId))
    else if (scope === 'projects' && selProjectIds.size > 0)
      resolvedProjects = projects.filter((p) => selProjectIds.has(p.id))
    const projectIdSet = new Set(resolvedProjects.map((p) => p.id))
    const resolvedTasks = tasks.filter((t) => !t.projectId || projectIdSet.has(t.projectId))
    const resolvedMilestones = milestones.filter((m) => projectIdSet.has(m.projectId))
    return { tasks: resolvedTasks, projects: resolvedProjects, milestones: resolvedMilestones }
  }, [scope, selProgramIds, selProjectIds, tasks, projects, milestones])

  const taskCount = scopedData.tasks.length

  const runExport = () => {
    setExporting(true)
    try {
      if (format === 'csv') {
        const csv  = buildCSV(scopedData.tasks, projects, programs, columns, include.subtasks, include.milestones, scopedData.milestones)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `taskflow-${new Date().toISOString().split('T')[0]}.csv`
        a.click(); URL.revokeObjectURL(url)
      } else {
        const html = buildPDF(scopedData.tasks, projects, programs, scopedData.milestones, include)
        const w    = window.open('', '_blank')
        if (w) { w.document.write(html); w.document.close() }
      }
      onClose()
    } finally {
      setExporting(false)
    }
  }

  // Project options filtered by selected programs (for scope=projects)
  const projectOptions = scope === 'programs' && selProgramIds.size > 0
    ? projects.filter((p) => !p.parentId && selProgramIds.has(p.programId))
    : projects.filter((p) => !p.parentId)

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-lg rounded-2xl anim-slide-down overflow-hidden"
        style={{ background: 'rgba(12,4,24,0.98)', border: '1px solid rgba(var(--accent-rgb),0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="p-1 rounded-lg hover:bg-white/10 mr-1" style={{ color: 'var(--text-secondary)' }}>
                <ChevronLeft size={15} />
              </button>
            )}
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {step === 1 ? 'Export Data' : 'Select Columns'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }}>
              {taskCount} tasks
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {step === 1 ? (
            <div className="space-y-5">
              {/* Scope */}
              <div>
                <SectionLabel>Scope</SectionLabel>
                <div className="space-y-2">
                  {[['all', 'All data'], ['programs', 'By program'], ['projects', 'By project']].map(([val, label]) => (
                    <button key={val} onClick={() => setScope(val)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-all"
                      style={scope === val
                        ? { background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.3)' }
                        : { background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <span className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0"
                        style={scope === val ? { borderColor: 'var(--accent)', background: 'var(--accent)' } : { borderColor: 'rgba(255,255,255,0.25)' }}>
                        {scope === val && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      {label}
                    </button>
                  ))}

                  {/* Program pills */}
                  {scope === 'programs' && programs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 pl-7">
                      {programs.map((prog) => (
                        <Pill key={prog.id} label={prog.name} color={prog.color}
                          active={selProgramIds.has(prog.id)} onClick={() => toggleProgramSel(prog.id)} />
                      ))}
                    </div>
                  )}

                  {/* Project pills */}
                  {scope === 'projects' && projectOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 pl-7">
                      {projectOptions.map((proj) => (
                        <Pill key={proj.id} label={proj.name} color={proj.color}
                          active={selProjectIds.has(proj.id)} onClick={() => toggleProjectSel(proj.id)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Include */}
              <div>
                <SectionLabel>Include</SectionLabel>
                <div className="grid grid-cols-2 gap-1.5">
                  {[['tasks', 'Tasks'], ['subtasks', 'Subtasks'], ['milestones', 'Milestones'], ['summaries', 'Summary stats']].map(([key, label]) => (
                    <ColCheck key={key} label={label} active={include[key]} onChange={() => toggleInclude(key)} />
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <SectionLabel>Format</SectionLabel>
                <div className="flex gap-2">
                  <button onClick={() => setFormat('csv')}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={format === 'csv'
                      ? { background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Table size={14} /> CSV Spreadsheet
                  </button>
                  <button onClick={() => setFormat('pdf')}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={format === 'pdf'
                      ? { background: 'rgba(192,132,252,0.12)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <FileText size={14} /> PDF Report
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Step 2: Column selector (CSV only)
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {Object.values(columns).filter(Boolean).length} of {COLUMN_OPTIONS.length} columns selected
                </p>
                <div className="flex gap-2">
                  <button onClick={selectAllCols} className="text-[11px] px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--accent)' }}>Select all</button>
                  <button onClick={clearAllCols} className="text-[11px] px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}>Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {COLUMN_OPTIONS.map((col) => (
                  <ColCheck key={col.key} label={col.label} active={columns[col.key]} onChange={() => toggleCol(col.key)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="btn-ghost py-2 text-xs px-3">Cancel</button>
          <div className="flex-1" />
          {format === 'csv' && step === 1 ? (
            <button onClick={() => setStep(2)}
              className="flex items-center gap-1.5 btn-accent py-2 text-xs px-4">
              Select columns <ChevronRight size={12} />
            </button>
          ) : (
            <button onClick={runExport} disabled={exporting}
              className="flex items-center gap-1.5 btn-accent py-2 text-xs px-4"
              style={exporting ? { opacity: 0.6 } : {}}>
              <Download size={12} />
              {format === 'csv' ? `Export CSV (${taskCount})` : 'Export PDF'}
            </button>
          )}
        </div>
      </div>
    </>
  )
})

export default ExportModal
