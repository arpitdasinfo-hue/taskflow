import { memo, useState } from 'react'
import { X, FileText, Download, Table } from 'lucide-react'
import { format } from 'date-fns'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore from '../../store/useProjectStore'

const ExportModal = memo(function ExportModal({ onClose }) {
  const tasks    = useTaskStore((s) => s.tasks)
  const projects = useProjectStore((s) => s.projects)
  const programs = useProjectStore((s) => s.programs)
  const [exporting, setExporting] = useState(false)

  const getProjectName  = (id) => projects.find((p) => p.id === id)?.name ?? '—'
  const getProgramName  = (projectId) => {
    const proj = projects.find((p) => p.id === projectId)
    if (!proj || !proj.programId) return '—'
    return programs.find((p) => p.id === proj.programId)?.name ?? '—'
  }

  const exportCSV = () => {
    setExporting(true)
    try {
      const headers = ['ID', 'Title', 'Status', 'Priority', 'Project', 'Program', 'Due Date', 'Tags', 'Subtask Completion %', 'Dependencies', 'Created At']
      const rows = tasks.map((t) => {
        const totalSubs = t.subtasks?.length ?? 0
        const doneSubs  = t.subtasks?.filter((s) => s.completed).length ?? 0
        const subtaskPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0
        return [
          t.id,
          `"${(t.title ?? '').replace(/"/g, '""')}"`,
          t.status,
          t.priority,
          `"${getProjectName(t.projectId)}"`,
          `"${getProgramName(t.projectId)}"`,
          t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
          `"${(t.tags ?? []).join(', ')}"`,
          `${subtaskPct}%`,
          `"${(t.dependsOn ?? []).join(', ')}"`,
          t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd') : '',
        ].join(',')
      })
      const csv  = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `taskflow-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const exportPDF = () => {
    setExporting(true)
    try {
      const now = new Date()
      const totalTasks  = tasks.length
      const doneTasks   = tasks.filter((t) => t.status === 'done').length
      const blockedTasks = tasks.filter((t) => t.status === 'blocked').length
      const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
      const completion  = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

      // Build per-program data
      const programSections = programs.map((prog) => {
        const progProjects = projects.filter((p) => p.programId === prog.id)
        const progProjectIds = new Set(progProjects.map((p) => p.id))
        const progTasks = tasks.filter((t) => t.projectId && progProjectIds.has(t.projectId))
        const progDone  = progTasks.filter((t) => t.status === 'done').length
        const progComp  = progTasks.length ? Math.round((progDone / progTasks.length) * 100) : 0

        const taskRows = progTasks.slice(0, 20).map((t) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${getProjectName(t.projectId)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${t.status}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${t.priority}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${t.dueDate ? format(new Date(t.dueDate), 'MMM d, yyyy') : '—'}</td>
          </tr>
        `).join('')

        return `
          <div style="margin-bottom:32px">
            <h2 style="font-size:16px;font-weight:700;color:${prog.color};margin:0 0 4px 0">${prog.name}</h2>
            <p style="font-size:12px;color:#6b7280;margin:0 0 8px 0">${prog.description || ''} &bull; ${progProjects.length} projects &bull; ${progTasks.length} tasks &bull; ${progComp}% complete</p>
            ${progTasks.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="background:#f9fafb">
                    <th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Task</th>
                    <th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Project</th>
                    <th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Status</th>
                    <th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Priority</th>
                    <th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Due Date</th>
                  </tr>
                </thead>
                <tbody>${taskRows}</tbody>
              </table>
              ${progTasks.length > 20 ? `<p style="font-size:11px;color:#9ca3af;margin-top:4px">...and ${progTasks.length - 20} more tasks</p>` : ''}
            ` : '<p style="font-size:12px;color:#9ca3af">No tasks in this program</p>'}
          </div>
        `
      }).join('')

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>TaskFlow Report — ${format(now, 'MMM d, yyyy')}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; margin: 0; padding: 32px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e5e7eb">
            <div>
              <h1 style="font-size:24px;font-weight:800;margin:0;color:#111827">TaskFlow Report</h1>
              <p style="font-size:13px;color:#6b7280;margin:4px 0 0 0">Generated ${format(now, 'MMMM d, yyyy \'at\' h:mm a')}</p>
            </div>
            <div style="text-align:right;font-size:12px;color:#6b7280">
              <div>${totalTasks} total tasks</div>
              <div>${completion}% complete</div>
            </div>
          </div>

          <!-- Summary stats -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px">
            ${[
              { label: 'Total Tasks',   value: totalTasks,   color: '#111827' },
              { label: 'Completed',     value: doneTasks,    color: '#10b981' },
              { label: 'Blocked',       value: blockedTasks, color: '#ef4444' },
              { label: 'Overdue',       value: overdueTasks, color: '#f59e0b' },
            ].map(({ label, value, color }) => `
              <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center">
                <div style="font-size:24px;font-weight:700;color:${color}">${value}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px">${label}</div>
              </div>
            `).join('')}
          </div>

          <!-- Program breakdown -->
          <h2 style="font-size:18px;font-weight:700;margin:0 0 16px 0">Programs</h2>
          ${programSections || '<p style="color:#9ca3af">No programs found</p>'}

          <div class="no-print" style="margin-top:32px;text-align:center">
            <button onclick="window.print()" style="background:#111827;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
              Print / Save as PDF
            </button>
          </div>
        </body>
        </html>
      `

      const w = window.open('', '_blank')
      if (w) {
        w.document.write(html)
        w.document.close()
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm rounded-2xl p-5 anim-slide-down"
        style={{ background: 'rgba(15,5,28,0.98)', border: '1px solid rgba(var(--accent-rgb),0.3)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Export Data</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3">
          {/* CSV */}
          <button
            onClick={exportCSV}
            disabled={exporting}
            className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors hover:bg-white/5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(34,211,238,0.15)' }}>
              <Table size={16} style={{ color: '#22d3ee' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Export CSV</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                All {tasks.length} tasks — title, status, priority, project, dates, tags
              </p>
            </div>
            <Download size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>

          {/* PDF */}
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors hover:bg-white/5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(192,132,252,0.15)' }}>
              <FileText size={16} style={{ color: '#c084fc' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Export PDF Report</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Program summary with task breakdown — opens print dialog
              </p>
            </div>
            <Download size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <p className="text-[10px] text-center mt-4" style={{ color: 'var(--text-secondary)' }}>
          All data is exported from local storage — no server involved
        </p>
      </div>
    </>
  )
})

export default ExportModal
