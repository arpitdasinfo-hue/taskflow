import { memo, useEffect, useState } from 'react'
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  Maximize2,
  Minimize2,
  Search,
  Target,
} from 'lucide-react'
import InfoTooltip from '../common/InfoTooltip'
import { TIMELINE_VIEW_MODES, ZOOM_CONFIGS } from './timelineConfig'

const ControlLabel = ({ children, compact = false }) => (
  <span className={`font-semibold uppercase ${compact ? 'text-[9px] tracking-[0.14em]' : 'text-[10px] tracking-[0.18em]'}`} style={{ color: 'var(--text-secondary)' }}>
    {children}
  </span>
)

const selectStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text-primary)',
}

const SummaryChip = ({ label, value, tone = 'neutral', compact = false }) => {
  const tones = {
    neutral: { background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', border: 'rgba(255,255,255,0.08)' },
    accent: { background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', border: 'rgba(var(--accent-rgb),0.24)' },
    warning: { background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: 'rgba(249,115,22,0.2)' },
    muted: { background: 'rgba(148,163,184,0.12)', color: '#cbd5e1', border: 'rgba(148,163,184,0.18)' },
  }
  const palette = tones[tone] ?? tones.neutral

  return (
    <div
      className={`rounded-2xl ${compact ? 'min-w-0 px-2 py-1.5' : 'min-w-[96px] px-3 py-2'}`}
      style={{ background: palette.background, border: `1px solid ${palette.border}` }}
    >
      <p className={`${compact ? 'text-[8px] tracking-[0.12em]' : 'text-[10px] tracking-[0.16em]'} uppercase truncate`} style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <p className={`${compact ? 'text-[11px] mt-0.5' : 'text-sm mt-1'} font-semibold whitespace-nowrap overflow-hidden text-ellipsis`} style={{ color: palette.color }}>
        {value}
      </p>
    </div>
  )
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
  readOnly = false,
  compact = false,
  hideScopeControls = false,
  isCustomRange = false,
  customRangeStart = '',
  customRangeEnd = '',
  onChangeProgram,
  onChangeProject,
  onChangeSubProject,
  onChangeViewMode,
  onSearchChange,
  onChangeZoom,
  onChangeCustomRangeStart,
  onChangeCustomRangeEnd,
  onApplyCustomRange,
  onShiftRange,
  onResetToToday,
  onToggleFilterPanel,
  onToggleFullscreen,
  isFullscreen = false,
}) {
  const currentView = TIMELINE_VIEW_MODES[viewMode] ?? TIMELINE_VIEW_MODES.roadmap
  const [customPickerOpen, setCustomPickerOpen] = useState(false)

  useEffect(() => {
    if (!isCustomRange) setCustomPickerOpen(false)
  }, [isCustomRange])

  const handleZoomChange = (nextZoom) => {
    onChangeZoom?.(nextZoom)
    setCustomPickerOpen(nextZoom === 'custom')
  }

  const handleApplyCustomRange = () => {
    const result = onApplyCustomRange?.()
    if (result !== false) setCustomPickerOpen(false)
  }

  const headerLayoutClass = compact
    ? 'grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]'
    : 'flex items-start justify-between gap-4 flex-wrap'

  const summaryLayoutClass = compact
    ? 'grid grid-cols-2 gap-2 sm:grid-cols-4'
    : 'flex flex-wrap gap-2'

  const searchScopeLayoutClass = compact
    ? 'grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(0,0.92fr))]'
    : 'grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,0.72fr))]'

  const searchFieldClass = compact ? 'relative block md:col-span-2 xl:col-span-1' : 'relative block'

  const actionLayoutClass = compact
    ? 'flex flex-wrap items-center gap-2'
    : 'flex items-end gap-2 flex-wrap xl:justify-end'

  const scopeActionsClass = compact
    ? 'grid grid-cols-1 gap-3 mb-3'
    : 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 mb-3'

  const modeLayoutClass = compact
    ? 'grid grid-cols-1 gap-3 items-start'
    : 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start'

  const viewZoomLayoutClass = compact
    ? 'grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
    : 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] gap-3'

  const shellPaddingClass = compact ? 'rounded-[18px] p-2.5 md:p-3' : 'rounded-[24px] p-4 md:p-5'
  const inputClass = compact ? 'w-full rounded-xl pl-9 pr-3 py-2 text-xs outline-none' : 'w-full rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none'
  const selectClass = compact ? 'w-full text-xs px-3 py-2 rounded-xl' : 'w-full text-sm px-3 py-2 rounded-xl'
  const actionButtonClass = compact ? 'inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-medium transition-colors hover:bg-white/10' : 'inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/10'
  const secondaryButtonClass = compact ? 'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-medium disabled:opacity-40' : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-40'
  const toggleButtonClass = compact ? 'inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-medium transition-colors' : 'inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors'
  const segmentedButtonClass = compact ? 'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors min-w-0 whitespace-nowrap' : 'flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors'

  return (
    <div className={compact ? 'px-2 pb-2' : 'px-4 md:px-6 pb-3'}>
      <div
        className={shellPaddingClass}
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: compact ? '0 12px 28px rgba(0,0,0,0.16)' : '0 20px 48px rgba(0,0,0,0.2)',
        }}
      >
        <div className={`${headerLayoutClass} ${compact ? 'mb-3' : 'mb-4'}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
                {readOnly ? 'Gantt' : `${currentView.label} view`}
              </span>
              {!compact && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                >
                  {rangeLabel}
                </span>
              )}
              {activeFilterCount > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}
                >
                  {activeFilterCount} advanced filter{activeFilterCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className={`${compact ? 'text-[13px]' : 'text-sm md:text-[15px]'} font-medium`} style={{ color: 'var(--text-primary)' }}>
                {readOnly ? `${currentView.label} timeline` : `${currentView.label} focus`}
              </span>
              <InfoTooltip text={currentView.description} widthClassName="w-64" />
            </div>
          </div>

          <div className={summaryLayoutClass}>
            <SummaryChip label="Scope" value={`${visibleCounts.programs}P · ${visibleCounts.projects}Pr`} tone="accent" compact={compact} />
            <SummaryChip label="Tasks" value={visibleCounts.tasks} compact={compact} />
            <SummaryChip label="Late" value={stats.delayedCount} tone="warning" compact={compact} />
            <SummaryChip label="Unscheduled" value={stats.unscheduledCount} tone="muted" compact={compact} />
          </div>
        </div>

        <div className={scopeActionsClass}>
          <div className={hideScopeControls ? 'grid grid-cols-1 gap-2' : searchScopeLayoutClass}>
            <label className={searchFieldClass}>
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                value={searchQuery}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={compact ? 'Search workstreams or tasks' : 'Search workstreams, projects, or tasks'}
                className={inputClass}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'var(--text-primary)',
                }}
              />
            </label>

            {!hideScopeControls && (
              <>
                <label className="flex flex-col gap-1.5">
                  <ControlLabel compact={compact}>Program</ControlLabel>
                  <select
                    value={selectedProgramId}
                    onChange={(event) => onChangeProgram(event.target.value)}
                    className={selectClass}
                    style={selectStyle}
                  >
                    <option value="">All programs</option>
                    {visiblePrograms.map((program) => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <ControlLabel compact={compact}>Project</ControlLabel>
                  <select
                    value={selectedProjectId}
                    onChange={(event) => onChangeProject(event.target.value)}
                    className={selectClass}
                    style={selectStyle}
                  >
                    <option value="">All projects</option>
                    {visibleProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <ControlLabel compact={compact}>Sub-project</ControlLabel>
                  <select
                    value={selectedSubProjectId}
                    onChange={(event) => onChangeSubProject(event.target.value)}
                    className={selectClass}
                    style={selectStyle}
                    disabled={visibleSubProjects.length === 0}
                  >
                    <option value="">All sub-projects</option>
                    {visibleSubProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>

          <div className={actionLayoutClass}>
            <div className="flex items-center justify-between gap-1 rounded-xl px-2 py-1.5 min-w-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => onShiftRange(-1)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Previous range"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[11px] px-2 font-medium whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--text-primary)' }}>
                {rangeLabel}
              </span>
              <button
                onClick={() => onShiftRange(1)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Next range"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <button
              onClick={onResetToToday}
              className={actionButtonClass}
              style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.22)' }}
            >
              <Target size={12} />
              Today
            </button>

            <button
              onClick={onToggleFilterPanel}
              className={toggleButtonClass}
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

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className={toggleButtonClass}
                style={isFullscreen
                  ? { background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.45)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                title={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                {isFullscreen ? 'Exit full' : 'Fullscreen'}
              </button>
            )}
          </div>
        </div>

        <div className={modeLayoutClass}>
          <div className={viewZoomLayoutClass}>
            <div className="flex flex-col gap-1.5">
              <ControlLabel compact={compact}>View</ControlLabel>
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {Object.values(TIMELINE_VIEW_MODES).map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => onChangeViewMode(mode.id)}
                    className={segmentedButtonClass}
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
              <ControlLabel compact={compact}>Time Window</ControlLabel>
              <div className="flex items-center gap-1 p-1 rounded-xl flex-wrap" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {Object.values(ZOOM_CONFIGS).map((cfg) => (
                  <button
                    key={cfg.id}
                    onClick={() => handleZoomChange(cfg.id)}
                    className={`${segmentedButtonClass} ${compact ? 'min-w-[72px]' : 'min-w-[78px]'}`}
                    style={zoom === cfg.id
                      ? { background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.34)' }
                      : { color: 'var(--text-secondary)' }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>

              {customPickerOpen && (
                <div
                  className="rounded-2xl p-3"
                  style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      Choose your custom range
                    </p>
                    <button
                      onClick={() => setCustomPickerOpen(false)}
                      className="text-[11px] px-2 py-1 rounded-lg"
                      style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)' }}
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                    <label className="relative">
                      <CalendarRange
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--text-secondary)' }}
                      />
                      <input
                        type="date"
                        value={customRangeStart}
                        onChange={(event) => onChangeCustomRangeStart?.(event.target.value)}
                        className="w-full rounded-xl pl-8 pr-3 py-2 text-xs"
                        style={{ ...selectStyle, colorScheme: 'light' }}
                      />
                    </label>
                    <input
                      type="date"
                      value={customRangeEnd}
                      onChange={(event) => onChangeCustomRangeEnd?.(event.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-xs"
                      style={{ ...selectStyle, colorScheme: 'light' }}
                    />
                    <button
                      onClick={handleApplyCustomRange}
                      className="px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.34)' }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default TimelineToolbar
