import { memo, useState, useMemo } from 'react'
import { X, Download, ChevronLeft, ChevronRight, Table, FileText, FileSpreadsheet, Check } from 'lucide-react'
import useTaskStore from '../../store/useTaskStore'
import useProjectStore from '../../store/useProjectStore'
import useSettingsStore from '../../store/useSettingsStore'
import { buildProgramSummary, buildProjectSummary } from '../../lib/programWorkspace'

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

const XLSX_COLUMN_LABEL = {
  id: 'ID',
  title: 'Title',
  status: 'Status',
  priority: 'Priority',
  project: 'Project',
  program: 'Program',
  dueDate: 'Due Date',
  startDate: 'Start Date',
  tags: 'Tags',
  dependencies: 'Dependencies',
  notes: 'Notes',
  createdAt: 'Created At',
}

const TASK_PROGRESS_BY_STATUS = {
  done: 100,
  review: 80,
  'in-progress': 55,
  blocked: 20,
  todo: 0,
}

const getTaskColumnValue = (task, key, getProject, getProgramForTask) => {
  switch (key) {
    case 'id': return task.id
    case 'title': return task.title ?? ''
    case 'status': return task.status ?? ''
    case 'priority': return task.priority ?? ''
    case 'project': return getProject(task.projectId)?.name ?? '—'
    case 'program': return getProgramForTask(task)?.name ?? '—'
    case 'dueDate': return fmt(task.dueDate)
    case 'startDate': return fmt(task.startDate)
    case 'tags': return (task.tags ?? []).join(', ')
    case 'dependencies': return (task.dependsOn ?? []).join(', ')
    case 'notes': return (task.notes ?? []).map((note) => note.content).join(' | ')
    case 'createdAt': return fmt(task.createdAt)
    default: return ''
  }
}

const getDateBounds = (items) => {
  const starts = items.map((item) => item.startDate).filter(Boolean).map((date) => new Date(date).getTime())
  const ends = items.map((item) => item.dueDate).filter(Boolean).map((date) => new Date(date).getTime())
  return {
    start: starts.length ? fmt(new Date(Math.min(...starts)).toISOString()) : '',
    end: ends.length ? fmt(new Date(Math.max(...ends)).toISOString()) : '',
  }
}

const EXCEL_WORKSHEET_NAME_LIMIT = 31
const EXCEL_INVALID_WORKSHEET_CHARS = /[:\\/?*\[\]]/g

const buildSelectedTaskValues = (task, selectedColumnKeys, getProject, getProgramForTask) => (
  Object.fromEntries(
    selectedColumnKeys.map((key) => [
      XLSX_COLUMN_LABEL[key] ?? key,
      getTaskColumnValue(task, key, getProject, getProgramForTask),
    ])
  )
)

const toWorksheetNameBase = (value) => {
  const normalized = String(value ?? '')
    .replace(EXCEL_INVALID_WORKSHEET_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || 'Sheet'
}

const getUniqueWorksheetName = (value, usedNames) => {
  const base = toWorksheetNameBase(value)
  let candidate = base.slice(0, EXCEL_WORKSHEET_NAME_LIMIT)
  let index = 2

  while (usedNames.has(candidate)) {
    const suffix = ` (${index})`
    candidate = `${base.slice(0, Math.max(0, EXCEL_WORKSHEET_NAME_LIMIT - suffix.length)).trimEnd()}${suffix}`
    index += 1
  }

  usedNames.add(candidate)
  return candidate
}

const addWorksheet = (sheets, usedNames, name, rows) => {
  sheets.push({
    name: getUniqueWorksheetName(name, usedNames),
    rows,
  })
}

const getProjectHierarchy = (project, getProject) => {
  if (!project) return []

  const chain = []
  let current = project
  const seen = new Set()

  while (current && !seen.has(current.id)) {
    chain.unshift(current)
    seen.add(current.id)
    current = current.parentId ? getProject(current.parentId) : null
  }

  return chain
}

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const toSpreadsheetCellXml = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
}

const rowsToWorksheetXml = (name, rows) => {
  const safeRows = rows.length ? rows : [{ Note: 'No records found' }]
  const columns = []

  safeRows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!columns.includes(key)) columns.push(key)
    })
  })

  const headerRow = `<Row>${columns.map((key) => `<Cell><Data ss:Type="String">${escapeXml(key)}</Data></Cell>`).join('')}</Row>`
  const dataRows = safeRows
    .map((row) => `<Row>${columns.map((key) => toSpreadsheetCellXml(row[key] ?? '')).join('')}</Row>`)
    .join('')

  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${headerRow}${dataRows}</Table></Worksheet>`
}

const buildWorkbookXml = (sheets) => `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${sheets.map((sheet) => rowsToWorksheetXml(sheet.name, sheet.rows)).join('\n')}
</Workbook>`

function buildProgramDetailSheetRows({
  program,
  projects,
  tasks,
  milestones,
  columns,
  include,
  getProject,
  getProgramForTask,
}) {
  const selectedColumnKeys = Object.keys(columns).filter((key) => columns[key])
  const summary = buildProgramSummary({ program, projects, tasks, milestones })

  const overviewRows = [
    { Section: 'Overview', Metric: 'Program', Value: program.name, Detail: program.description || 'No description' },
    { Section: 'Overview', Metric: 'Scope', Value: program.scope ?? 'professional', Detail: 'Workspace scope' },
    { Section: 'Overview', Metric: 'Status', Value: program.status ?? 'planning', Detail: 'Current program status' },
    {
      Section: 'Overview',
      Metric: 'Timeline',
      Value: summary.scheduleLabel,
      Detail: `${fmt(program.startDate) || 'No start'} -> ${fmt(program.endDate) || 'No end'}`,
    },
    {
      Section: 'Overview',
      Metric: 'Projects',
      Value: summary.topLevelProjects.length,
      Detail: `${summary.programProjects.length} project rows in scope`,
    },
    {
      Section: 'Overview',
      Metric: 'Tasks',
      Value: summary.totalTasks,
      Detail: `${summary.doneTasks} done, ${summary.openTasks} open, ${summary.blockedTasks} blocked`,
    },
    {
      Section: 'Overview',
      Metric: 'Completion %',
      Value: summary.completion,
      Detail: `${summary.overdueTasks} overdue, ${summary.unscheduledTasks} unscheduled`,
    },
    {
      Section: 'Overview',
      Metric: 'Next milestone',
      Value: summary.nextMilestone?.name ?? 'None',
      Detail: summary.nextMilestone
        ? `${fmt(summary.nextMilestone.dueDate)} | ${summary.nextMilestone.status ?? 'pending'}`
        : 'No pending milestones',
    },
    {
      Section: 'Overview',
      Metric: 'Risk',
      Value: summary.risk.label,
      Detail: summary.risk.detail,
    },
  ]

  const buildProjectRows = (project, rootProject = project, lineage = []) => {
    const projectSummary = buildProjectSummary({
      project,
      allProjects: summary.programProjects,
      tasks: summary.programTasks,
      milestones: summary.programMilestones,
    })

    const currentRow = {
      Section: 'Projects',
      Type: lineage.length > 0 ? 'Sub-project' : 'Project',
      Program: program.name,
      Project: rootProject.name,
      'Sub-project': lineage.join(' / '),
      'Item Name': project.name,
      Status: project.status ?? 'active',
      Start: fmt(project.startDate),
      Due: fmt(project.dueDate),
      'Completion %': projectSummary.completion,
      'Task Count': projectSummary.totalTasks,
      'Open Tasks': projectSummary.openTasks,
      'Done Tasks': projectSummary.doneTasks,
      'Blocked Tasks': projectSummary.blockedTasks,
      'Critical Tasks': projectSummary.criticalTasks,
      'Overdue Tasks': projectSummary.overdueTasks,
      Schedule: projectSummary.scheduleLabel,
      Risk: projectSummary.risk.label,
      Description: project.description ?? '',
    }

    return [
      currentRow,
      ...projectSummary.childProjects.flatMap((childProject) =>
        buildProjectRows(
          childProject,
          rootProject,
          [...lineage, childProject.name]
        )
      ),
    ]
  }

  const projectRows = summary.topLevelProjects.flatMap((project) => buildProjectRows(project))

  const milestoneRows = include.milestones
    ? summary.programMilestones.map((milestone) => {
      const project = getProject(milestone.projectId)
      const hierarchy = getProjectHierarchy(project, getProject)
      const rootProject = hierarchy[0] ?? null
      return {
        Section: 'Milestones',
        Type: 'Milestone',
        Program: program.name,
        Project: rootProject?.name ?? project?.name ?? '—',
        'Sub-project': hierarchy.slice(1).map((entry) => entry.name).join(' / '),
        Milestone: milestone.name,
        Status: milestone.status ?? 'pending',
        'Due Date': fmt(milestone.dueDate),
        'Linked Task ID': milestone.taskId ?? '',
        Description: milestone.description ?? '',
      }
    })
    : []

  const taskRows = include.tasks
    ? summary.programTasks.flatMap((task) => {
      const project = getProject(task.projectId)
      const hierarchy = getProjectHierarchy(project, getProject)
      const rootProject = hierarchy[0] ?? null
      const selectedValues = buildSelectedTaskValues(task, selectedColumnKeys, getProject, getProgramForTask)
      const baseRow = {
        Section: 'Tasks',
        Type: task.projectId ? 'Task' : 'Direct program task',
        Program: program.name,
        Project: rootProject?.name ?? '',
        'Sub-project': hierarchy.slice(1).map((entry) => entry.name).join(' / '),
        Task: task.title ?? '',
        'Task ID': task.id,
        Status: task.status ?? 'todo',
        Priority: task.priority ?? 'medium',
        Start: fmt(task.startDate),
        Due: fmt(task.dueDate),
        'Progress %': TASK_PROGRESS_BY_STATUS[task.status] ?? 0,
        'Dependency IDs': (task.dependsOn ?? []).join(', '),
        Tags: (task.tags ?? []).join(', '),
        Notes: (task.notes ?? []).map((note) => note.content).join(' | '),
        ...selectedValues,
      }

      const subtaskRows = include.subtasks
        ? (task.subtasks ?? []).map((subtask) => ({
          Section: 'Tasks',
          Type: 'Subtask',
          Program: program.name,
          Project: rootProject?.name ?? '',
          'Sub-project': hierarchy.slice(1).map((entry) => entry.name).join(' / '),
          Task: `Subtask: ${subtask.title ?? 'Untitled subtask'}`,
          'Task ID': subtask.id,
          'Parent Task': task.title ?? '',
          Status: subtask.completed ? 'done' : 'todo',
          Priority: '',
          Start: '',
          Due: '',
          'Progress %': subtask.completed ? 100 : 0,
          'Dependency IDs': '',
          Tags: '',
          Notes: '',
        }))
        : []

      return [baseRow, ...subtaskRows]
    })
    : []

  return [...overviewRows, ...projectRows, ...milestoneRows, ...taskRows]
}

function buildExcelWorkbookXml({
  tasks,
  projects,
  programs,
  milestones,
  columns,
  include,
  ganttConfig,
  scope,
  selectedProgramIds = [],
  selectedProjectIds = [],
}) {
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const programById = new Map(programs.map((program) => [program.id, program]))
  const getProject = (id) => projectById.get(id) ?? null
  const getProgramForTask = (task) => {
    if (task?.programId) return programById.get(task.programId) ?? null
    const project = getProject(task?.projectId)
    return project?.programId ? programById.get(project.programId) ?? null : null
  }

  const selectedColumnKeys = Object.keys(columns).filter((key) => columns[key])
  const selectedTemplate = Object.fromEntries(
    selectedColumnKeys.map((key) => [XLSX_COLUMN_LABEL[key] ?? key, ''])
  )
  const selectedProgramNames = selectedProgramIds.length > 0
    ? programs.filter((program) => selectedProgramIds.includes(program.id)).map((program) => program.name)
    : []
  const selectedProjectNames = selectedProjectIds.length > 0
    ? projects.filter((project) => selectedProjectIds.includes(project.id)).map((project) => project.name)
    : []
  const selectedSheets = [
    include.programSheets && programs.length > 0 ? `${programs.length} Program detail sheets` : null,
    include.tasks ? 'Work_Items' : null,
    include.milestones ? 'Milestones' : null,
    include.summaries ? 'Summary' : null,
    include.ganttConfig ? 'Gantt_Config' : null,
  ].filter(Boolean)
  const scopeLabel = scope === 'programs'
    ? 'Programs'
    : scope === 'projects'
      ? 'Projects'
      : 'All data'

  const selectionRows = [
    { Setting: 'generated_at', Value: fmtHuman(new Date().toISOString()), Detail: 'Local export timestamp' },
    { Setting: 'scope_mode', Value: scopeLabel, Detail: 'Scope chosen in the export modal' },
    {
      Setting: 'selected_programs',
      Value: selectedProgramNames.length > 0 ? selectedProgramNames.join(', ') : (scope === 'programs' ? 'All programs' : 'Not scoped by program'),
      Detail: 'Program filters included in this workbook',
    },
    {
      Setting: 'selected_projects',
      Value: selectedProjectNames.length > 0 ? selectedProjectNames.join(', ') : (scope === 'projects' ? 'All top-level projects' : 'Not scoped by project'),
      Detail: 'Project filters included in this workbook',
    },
    {
      Setting: 'included_sheets',
      Value: selectedSheets.length > 0 ? selectedSheets.join(', ') : 'None',
      Detail: 'Workbook sections included in this export',
    },
    {
      Setting: 'selected_columns',
      Value: selectedColumnKeys.length > 0
        ? selectedColumnKeys.map((key) => XLSX_COLUMN_LABEL[key] ?? key).join(', ')
        : 'None',
      Detail: 'Task columns selected in step 2',
    },
    { Setting: 'task_count', Value: tasks.length, Detail: 'Matching tasks exported into the workbook' },
    { Setting: 'project_count', Value: projects.filter((project) => !project.parentId).length, Detail: 'Top-level projects inside the selected scope' },
    { Setting: 'sub_project_count', Value: projects.filter((project) => project.parentId).length, Detail: 'Sub-projects inside the selected scope' },
    { Setting: 'program_count', Value: programs.length, Detail: 'Programs inside the selected scope' },
    { Setting: 'program_sheet_count', Value: include.programSheets ? programs.length : 0, Detail: 'Program-level worksheets included in this export' },
    { Setting: 'include_subtasks', Value: String(Boolean(include.subtasks)), Detail: 'Whether subtasks were requested in export options' },
    { Setting: 'include_milestones', Value: String(Boolean(include.milestones)), Detail: 'Whether milestones sheet is included' },
    { Setting: 'include_summary', Value: String(Boolean(include.summaries)), Detail: 'Whether summary sheet is included' },
    { Setting: 'include_gantt_config', Value: String(Boolean(include.ganttConfig)), Detail: 'Whether gantt config sheet is included' },
    { Setting: 'include_program_sheets', Value: String(Boolean(include.programSheets)), Detail: 'Whether one worksheet per program is included' },
  ]

  const taskRows = tasks.flatMap((task) => {
    const project = getProject(task.projectId)
    const hierarchy = getProjectHierarchy(project, getProject)
    const rootProject = hierarchy[0] ?? null
    const selectedValues = buildSelectedTaskValues(task, selectedColumnKeys, getProject, getProgramForTask)

    const rows = [{
      ...selectedTemplate,
      'Row Type': 'Task',
      Program: getProgramForTask(task)?.name ?? 'Unassigned',
      Project: rootProject?.name ?? '',
      'Sub-project': hierarchy.slice(1).map((entry) => entry.name).join(' / '),
      'Item Name': task.title,
      'Item ID': task.id,
      'Parent ID': task.projectId ?? '',
      Start: fmt(task.startDate),
      Due: fmt(task.dueDate),
      'Progress %': TASK_PROGRESS_BY_STATUS[task.status] ?? 0,
      'Dependency IDs': (task.dependsOn ?? []).join(', '),
      ...selectedValues,
    }]

    if (!include.subtasks) return rows

    return rows.concat((task.subtasks ?? []).map((subtask) => ({
      ...selectedTemplate,
      'Row Type': 'Subtask',
      Program: getProgramForTask(task)?.name ?? 'Unassigned',
      Project: rootProject?.name ?? '',
      'Sub-project': hierarchy.slice(1).map((entry) => entry.name).join(' / '),
      'Item Name': `Subtask: ${subtask.title ?? 'Untitled subtask'}`,
      'Item ID': subtask.id,
      'Parent ID': task.id,
      Start: '',
      Due: '',
      'Progress %': subtask.completed ? 100 : 0,
      'Dependency IDs': '',
    })))
  })

  const topLevelProjects = projects.filter((project) => !project.parentId)
  const subProjectsByParent = projects.reduce((acc, project) => {
    if (!project.parentId) return acc
    if (!acc.has(project.parentId)) acc.set(project.parentId, [])
    acc.get(project.parentId).push(project)
    return acc
  }, new Map())

  const hierarchyRows = []
  programs.forEach((program) => {
    const programProjects = topLevelProjects.filter((project) => project.programId === program.id)
    const programProjectIds = new Set(
      programProjects.flatMap((project) => [project.id, ...(subProjectsByParent.get(project.id) ?? []).map((sub) => sub.id)])
    )
    const programTasks = tasks.filter((task) => task.projectId && programProjectIds.has(task.projectId))
    const programDone = programTasks.filter((task) => task.status === 'done').length
    const programProgress = programTasks.length ? Math.round((programDone / programTasks.length) * 100) : 0
    const bounds = getDateBounds(programTasks)

    hierarchyRows.push({
      ...selectedTemplate,
      'Row Type': 'Program',
      Program: program.name,
      Project: '',
      'Sub-project': '',
      'Item Name': program.name,
      'Item ID': program.id,
      'Parent ID': '',
      Start: bounds.start || fmt(program.startDate),
      Due: bounds.end || fmt(program.endDate),
      'Progress %': programProgress,
      'Dependency IDs': '',
    })

    programProjects.forEach((project) => {
      const children = subProjectsByParent.get(project.id) ?? []
      const projectIds = new Set([project.id, ...children.map((sub) => sub.id)])
      const projectTasks = tasks.filter((task) => task.projectId && projectIds.has(task.projectId))
      const projectDone = projectTasks.filter((task) => task.status === 'done').length
      const projectProgress = projectTasks.length ? Math.round((projectDone / projectTasks.length) * 100) : 0
      const projectBounds = getDateBounds(projectTasks)

      hierarchyRows.push({
        ...selectedTemplate,
        'Row Type': 'Project',
        Program: program.name,
        Project: project.name,
        'Sub-project': '',
        'Item Name': project.name,
        'Item ID': project.id,
        'Parent ID': program.id,
        Start: projectBounds.start || fmt(project.startDate),
        Due: projectBounds.end || fmt(project.dueDate),
        'Progress %': projectProgress,
        'Dependency IDs': '',
      })

      children.forEach((subProject) => {
        const subTasks = tasks.filter((task) => task.projectId === subProject.id)
        const subDone = subTasks.filter((task) => task.status === 'done').length
        const subProgress = subTasks.length ? Math.round((subDone / subTasks.length) * 100) : 0
        const subBounds = getDateBounds(subTasks)

        hierarchyRows.push({
          ...selectedTemplate,
          'Row Type': 'Sub-project',
          Program: program.name,
          Project: project.name,
          'Sub-project': subProject.name,
          'Item Name': subProject.name,
          'Item ID': subProject.id,
          'Parent ID': project.id,
          Start: subBounds.start || fmt(subProject.startDate),
          Due: subBounds.end || fmt(subProject.dueDate),
          'Progress %': subProgress,
          'Dependency IDs': '',
        })
      })
    })
  })

  const unassignedProjects = topLevelProjects.filter((project) => !project.programId)
  unassignedProjects.forEach((project) => {
    const children = subProjectsByParent.get(project.id) ?? []
    const projectIds = new Set([project.id, ...children.map((sub) => sub.id)])
    const projectTasks = tasks.filter((task) => task.projectId && projectIds.has(task.projectId))
    const projectDone = projectTasks.filter((task) => task.status === 'done').length
    const projectProgress = projectTasks.length ? Math.round((projectDone / projectTasks.length) * 100) : 0
    const projectBounds = getDateBounds(projectTasks)

    hierarchyRows.push({
      ...selectedTemplate,
      'Row Type': 'Project',
      Program: 'Unassigned',
      Project: project.name,
      'Sub-project': '',
      'Item Name': project.name,
      'Item ID': project.id,
      'Parent ID': '',
      Start: projectBounds.start || fmt(project.startDate),
      Due: projectBounds.end || fmt(project.dueDate),
      'Progress %': projectProgress,
      'Dependency IDs': '',
    })

    children.forEach((subProject) => {
      const subTasks = tasks.filter((task) => task.projectId === subProject.id)
      const subDone = subTasks.filter((task) => task.status === 'done').length
      const subProgress = subTasks.length ? Math.round((subDone / subTasks.length) * 100) : 0
      const subBounds = getDateBounds(subTasks)

      hierarchyRows.push({
        ...selectedTemplate,
        'Row Type': 'Sub-project',
        Program: 'Unassigned',
        Project: project.name,
        'Sub-project': subProject.name,
        'Item Name': subProject.name,
        'Item ID': subProject.id,
        'Parent ID': project.id,
        Start: subBounds.start || fmt(subProject.startDate),
        Due: subBounds.end || fmt(subProject.dueDate),
        'Progress %': subProgress,
        'Dependency IDs': '',
      })
    })
  })

  const workItemsRows = [...hierarchyRows, ...taskRows]
  const sheets = []
  const usedSheetNames = new Set()

  addWorksheet(sheets, usedSheetNames, 'Export_Selection', selectionRows)

  if (include.programSheets && programs.length > 0) {
    programs.forEach((program) => {
      addWorksheet(
        sheets,
        usedSheetNames,
        program.name,
        buildProgramDetailSheetRows({
          program,
          projects,
          tasks,
          milestones,
          columns,
          include,
          getProject,
          getProgramForTask,
        })
      )
    })
  }

  if (include.tasks) {
    addWorksheet(sheets, usedSheetNames, 'Work_Items', workItemsRows.length ? workItemsRows : [{ 'Row Type': 'Info', 'Item Name': 'No matching work items' }])
  }

  if (include.milestones) {
    const milestoneRows = milestones.map((milestone) => {
      const project = getProject(milestone.projectId)
      const hierarchy = getProjectHierarchy(project, getProject)
      const rootProject = hierarchy[0] ?? null
      const program = project?.programId ? programById.get(project.programId) : null
      return {
        Milestone: milestone.name,
        Program: program?.name ?? '—',
        Project: rootProject?.name ?? project?.name ?? '—',
        'Sub-project': hierarchy.slice(1).map((entry) => entry.name).join(' / '),
        'Due Date': fmt(milestone.dueDate),
        Status: milestone.status,
      }
    })
    addWorksheet(
      sheets,
      usedSheetNames,
      'Milestones',
      milestoneRows.length ? milestoneRows : [{ Milestone: 'No milestones in selected scope' }]
    )
  }

  if (include.summaries) {
    const done = tasks.filter((task) => task.status === 'done').length
    const blocked = tasks.filter((task) => task.status === 'blocked').length
    const overdue = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done').length
    addWorksheet(sheets, usedSheetNames, 'Summary', [
      { Metric: 'Generated At', Value: fmtHuman(new Date().toISOString()) },
      { Metric: 'Scope', Value: scope },
      { Metric: 'Programs', Value: programs.length },
      { Metric: 'Projects', Value: projects.filter((project) => !project.parentId).length },
      { Metric: 'Sub-projects', Value: projects.filter((project) => project.parentId).length },
      { Metric: 'Tasks', Value: tasks.length },
      { Metric: 'Done Tasks', Value: done },
      { Metric: 'Blocked Tasks', Value: blocked },
      { Metric: 'Overdue Tasks', Value: overdue },
    ])
  }

  if (include.ganttConfig) {
    const programNameById = new Map(programs.map((program) => [program.id, program.name]))
    const projectNameById = new Map(projects.map((project) => [project.id, project.name]))
    const ganttRows = [
      { Setting: 'view_start', Value: fmt(ganttConfig.rangeStart), Note: 'Initial visible timeline start date' },
      { Setting: 'view_end', Value: fmt(ganttConfig.rangeEnd), Note: 'Initial visible timeline end date' },
      { Setting: 'zoom', Value: ganttConfig.zoom ?? 'month', Note: 'week | month | quarter' },
      { Setting: 'show_dependencies', Value: String(ganttConfig.showDependencies ?? true), Note: 'Render dependency links' },
      { Setting: 'only_delayed', Value: String(Boolean(ganttConfig.onlyDelayed)), Note: 'Filter delayed rows only' },
      { Setting: 'only_critical', Value: String(Boolean(ganttConfig.onlyCritical)), Note: 'Filter critical rows only' },
      { Setting: 'only_dependency_risk', Value: String(Boolean(ganttConfig.onlyDependencyRisk)), Note: 'Filter dependency risk rows only' },
      { Setting: 'filtered_program_ids', Value: (ganttConfig.filteredProgramIds ?? []).join(', '), Note: 'Comma-separated program ids' },
      { Setting: 'filtered_program_names', Value: (ganttConfig.filteredProgramIds ?? []).map((id) => programNameById.get(id) ?? id).join(', '), Note: 'Program labels for filters' },
      { Setting: 'filtered_project_ids', Value: (ganttConfig.filteredProjectIds ?? []).join(', '), Note: 'Comma-separated project ids' },
      { Setting: 'filtered_project_names', Value: (ganttConfig.filteredProjectIds ?? []).map((id) => projectNameById.get(id) ?? id).join(', '), Note: 'Project labels for filters' },
      { Setting: 'filtered_sub_project_ids', Value: (ganttConfig.filteredSubProjectIds ?? []).join(', '), Note: 'Comma-separated sub-project ids' },
      { Setting: 'filtered_sub_project_names', Value: (ganttConfig.filteredSubProjectIds ?? []).map((id) => projectNameById.get(id) ?? id).join(', '), Note: 'Sub-project labels for filters' },
      { Setting: 'expanded_project_ids', Value: (ganttConfig.expandedProjectIds ?? []).join(', '), Note: 'Expanded project rows in tree' },
      { Setting: 'export_scope', Value: scope, Note: 'Export modal scope option' },
    ]
    addWorksheet(sheets, usedSheetNames, 'Gantt_Config', ganttRows)
  }

  return buildWorkbookXml(sheets)
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

const DEFAULT_INCLUDE = { tasks: true, subtasks: false, milestones: false, summaries: true, ganttConfig: true, programSheets: true }

const ExportModal = memo(function ExportModal({ onClose }) {
  const tasks      = useTaskStore((s) => s.tasks)
  const projects   = useProjectStore((s) => s.projects)
  const programs   = useProjectStore((s) => s.programs)
  const milestones = useProjectStore((s) => s.milestones)
  const ganttConfig = useSettingsStore((s) => s.ganttConfig)

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
  const scopedPrograms = useMemo(() => {
    if (scope === 'all') return programs
    if (scope === 'programs' && selProgramIds.size > 0) {
      return programs.filter((program) => selProgramIds.has(program.id))
    }
    const relevantProgramIds = new Set(
      scopedData.projects
        .map((project) => project.programId)
        .filter(Boolean)
    )
    return programs.filter((program) => relevantProgramIds.has(program.id))
  }, [scope, selProgramIds, scopedData.projects, programs])

  const runExport = () => {
    setExporting(true)
    try {
      if (format === 'csv') {
        const csv  = buildCSV(scopedData.tasks, scopedData.projects, scopedPrograms, columns, include.subtasks, include.milestones, scopedData.milestones)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `taskflow-${new Date().toISOString().split('T')[0]}.csv`
        a.click(); URL.revokeObjectURL(url)
      } else if (format === 'xlsx') {
        const workbookXml = buildExcelWorkbookXml({
          tasks: scopedData.tasks,
          projects: scopedData.projects,
          programs: scopedPrograms,
          milestones: scopedData.milestones,
          columns,
          include,
          ganttConfig,
          scope,
          selectedProgramIds: [...selProgramIds],
          selectedProjectIds: [...selProjectIds],
        })
        const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `taskflow-${new Date().toISOString().split('T')[0]}.xls`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const html = buildPDF(scopedData.tasks, scopedData.projects, scopedPrograms, scopedData.milestones, include)
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
                  {[['tasks', 'Tasks'], ['subtasks', 'Subtasks'], ['milestones', 'Milestones'], ['summaries', 'Summary stats'], ['ganttConfig', 'Gantt config'], ['programSheets', 'Program sheets (Excel)']].map(([key, label]) => (
                    <ColCheck key={key} label={label} active={include[key]} onChange={() => toggleInclude(key)} />
                  ))}
                </div>
                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Program sheets add one worksheet per program in Excel exports, with overview, project, milestone, and task details.
                </p>
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
                  <button onClick={() => setFormat('xlsx')}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={format === 'xlsx'
                      ? { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <FileSpreadsheet size={14} /> Excel Workbook
                  </button>
                  <button onClick={() => setFormat('pdf')}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={format === 'pdf'
                      ? { background: 'rgba(192,132,252,0.12)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <FileText size={14} /> PDF Report
                  </button>
                </div>
                {format === 'xlsx' && (
                  <div
                    className="mt-2 rounded-xl px-3 py-2 text-[11px]"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.16)', color: '#a7f3d0' }}
                  >
                    Excel workbook includes an <span className="font-semibold">Export_Selection</span> sheet plus optional per-program worksheets with summary, projects, milestones, and task details.
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Step 2: Column selector (CSV/XLSX)
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
          {(format === 'csv' || format === 'xlsx') && step === 1 ? (
            <button onClick={() => setStep(2)}
              className="flex items-center gap-1.5 btn-accent py-2 text-xs px-4">
              Select columns <ChevronRight size={12} />
            </button>
          ) : (
            <button onClick={runExport} disabled={exporting}
              className="flex items-center gap-1.5 btn-accent py-2 text-xs px-4"
              style={exporting ? { opacity: 0.6 } : {}}>
              <Download size={12} />
              {format === 'csv'
                ? `Export CSV (${taskCount})`
                : format === 'xlsx'
                  ? `Export Excel (${taskCount})`
                  : 'Export PDF'}
            </button>
          )}
        </div>
      </div>
    </>
  )
})

export default ExportModal
