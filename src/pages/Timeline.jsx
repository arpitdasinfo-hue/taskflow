import { memo, useEffect, useMemo, useRef, useState } from 'react'
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
  const [viewMode, setViewMode] = useState(ganttConfig.viewMode ?? 'roadmap')
  const [onlyDelayed, setOnlyDelayed] = useState(Boolean(ganttConfig.onlyDelayed))
  const [onlyCritical, setOnlyCritical] = useState(Boolean(ganttConfig.onlyCritical))
  const [onlyDependencyRisk, setOnlyDependencyRisk] = useState(Boolean(ganttConfig.onlyDependencyRisk))
  const [showDependencies, setShowDependencies] = useState(ganttConfig.showDependencies ?? true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const initializedExpandedRef = useRef((ganttConfig.expandedProjectIds ?? []).length > 0)

  useEffect(() => {
    if (initializedExpandedRef.current || projects.length === 0 || tasks.length === 0) return
    if ((ganttConfig.viewMode ?? 'roadmap') === 'roadmap') {
      initializedExpandedRef.current = true
      return
    }
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
  }, [projects, tasks, ganttConfig.viewMode])

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
      viewMode,
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
    viewMode,
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

  const selectedProgramId = useMemo(
    () => [...filteredProgramIds][0] ?? '',
    [filteredProgramIds]
  )

  const visibleProjects = useMemo(
    () => projects.filter((project) => !project.parentId && (!selectedProgramId || project.programId === selectedProgramId)),
    [projects, selectedProgramId]
  )

  const selectedProjectId = useMemo(
    () => [...filteredProjectIds][0] ?? '',
    [filteredProjectIds]
  )

  const visibleSubProjects = useMemo(() => {
    const subProjects = projects.filter((project) => Boolean(project.parentId))
    if (selectedProjectId) return subProjects.filter((project) => project.parentId === selectedProjectId)
    if (selectedProgramId) return subProjects.filter((project) => project.programId === selectedProgramId)
    return subProjects
  }, [projects, selectedProgramId, selectedProjectId])

  const selectedSubProjectId = useMemo(
    () => [...filteredSubProjectIds][0] ?? '',
    [filteredSubProjectIds]
  )

  useEffect(() => {
    if (!selectedProjectId) return
    if (!visibleProjects.some((project) => project.id === selectedProjectId)) {
      setFilteredProjectIds(new Set())
      setFilteredSubProjectIds(new Set())
    }
  }, [selectedProjectId, visibleProjects])

  useEffect(() => {
    if (!selectedSubProjectId) return
    if (!visibleSubProjects.some((project) => project.id === selectedSubProjectId)) {
      setFilteredSubProjectIds(new Set())
    }
  }, [selectedSubProjectId, visibleSubProjects])

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

  const setProgramScope = (id) => {
    setFilteredProgramIds(id ? new Set([id]) : new Set())
    setFilteredProjectIds(new Set())
    setFilteredSubProjectIds(new Set())
  }

  const setProjectScope = (id) => {
    if (!id) {
      setFilteredProjectIds(new Set())
      setFilteredSubProjectIds(new Set())
      return
    }
    setFilteredProjectIds(new Set([id]))
    setFilteredSubProjectIds(new Set())
  }

  const setSubProjectScope = (id) => {
    setFilteredSubProjectIds(id ? new Set([id]) : new Set())
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
    setOnlyDelayed(false)
    setOnlyCritical(false)
    setOnlyDependencyRisk(false)
    setShowDependencies(true)
  }

  const applyViewMode = (nextViewMode) => {
    if (!nextViewMode || nextViewMode === viewMode) return
    setViewMode(nextViewMode)

    const projectIdsWithTasks = new Set(
      tasks
        .map((task) => task.projectId)
        .filter(Boolean)
    )

    if (nextViewMode === 'roadmap') {
      setOnlyDelayed(false)
      setOnlyCritical(false)
      setOnlyDependencyRisk(false)
      setShowDependencies(false)
      setExpandedProjectIds(new Set())
      return
    }

    if (nextViewMode === 'delivery') {
      setOnlyDelayed(false)
      setOnlyCritical(false)
      setOnlyDependencyRisk(false)
      setShowDependencies(true)
      setExpandedProjectIds(projectIdsWithTasks)
      return
    }

    if (nextViewMode === 'risk') {
      setOnlyDelayed(true)
      setOnlyCritical(true)
      setOnlyDependencyRisk(true)
      setShowDependencies(true)
      setExpandedProjectIds(projectIdsWithTasks)
    }
  }

  const filtered =
    filteredProgramIds.size > 0 ||
    filteredProjectIds.size > 0 ||
    filteredSubProjectIds.size > 0 ||
    onlyDelayed ||
    onlyCritical ||
    onlyDependencyRisk

  const activeFilterCount =
    Number(onlyDelayed) +
    Number(onlyCritical) +
    Number(onlyDependencyRisk) +
    Number(!showDependencies)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      <TimelineToolbar
        zoom={zoom}
        rangeLabel={rangeLabel}
        stats={stats}
        selectedProgramId={selectedProgramId}
        selectedProjectId={selectedProjectId}
        selectedSubProjectId={selectedSubProjectId}
        visiblePrograms={programs}
        visibleProjects={visibleProjects}
        visibleSubProjects={visibleSubProjects}
        viewMode={viewMode}
        activeFilterCount={activeFilterCount}
        filterPanelOpen={showFilterPanel}
        onChangeProgram={setProgramScope}
        onChangeProject={setProjectScope}
        onChangeSubProject={setSubProjectScope}
        onChangeViewMode={applyViewMode}
        onChangeZoom={changeZoom}
        onShiftRange={shiftRange}
        onResetToToday={resetToToday}
        onToggleFilterPanel={() => setShowFilterPanel((value) => !value)}
      />

      {showFilterPanel && (
        <TimelineFilterBar
          onlyDelayed={onlyDelayed}
          onlyCritical={onlyCritical}
          onlyDependencyRisk={onlyDependencyRisk}
          showDependencies={showDependencies}
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
