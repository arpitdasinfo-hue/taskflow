import { memo, useEffect, useRef, useState } from 'react'
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
  const updateProject = useProjectStore((s) => s.updateProject)
  const tasks = useTaskStore((s) => s.tasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const selectTask = useSettingsStore((s) => s.selectTask)
  const ganttConfig = useSettingsStore((s) => s.ganttConfig)
  const setGanttConfig = useSettingsStore((s) => s.setGanttConfig)

  const [filteredProgramIds, setFilteredProgramIds] = useState(() => new Set(ganttConfig.filteredProgramIds ?? []))
  const [filteredProjectIds, setFilteredProjectIds] = useState(() => new Set(ganttConfig.filteredProjectIds ?? []))
  const [filteredSubProjectIds, setFilteredSubProjectIds] = useState(() => new Set(ganttConfig.filteredSubProjectIds ?? []))
  const [expandedProjectIds, setExpandedProjectIds] = useState(() => new Set(ganttConfig.expandedProjectIds ?? []))
  const [onlyDelayed, setOnlyDelayed] = useState(Boolean(ganttConfig.onlyDelayed))
  const [onlyCritical, setOnlyCritical] = useState(Boolean(ganttConfig.onlyCritical))
  const [onlyDependencyRisk, setOnlyDependencyRisk] = useState(Boolean(ganttConfig.onlyDependencyRisk))
  const [showDependencies, setShowDependencies] = useState(ganttConfig.showDependencies ?? true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const initializedExpandedRef = useRef((ganttConfig.expandedProjectIds ?? []).length > 0)

  useEffect(() => {
    if (initializedExpandedRef.current || projects.length === 0 || tasks.length === 0) return
    const projectIdsWithTasks = new Set(
      tasks
        .map((task) => task.projectId)
        .filter(Boolean)
    )
    setExpandedProjectIds(new Set(
      projects
        .filter((project) => projectIdsWithTasks.has(project.id))
        .map((project) => project.id)
    ))
    initializedExpandedRef.current = true
  }, [projects, tasks])

  const {
    zoom,
    config,
    startDate,
    endDate,
    rangeLabel,
    changeZoom,
    shiftRange,
    resetToToday,
  } = useTimelineScale({ initialZoom: ganttConfig.zoom })

  useEffect(() => {
    setGanttConfig({
      zoom,
      showDependencies,
      onlyDelayed,
      onlyCritical,
      onlyDependencyRisk,
      filteredProgramIds: [...filteredProgramIds],
      filteredProjectIds: [...filteredProjectIds],
      filteredSubProjectIds: [...filteredSubProjectIds],
      expandedProjectIds: [...expandedProjectIds],
      rangeStart: startDate?.toISOString?.() ?? null,
      rangeEnd: endDate?.toISOString?.() ?? null,
    })
  }, [
    zoom,
    showDependencies,
    onlyDelayed,
    onlyCritical,
    onlyDependencyRisk,
    filteredProgramIds,
    filteredProjectIds,
    filteredSubProjectIds,
    expandedProjectIds,
    startDate,
    endDate,
    setGanttConfig,
  ])

  const { rows, stats } = useTimelineRows({
    programs,
    projects,
    tasks,
    milestones,
    filteredProgramIds,
    filteredProjectIds,
    filteredSubProjectIds,
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
    setFilteredSubProjectIds(new Set())
  }

  const toggleProject = (id) => {
    setFilteredProjectIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setFilteredSubProjectIds(new Set())
  }

  const toggleSubProject = (id) => {
    setFilteredSubProjectIds((previous) => {
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
    setFilteredSubProjectIds(new Set())
    setOnlyDelayed(false)
    setOnlyCritical(false)
    setOnlyDependencyRisk(false)
    setShowDependencies(true)
  }

  const filtered =
    filteredProgramIds.size > 0 ||
    filteredProjectIds.size > 0 ||
    filteredSubProjectIds.size > 0 ||
    onlyDelayed ||
    onlyCritical ||
    onlyDependencyRisk

  const activeFilterCount =
    filteredProgramIds.size +
    filteredProjectIds.size +
    filteredSubProjectIds.size +
    Number(onlyDelayed) +
    Number(onlyCritical) +
    Number(onlyDependencyRisk)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      <TimelineToolbar
        zoom={zoom}
        rangeLabel={rangeLabel}
        stats={stats}
        activeFilterCount={activeFilterCount}
        filterPanelOpen={showFilterPanel}
        onChangeZoom={changeZoom}
        onShiftRange={shiftRange}
        onResetToToday={resetToToday}
        onToggleFilterPanel={() => setShowFilterPanel((value) => !value)}
      />

      {showFilterPanel && (
        <TimelineFilterBar
          programs={programs}
          projects={projects}
          filteredProgramIds={filteredProgramIds}
          filteredProjectIds={filteredProjectIds}
          filteredSubProjectIds={filteredSubProjectIds}
          onlyDelayed={onlyDelayed}
          onlyCritical={onlyCritical}
          onlyDependencyRisk={onlyDependencyRisk}
          showDependencies={showDependencies}
          onToggleProgram={toggleProgram}
          onToggleProject={toggleProject}
          onToggleSubProject={toggleSubProject}
          onToggleOnlyDelayed={() => setOnlyDelayed((value) => !value)}
          onToggleOnlyCritical={() => setOnlyCritical((value) => !value)}
          onToggleOnlyDependencyRisk={() => setOnlyDependencyRisk((value) => !value)}
          onToggleShowDependencies={() => setShowDependencies((value) => !value)}
          onClear={clearFilters}
          onClose={() => setShowFilterPanel(false)}
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
          onUpdateProjectSchedule={(projectId, updates) => updateProject(projectId, updates)}
          showDependencies={showDependencies}
          onlyDependencyRisk={onlyDependencyRisk}
        />
      )}
    </div>
  )
})

export default Timeline
