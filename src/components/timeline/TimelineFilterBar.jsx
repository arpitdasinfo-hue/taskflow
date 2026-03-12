import { memo, useMemo } from 'react'
import { X } from 'lucide-react'

const TimelineFilterBar = memo(function TimelineFilterBar({
  programs,
  projects,
  filteredProgramIds,
  filteredProjectIds,
  onToggleProgram,
  onToggleProject,
  onClear,
}) {
  const hasFilter = filteredProgramIds.size > 0 || filteredProjectIds.size > 0

  const visibleProjectChips = useMemo(() => {
    const topLevel = projects.filter((project) => !project.parentId)
    if (filteredProgramIds.size === 0) return topLevel
    return topLevel.filter((project) => filteredProgramIds.has(project.programId))
  }, [projects, filteredProgramIds])

  return (
    <div className="px-4 md:px-6 pb-2.5">
      <div
        className="rounded-2xl p-2.5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
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
                  style={active
                    ? { background: `${program.color}22`, color: program.color, border: `1px solid ${program.color}60` }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
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
                  style={active
                    ? { background: `${project.color}22`, color: project.color, border: `1px solid ${project.color}60` }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: project.color }} />
                  {project.name}
                </button>
              )
            })}
          </div>

          {hasFilter && (
            <button
              onClick={onClear}
              className="text-[11px] px-2 py-0.5 rounded-full transition-colors hover:bg-white/8 flex items-center gap-1"
              style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <X size={10} />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default TimelineFilterBar
