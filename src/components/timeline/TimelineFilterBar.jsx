import { memo, useMemo } from 'react'
import { AlertTriangle, CalendarClock, GitBranch, Link2, X } from 'lucide-react'

const chipStyle = (active, accent) => (active
  ? { background: `${accent}22`, color: accent, border: `1px solid ${accent}60` }
  : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' })

const TimelineFilterBar = memo(function TimelineFilterBar({
  programs,
  projects,
  filteredProgramIds,
  filteredProjectIds,
  onlyDelayed,
  onlyCritical,
  onlyDependencyRisk,
  showDependencies,
  onToggleProgram,
  onToggleProject,
  onToggleOnlyDelayed,
  onToggleOnlyCritical,
  onToggleOnlyDependencyRisk,
  onToggleShowDependencies,
  onClear,
  onClose,
}) {
  const hasFilter =
    filteredProgramIds.size > 0 ||
    filteredProjectIds.size > 0 ||
    onlyDelayed ||
    onlyCritical ||
    onlyDependencyRisk

  const visibleProjectChips = useMemo(() => {
    const topLevel = projects.filter((project) => !project.parentId)
    if (filteredProgramIds.size === 0) return topLevel
    return topLevel.filter((project) => filteredProgramIds.has(project.programId))
  }, [projects, filteredProgramIds])

  return (
    <div className="px-4 md:px-6 pb-2.5">
      <div
        className="rounded-2xl p-2.5"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <button
            onClick={onToggleOnlyDelayed}
            className="text-[11px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1.5"
            style={chipStyle(onlyDelayed, '#f97316')}
          >
            <CalendarClock size={10} />
            Delayed
          </button>
          <button
            onClick={onToggleOnlyCritical}
            className="text-[11px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1.5"
            style={chipStyle(onlyCritical, '#ef4444')}
          >
            <AlertTriangle size={10} />
            Critical
          </button>
          <button
            onClick={onToggleOnlyDependencyRisk}
            className="text-[11px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1.5"
            style={chipStyle(onlyDependencyRisk, '#38bdf8')}
          >
            <Link2 size={10} />
            Dependency risk
          </button>
          <button
            onClick={onToggleShowDependencies}
            className="text-[11px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1.5"
            style={chipStyle(showDependencies, '#7dd3fc')}
          >
            <GitBranch size={10} />
            Show links
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            {hasFilter && (
              <button
                onClick={onClear}
                className="text-[11px] px-2 py-0.5 rounded-full transition-colors hover:bg-white/8 flex items-center gap-1"
                style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <X size={10} />
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[11px] px-2 py-0.5 rounded-full transition-colors hover:bg-white/8 flex items-center gap-1"
              style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <X size={10} />
              Close
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Programs
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {programs.map((program) => {
              const active = filteredProgramIds.has(program.id)
              return (
                <button
                  key={program.id}
                  onClick={() => onToggleProgram(program.id)}
                  className="text-[11px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1.5"
                  style={chipStyle(active, program.color)}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: program.color }} />
                  {program.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Projects
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleProjectChips.map((project) => {
              const active = filteredProjectIds.has(project.id)
              return (
                <button
                  key={project.id}
                  onClick={() => onToggleProject(project.id)}
                  className="text-[11px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1.5"
                  style={chipStyle(active, project.color)}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: project.color }} />
                  {project.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})

export default TimelineFilterBar
