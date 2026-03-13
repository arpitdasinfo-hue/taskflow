import { memo, useEffect, useMemo, useRef, useState } from 'react'
import Header from '../components/layout/Header'
import TimelineToolbar from '../components/timeline/TimelineToolbar'
import TimelineFilterBar from '../components/timeline/TimelineFilterBar'
import TimelineLegend from '../components/timeline/TimelineLegend'
import TimelineGrid from '../components/timeline/TimelineGrid'
import TimelineEmptyState from '../components/timeline/TimelineEmptyState'
import TimelinePlanningPanel from '../components/timeline/TimelinePlanningPanel'
import TimelineActionToast from '../components/timeline/TimelineActionToast'
import useProjectStore from '../store/useProjectStore'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore from '../store/useSettingsStore'
import useTimelineScale from '../hooks/useTimelineScale'
import useTimelineRows from '../hooks/useTimelineRows'
import useTimelineIntelligence from '../hooks/useTimelineIntelligence'

const NOTICE_TIMEOUT_MS = 6000

const normalizeArray = (value) => [...(value ?? [])].sort()

const configsMatch = (left = {}, right = {}) => {
  const compareKeys = [
    'zoom',
    'viewMode',
    'showDependencies',
    'onlyDelayed',
    'onlyCritical',
    'onlyDependencyRisk',
    'rangeStart',
    'searchQuery',
  ]

  const primitiveMatch = compareKeys.every((key) => (left?.[key] ?? null) === (right?.[key] ?? null))
  if (!primitiveMatch) return false

  return ['filteredProgramIds', 'filteredProjectIds', 'filteredSubProjectIds', 'expandedProjectIds']
    .every((key) => {
      const a = normalizeArray(left?.[key])
      const b = normalizeArray(right?.[key])
      if (a.length !== b.length) return false
      return a.every((value, index) => value === b[index])
    })
}

const Timeline = memo(function Timeline() {
  const programs = useProjectStore((s) => s.programs)
  const projects = useProjectStore((s) => s.projects)
  const milestones = useProjectStore((s) => s.milestones)
  const updateProject = useProjectStore((s) => s.updateProject)
  const tasks = useTaskStore((s) => s.tasks)
  const addTask = useTaskStore((s) => s.addTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const selectTask = useSettingsStore((s) => s.selectTask)
  const ganttConfig = useSettingsStore((s) => s.ganttConfig)
  const setGanttConfig = useSettingsStore((s) => s.setGanttConfig)
  const savedGanttViews = useSettingsStore((s) => s.savedGanttViews)
  const saveGanttView = useSettingsStore((s) => s.saveGanttView)
  const deleteGanttView = useSettingsStore((s) => s.deleteGanttView)

  const [filteredProgramIds, setFilteredProgramIds] = useState(() => new Set(ganttConfig.filteredProgramIds ?? []))
  const [filteredProjectIds, setFilteredProjectIds] = useState(() => new Set(ganttConfig.filteredProjectIds ?? []))
  const [filteredSubProjectIds, setFilteredSubProjectIds] = useState(() => new Set(ganttConfig.filteredSubProjectIds ?? []))
  const [expandedProjectIds, setExpandedProjectIds] = useState(() => new Set(ganttConfig.expandedProjectIds ?? []))
  const [viewMode, setViewMode] = useState(ganttConfig.viewMode ?? 'roadmap')
  const [searchQuery, setSearchQuery] = useState(ganttConfig.searchQuery ?? '')
  const [onlyDelayed, setOnlyDelayed] = useState(Boolean(ganttConfig.onlyDelayed))
  const [onlyCritical, setOnlyCritical] = useState(Boolean(ganttConfig.onlyCritical))
  const [onlyDependencyRisk, setOnlyDependencyRisk] = useState(Boolean(ganttConfig.onlyDependencyRisk))
  const [showDependencies, setShowDependencies] = useState(ganttConfig.showDependencies ?? true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [scheduleNotice, setScheduleNotice] = useState(null)

  const initializedExpandedRef = useRef((ganttConfig.expandedProjectIds ?? []).length > 0)
  const restoredScaleRef = useRef(false)
  const scheduleNoticeTimerRef = useRef(null)

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
    restoreScale,
  } = useTimelineScale({ initialZoom: ganttConfig.zoom })

  useEffect(() => {
    if (restoredScaleRef.current) return
    if (!ganttConfig.rangeStart && !ganttConfig.zoom) return
    restoreScale({ zoom: ganttConfig.zoom, rangeStart: ganttConfig.rangeStart })
    restoredScaleRef.current = true
  }, [ganttConfig.rangeStart, ganttConfig.zoom, restoreScale])

  useEffect(() => () => {
    if (scheduleNoticeTimerRef.current) clearTimeout(scheduleNoticeTimerRef.current)
  }, [])

  useEffect(() => {
    setGanttConfig({
      zoom,
      viewMode,
      searchQuery,
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
    searchQuery,
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
    searchQuery,
  })

  const insights = useTimelineIntelligence({
    programs,
    projects,
    tasks,
    filteredProgramIds,
    filteredProjectIds,
    filteredSubProjectIds,
  })

  const visibleCounts = useMemo(() => ({
    programs: rows.filter((row) => row.type === 'program').length,
    projects: rows.filter((row) => row.type === 'project').length,
    tasks: rows.filter((row) => row.type === 'task').length,
  }), [rows])

  const expandableProjectIds = useMemo(
    () => rows
      .filter((row) => row.type === 'project' && row.expandable && row.projectId)
      .map((row) => row.projectId),
    [rows]
  )

  const currentViewSnapshot = useMemo(() => ({
    zoom,
    viewMode,
    searchQuery: searchQuery.trim(),
    showDependencies,
    onlyDelayed,
    onlyCritical,
    onlyDependencyRisk,
    filteredProgramIds: normalizeArray(filteredProgramIds),
    filteredProjectIds: normalizeArray(filteredProjectIds),
    filteredSubProjectIds: normalizeArray(filteredSubProjectIds),
    expandedProjectIds: normalizeArray(expandedProjectIds),
    rangeStart: startDate?.toISOString?.() ?? null,
    rangeEnd: endDate?.toISOString?.() ?? null,
  }), [
    zoom,
    viewMode,
    searchQuery,
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
  ])

  const activeSavedViewId = useMemo(
    () => savedGanttViews.find((view) => configsMatch(view.config, currentViewSnapshot))?.id ?? null,
    [savedGanttViews, currentViewSnapshot]
  )

  const publishScheduleNotice = (nextNotice) => {
    if (scheduleNoticeTimerRef.current) clearTimeout(scheduleNoticeTimerRef.current)
    setScheduleNotice(nextNotice)
    scheduleNoticeTimerRef.current = setTimeout(() => {
      setScheduleNotice(null)
      scheduleNoticeTimerRef.current = null
    }, NOTICE_TIMEOUT_MS)
  }

  const dismissScheduleNotice = () => {
    if (scheduleNoticeTimerRef.current) clearTimeout(scheduleNoticeTimerRef.current)
    scheduleNoticeTimerRef.current = null
    setScheduleNotice(null)
  }

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

  const expandAllProjects = () => {
    setExpandedProjectIds(new Set(expandableProjectIds))
  }

  const collapseAllProjects = () => {
    setExpandedProjectIds(new Set())
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

    setOnlyDelayed(true)
    setOnlyCritical(true)
    setOnlyDependencyRisk(true)
    setShowDependencies(true)
    setExpandedProjectIds(projectIdsWithTasks)
  }

  const applySavedView = (viewId) => {
    const nextView = savedGanttViews.find((view) => view.id === viewId)
    if (!nextView) return

    const configToApply = nextView.config ?? {}
    setViewMode(configToApply.viewMode ?? 'roadmap')
    setSearchQuery(configToApply.searchQuery ?? '')
    setShowDependencies(configToApply.showDependencies ?? true)
    setOnlyDelayed(Boolean(configToApply.onlyDelayed))
    setOnlyCritical(Boolean(configToApply.onlyCritical))
    setOnlyDependencyRisk(Boolean(configToApply.onlyDependencyRisk))
    setFilteredProgramIds(new Set(configToApply.filteredProgramIds ?? []))
    setFilteredProjectIds(new Set(configToApply.filteredProjectIds ?? []))
    setFilteredSubProjectIds(new Set(configToApply.filteredSubProjectIds ?? []))
    setExpandedProjectIds(new Set(configToApply.expandedProjectIds ?? []))
    restoreScale({ zoom: configToApply.zoom, rangeStart: configToApply.rangeStart })
    setShowFilterPanel(false)
  }

  const saveCurrentView = (name) => {
    saveGanttView({
      name,
      config: currentViewSnapshot,
    })
  }

  const handleTaskScheduleUpdate = (taskId, updates, previous) => {
    const taskLabel = tasks.find((task) => task.id === taskId)?.title ?? 'Task'
    updateTask(taskId, updates)
    publishScheduleNotice({
      kind: 'task',
      id: taskId,
      previous,
      itemLabel: taskLabel,
      actionLabel: 'Task schedule updated',
    })
  }

  const handleProjectScheduleUpdate = (projectId, updates, previous) => {
    const projectLabel = projects.find((project) => project.id === projectId)?.name ?? 'Project'
    updateProject(projectId, updates)
    publishScheduleNotice({
      kind: 'project',
      id: projectId,
      previous,
      itemLabel: projectLabel,
      actionLabel: 'Project schedule updated',
    })
  }

  const undoScheduleChange = () => {
    if (!scheduleNotice?.previous) return

    if (scheduleNotice.kind === 'task') {
      updateTask(scheduleNotice.id, scheduleNotice.previous)
    } else if (scheduleNotice.kind === 'project') {
      updateProject(scheduleNotice.id, scheduleNotice.previous)
    }

    dismissScheduleNotice()
  }

  const createTaskInRange = ({ rowType, programId, projectId, startDate: nextStartDate, dueDate: nextDueDate }) => {
    const created = addTask({
      title: 'New task',
      programId: programId ?? null,
      projectId: projectId ?? null,
      startDate: nextStartDate,
      dueDate: nextDueDate,
    })

    if (rowType === 'project' && projectId) {
      setExpandedProjectIds((previous) => new Set([...previous, projectId]))
    }

    selectTask(created.id)
  }

  const filtered =
    filteredProgramIds.size > 0 ||
    filteredProjectIds.size > 0 ||
    filteredSubProjectIds.size > 0 ||
    onlyDelayed ||
    onlyCritical ||
    onlyDependencyRisk ||
    searchQuery.trim().length > 0

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
        searchQuery={searchQuery}
        visibleCounts={visibleCounts}
        expandableProjectCount={expandableProjectIds.length}
        activeFilterCount={activeFilterCount}
        filterPanelOpen={showFilterPanel}
        onChangeProgram={setProgramScope}
        onChangeProject={setProjectScope}
        onChangeSubProject={setSubProjectScope}
        onChangeViewMode={applyViewMode}
        onSearchChange={setSearchQuery}
        onChangeZoom={changeZoom}
        onShiftRange={shiftRange}
        onResetToToday={resetToToday}
        onExpandAll={expandAllProjects}
        onCollapseAll={collapseAllProjects}
        onToggleFilterPanel={() => setShowFilterPanel((value) => !value)}
      />

      <TimelinePlanningPanel
        savedViews={savedGanttViews}
        activeSavedViewId={activeSavedViewId}
        onApplySavedView={applySavedView}
        onSaveCurrentView={saveCurrentView}
        onDeleteSavedView={deleteGanttView}
        onOpenRiskView={() => applyViewMode('risk')}
        onExpandAll={expandAllProjects}
        insights={insights}
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
          onUpdateTaskSchedule={handleTaskScheduleUpdate}
          onUpdateProjectSchedule={handleProjectScheduleUpdate}
          onCreateTaskInRange={createTaskInRange}
          showDependencies={showDependencies}
          onlyDependencyRisk={onlyDependencyRisk}
        />
      )}

      <TimelineActionToast
        itemLabel={scheduleNotice?.itemLabel}
        actionLabel={scheduleNotice?.actionLabel}
        showUndo={Boolean(scheduleNotice?.previous)}
        onUndo={scheduleNotice?.previous ? undoScheduleChange : dismissScheduleNotice}
        onDismiss={dismissScheduleNotice}
      />
    </div>
  )
})

export default Timeline
