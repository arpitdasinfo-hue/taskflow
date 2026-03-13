import { memo } from 'react'
import { ChevronDownSquare, ChevronLeft, ChevronRight, ChevronUpSquare, Filter, Search, Target } from 'lucide-react'
import { TIMELINE_VIEW_MODES, ZOOM_CONFIGS } from './timelineConfig'

const ControlLabel = ({ children }) => (
  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
    {children}
  </span>
)

const selectStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text-primary)',
}

const TimelineToolbar = memo(function TimelineToolbar({
  zoom,
  rangeLabel,
  stats,
  selectedProgramId,
  selectedProjectId,
  selectedSubProjectId,
  visiblePrograms,
  visibleProjects,
  visibleSubProjects,
  viewMode,
  activeFilterCount,
  filterPanelOpen,
  searchQuery = '',
  visibleCounts = { programs: 0, projects: 0, tasks: 0 },
  expandableProjectCount = 0,
  readOnly = false,
  onChangeProgram,
  onChangeProject,
  onChangeSubProject,
  onChangeViewMode,
  onSearchChange,
  onChangeZoom,
  onShiftRange,
  onResetToToday,
  onExpandAll,
  onCollapseAll,
  onToggleFilterPanel,
}) {
  const currentView = TIMELINE_VIEW_MODES[viewMode] ?? TIMELINE_VIEW_MODES.roadmap

  return (
    <div className="px-4 md:px-6 pb-3">
      <div
        className="rounded-[22px] p-3 md:p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
        }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
              {readOnly ? 'Read-Only Gantt' : 'Gantt Workspace'}
            </p>
            <h2 className="text-sm md:text-base font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
              {currentView.label}
            </h2>
            <p className="text-xs mt-1 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              {currentView.description}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.08)', color: 'var(--accent)' }}>
              {visibleCounts.programs} programs
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              {visibleCounts.projects} projects
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              {visibleCounts.tasks} tasks
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              {stats.scheduledCount} scheduled
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
              {stats.unscheduledCount} unscheduled
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>
              {stats.delayedCount} late
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              {stats.criticalCount} critical
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 mb-3">
          <label className="relative block">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search programs, projects, tasks, or schedule notes"
              className="w-full rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onExpandAll}
              disabled={expandableProjectCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ChevronDownSquare size={13} />
              Expand all
            </button>
            <button
              onClick={onCollapseAll}
              disabled={expandableProjectCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ChevronUpSquare size={13} />
              Collapse all
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr_auto] gap-3 items-start">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="flex flex-col gap-1.5">
              <ControlLabel>Program</ControlLabel>
              <select
                value={selectedProgramId}
                onChange={(event) => onChangeProgram(event.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl"
                style={selectStyle}
              >
                <option value="">All programs</option>
                {visiblePrograms.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <ControlLabel>Project</ControlLabel>
              <select
                value={selectedProjectId}
                onChange={(event) => onChangeProject(event.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl"
                style={selectStyle}
              >
                <option value="">All projects</option>
                {visibleProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <ControlLabel>Sub-project</ControlLabel>
              <select
                value={selectedSubProjectId}
                onChange={(event) => onChangeSubProject(event.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl"
                style={selectStyle}
                disabled={visibleSubProjects.length === 0}
              >
                <option value="">All sub-projects</option>
                {visibleSubProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <ControlLabel>View</ControlLabel>
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {Object.values(TIMELINE_VIEW_MODES).map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => onChangeViewMode(mode.id)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={viewMode === mode.id
                      ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 8px 20px rgba(var(--accent-rgb),0.25)' }
                      : { color: 'var(--text-secondary)' }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <ControlLabel>Time</ControlLabel>
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {Object.values(ZOOM_CONFIGS).map((cfg) => (
                  <button
                    key={cfg.id}
                    onClick={() => onChangeZoom(cfg.id)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={zoom === cfg.id
                      ? { background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.34)' }
                      : { color: 'var(--text-secondary)' }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex xl:flex-col items-stretch gap-2 min-w-[220px]">
            <div className="flex items-center justify-between gap-1 rounded-xl px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => onShiftRange(-1)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Previous range"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="text-xs text-center px-2 min-w-0">
                <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{rangeLabel}</div>
                <div style={{ color: 'var(--text-secondary)' }}>Current window</div>
              </div>
              <button
                onClick={() => onShiftRange(1)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Next range"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onResetToToday}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/10"
                style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.22)' }}
              >
                <Target size={12} />
                Today
              </button>
              <button
                onClick={onToggleFilterPanel}
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                style={filterPanelOpen
                  ? { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.45)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Filter size={12} />
                Advanced
                {activeFilterCount > 0 && (
                  <span className="text-[10px] px-1 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.18)', color: 'var(--accent)' }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default TimelineToolbar
