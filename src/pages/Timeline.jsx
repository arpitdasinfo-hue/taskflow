import { memo, useState } from 'react'
import Header from '../components/layout/Header'
import TimelineToolbar from '../components/timeline/TimelineToolbar'
import TimelineFilterBar from '../components/timeline/TimelineFilterBar'
import TimelineLegend from '../components/timeline/TimelineLegend'
import TimelineGrid from '../components/timeline/TimelineGrid'
import TimelineEmptyState from '../components/timeline/TimelineEmptyState'
import useProjectStore from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'
import useTimelineScale from '../hooks/useTimelineScale'
import useTimelineRows from '../hooks/useTimelineRows'

const Timeline = memo(function Timeline() {
  const programs = useProjectStore((s) => s.programs)
  const projects = useProjectStore((s) => s.projects)
  const milestones = useProjectStore((s) => s.milestones)
  const tasks = useTaskStore((s) => s.tasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const selectTask = useSettingsStore((s) => s.selectTask)

  const [filteredProgramIds, setFilteredProgramIds] = useState(() => new Set())
  const [filteredProjectIds, setFilteredProjectIds] = useState(() => new Set())
  const [expandedProjectIds, setExpandedProjectIds] = useState(() => new Set())
  const [onlyDelayed, setOnlyDelayed] = useState(false)
  const [onlyCritical, setOnlyCritical] = useState(false)
  const [onlyDependencyRisk, setOnlyDependencyRisk] = useState(false)

  const {
    zoom,
    config,
    startDate,
    rangeLabel,
    changeZoom,
    shiftRange,
    resetToToday,
  } = useTimelineScale()

  const { rows, stats } = useTimelineRows({
    programs,
    projects,
    tasks,
    milestones,
    filteredProgramIds,
    filteredProjectIds,
    expandedProjectIds,
    onlyDelayed,
    onlyCritical,
    onlyDependencyRisk,
  })

  const toggleProgram = (id) => {
    setFilteredProgramIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    // Keep project filters scoped to latest program choices.
    setFilteredProjectIds(new Set())
  }

  const toggleProject = (id) => {
    setFilteredProjectIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpandedProject = (projectId) => {
    setExpandedProjectIds((previous) => {
      const next = new Set(previous)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const clearFilters = () => {
    setFilteredProgramIds(new Set())
    setFilteredProjectIds(new Set())
    setOnlyDelayed(false)
    setOnlyCritical(false)
    setOnlyDependencyRisk(false)
  }

  const openTimelineTaskComposer = ({ projectId = '', programId = '' } = {}) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('taskflow:quick-add', {
        detail: { type: 'task', projectId, programId },
      })
    )
  }

  const filtered =
    filteredProgramIds.size > 0 ||
    filteredProjectIds.size > 0 ||
    onlyDelayed ||
    onlyCritical ||
    onlyDependencyRisk

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      <TimelineToolbar
        zoom={zoom}
        rangeLabel={rangeLabel}
        stats={stats}
        onlyDelayed={onlyDelayed}
        onlyCritical={onlyCritical}
        onlyDependencyRisk={onlyDependencyRisk}
        onChangeZoom={changeZoom}
        onShiftRange={shiftRange}
        onResetToToday={resetToToday}
        onToggleOnlyDelayed={() => setOnlyDelayed((value) => !value)}
        onToggleOnlyCritical={() => setOnlyCritical((value) => !value)}
        onToggleOnlyDependencyRisk={() => setOnlyDependencyRisk((value) => !value)}
        onAddTask={() => openTimelineTaskComposer()}
      />

      {programs.length > 0 && (
        <TimelineFilterBar
          programs={programs}
          projects={projects}
          filteredProgramIds={filteredProgramIds}
          filteredProjectIds={filteredProjectIds}
          onToggleProgram={toggleProgram}
          onToggleProject={toggleProject}
          onClear={clearFilters}
        />
      )}

      <TimelineLegend />

      {rows.length === 0 ? (
        <TimelineEmptyState filtered={filtered} />
      ) : (
        <TimelineGrid
          rows={rows}
          startDate={startDate}
          days={config.days}
          cellWidth={config.cellWidth}
          zoom={zoom}
          onToggleProject={toggleExpandedProject}
          onSelectTask={selectTask}
          onUpdateTaskSchedule={(taskId, updates) => updateTask(taskId, updates)}
          onQuickAddTask={openTimelineTaskComposer}
        />
      )}
    </div>
  )
})

export default Timeline
