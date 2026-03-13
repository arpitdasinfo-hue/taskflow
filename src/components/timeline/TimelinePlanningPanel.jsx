import { memo, useState } from 'react'
import { AlertTriangle, Bookmark, ChevronRight, LayoutTemplate, Plus, Trash2 } from 'lucide-react'
import InfoTooltip from '../common/InfoTooltip'

const CARD_TONE = {
  neutral: {
    background: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
  },
  warning: {
    background: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.28)',
    color: '#fbbf24',
  },
  danger: {
    background: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.28)',
    color: '#f87171',
  },
}

const ISSUE_TONE = {
  low: { color: '#7dd3fc', dot: '#38bdf8' },
  medium: { color: '#fbbf24', dot: '#f59e0b' },
  high: { color: '#fda4af', dot: '#fb7185' },
}

const TimelinePlanningPanel = memo(function TimelinePlanningPanel({
  savedViews = [],
  activeSavedViewId = null,
  onApplySavedView,
  onSaveCurrentView,
  onDeleteSavedView,
  onOpenRiskView,
  onExpandAll,
  insights = { cards: [], issues: [], scopeSummary: { programCount: 0, projectCount: 0, taskCount: 0 } },
  showSavedViews = true,
  showInsights = true,
}) {
  const [composerOpen, setComposerOpen] = useState(false)
  const [draftName, setDraftName] = useState('')

  const commitView = () => {
    const normalized = draftName.trim()
    if (!normalized) return
    onSaveCurrentView?.(normalized)
    setDraftName('')
    setComposerOpen(false)
  }

  const panelCount = Number(showSavedViews) + Number(showInsights)
  const gridClass = panelCount > 1 ? 'grid grid-cols-1 xl:grid-cols-[1.1fr_1.3fr] gap-3' : 'grid grid-cols-1 gap-3'

  if (!showSavedViews && !showInsights) return null

  if (showSavedViews && !showInsights) {
    return (
      <div className="px-4 md:px-6 pb-3">
        <section
          className="rounded-[20px] p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
                  Saved Views
                </p>
                <InfoTooltip
                  text="Reuse your roadmap, delivery, or risk setups without adding another heavy panel above the chart."
                  widthClassName="w-64"
                />
              </div>
            </div>

            <button
              onClick={() => setComposerOpen((value) => !value)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.24)' }}
            >
              <Plus size={13} />
              Save current
            </button>
          </div>

          {composerOpen && (
            <div
              className="flex flex-col md:flex-row gap-2 p-3 rounded-2xl mb-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitView()
                  if (event.key === 'Escape') {
                    setComposerOpen(false)
                    setDraftName('')
                  }
                }}
                placeholder="Quarterly delivery review"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={commitView}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setComposerOpen(false)
                    setDraftName('')
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {savedViews.length === 0 ? (
            <div
              className="rounded-2xl px-3 py-3 text-xs"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
            >
              No saved views yet. Save a clean review setup once and reuse it here.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savedViews.map((view) => {
                const active = view.id === activeSavedViewId
                return (
                  <div
                    key={view.id}
                    className="inline-flex items-center gap-1.5 rounded-2xl pl-3 pr-2 py-2"
                    style={{
                      background: active ? 'rgba(var(--accent-rgb),0.12)' : 'rgba(255,255,255,0.03)',
                      border: active ? '1px solid rgba(var(--accent-rgb),0.24)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <button onClick={() => onApplySavedView?.(view.id)} className="flex items-center gap-2 min-w-0">
                      <LayoutTemplate size={13} style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }} />
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {view.name}
                      </span>
                    </button>
                    <button
                      onClick={() => onDeleteSavedView?.(view.id)}
                      className="p-1 rounded-lg"
                      style={{ color: '#f87171' }}
                      title="Delete saved view"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 pb-3">
      <div className={gridClass}>
        {showSavedViews && (
        <section
          className="rounded-[20px] p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
                Saved Views
              </p>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Reuse planning setups
                </h3>
                <InfoTooltip
                  text="Save the current scope, filters, zoom, and range as a reusable Gantt view."
                  widthClassName="w-64"
                />
              </div>
            </div>

            <button
              onClick={() => setComposerOpen((value) => !value)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.24)' }}
            >
              <Plus size={13} />
              Save current
            </button>
          </div>

          {composerOpen && (
            <div
              className="flex flex-col md:flex-row gap-2 p-3 rounded-2xl mb-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitView()
                  if (event.key === 'Escape') {
                    setComposerOpen(false)
                    setDraftName('')
                  }
                }}
                placeholder="Quarterly delivery review"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={commitView}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setComposerOpen(false)
                    setDraftName('')
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {savedViews.length === 0 ? (
            <div
              className="rounded-2xl px-3 py-3 text-xs"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
            >
              No saved views yet. Save a roadmap, delivery, or risk view once and reuse it from here.
            </div>
          ) : (
            <div className="space-y-2">
              {savedViews.map((view) => {
                const active = view.id === activeSavedViewId
                return (
                  <div
                    key={view.id}
                    className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                    style={{
                      background: active ? 'rgba(var(--accent-rgb),0.12)' : 'rgba(255,255,255,0.03)',
                      border: active ? '1px solid rgba(var(--accent-rgb),0.24)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <button
                      onClick={() => onApplySavedView?.(view.id)}
                      className="min-w-0 text-left flex-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <LayoutTemplate size={13} style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }} />
                        <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {view.name}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {view.config?.viewMode ?? 'roadmap'} view · {view.config?.zoom ?? 'month'} zoom
                      </p>
                    </button>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onApplySavedView?.(view.id)}
                        className="p-2 rounded-xl"
                        style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }}
                        title="Apply saved view"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteSavedView?.(view.id)}
                        className="p-2 rounded-xl"
                        style={{ color: '#f87171' }}
                        title="Delete saved view"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
        )}

        {showInsights && (
        <section
          className="rounded-[20px] p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
                Planning Signals
              </p>
              <h3 className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                What needs attention now
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {insights.scopeSummary.programCount} programs · {insights.scopeSummary.projectCount} projects · {insights.scopeSummary.taskCount} tasks in the current scope.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenRiskView}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                Open risk view
              </button>
              <button
                onClick={onExpandAll}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Expand tasks
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
            {insights.cards.map((card) => {
              const tone = CARD_TONE[card.tone] ?? CARD_TONE.neutral
              return (
                <div
                  key={card.id}
                  className="rounded-2xl px-3 py-3"
                  style={{ background: tone.background, border: `1px solid ${tone.border}` }}
                >
                  <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                    {card.label}
                  </p>
                  <p className="text-lg font-semibold mt-1" style={{ color: tone.color }}>
                    {card.value}
                  </p>
                </div>
              )
            })}
          </div>

          {insights.issues.length === 0 ? (
            <div
              className="rounded-2xl px-3 py-3 text-xs flex items-center gap-2"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', color: '#6ee7b7' }}
            >
              <Bookmark size={13} />
              No immediate scheduling issues detected in the current scope.
            </div>
          ) : (
            <div className="space-y-2">
              {insights.issues.map((issue) => {
                const tone = ISSUE_TONE[issue.severity] ?? ISSUE_TONE.low
                return (
                  <div
                    key={issue.id}
                    className="rounded-2xl px-3 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} style={{ color: tone.dot, marginTop: 2, flexShrink: 0 }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: tone.color }}>
                          {issue.title}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {issue.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  )
})

export default TimelinePlanningPanel
