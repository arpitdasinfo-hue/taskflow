import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Link2, RefreshCw, Shield, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { getPublicAppUrl } from '../lib/publicUrl'
import useAuthStore from '../store/useAuthStore'
import {
  DEFAULT_SHARE_CONFIG,
  normalizeShareConfig,
  SHARE_MODULE_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  isShareLinkActive,
  shareStatus,
  scopeLabel,
} from '../lib/share'

const TogglePill = memo(function TogglePill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
      style={active
        ? { background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.32)' }
        : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {label}
    </button>
  )
})

const ShareModal = memo(function ShareModal({ resourceType, resourceId, resourceName, onClose }) {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [link, setLink] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [linkName, setLinkName] = useState(resourceName ? `${resourceName} • Manager View` : 'Manager View')
  const [config, setConfig] = useState(() => normalizeShareConfig(DEFAULT_SHARE_CONFIG))
  const [neverExpires, setNeverExpires] = useState(true)
  const [expiresAt, setExpiresAt] = useState('')

  const shareUrl = useMemo(() => {
    if (!link?.token) return ''
    return `${getPublicAppUrl()}/share/${link.token}`
  }, [link])

  const resourceLabel = useMemo(() => scopeLabel(resourceType), [resourceType])

  const loadLink = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('share_links')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (queryError) setError(queryError.message)
    const normalized = data ?? null
    setLink(normalized)
    if (normalized) {
      setLinkName(normalized.name || resourceName || `${resourceLabel} view`)
      setConfig(normalizeShareConfig(normalized.config))
      setNeverExpires(!normalized.expires_at)
      setExpiresAt(normalized.expires_at ? new Date(normalized.expires_at).toISOString().slice(0, 16) : '')
    } else {
      setLinkName(resourceName ? `${resourceName} • Manager View` : `${resourceLabel} • Manager View`)
      setConfig(normalizeShareConfig(DEFAULT_SHARE_CONFIG))
      setNeverExpires(true)
      setExpiresAt('')
    }
    setLoading(false)
  }, [resourceId, resourceType, resourceLabel, resourceName])

  useEffect(() => {
    void loadLink()
  }, [loadLink])

  const resolveWorkspaceId = useCallback(async () => {
    if (resourceType === 'workspace') return resourceId
    if (resourceType === 'program') {
      const { data } = await supabase.from('programs').select('workspace_id').eq('id', resourceId).maybeSingle()
      return data?.workspace_id ?? null
    }
    if (resourceType === 'project') {
      const { data } = await supabase.from('projects').select('workspace_id').eq('id', resourceId).maybeSingle()
      return data?.workspace_id ?? null
    }
    return null
  }, [resourceId, resourceType])

  const saveLink = async ({ forceEnable = false } = {}) => {
    if (!user?.id) {
      setError('Please sign in to manage share links.')
      return
    }

    setWorking(true)
    setError('')

    const workspaceId = await resolveWorkspaceId()
    if (!workspaceId) {
      setError('Unable to resolve workspace for this share link.')
      setWorking(false)
      return
    }

    const payload = {
      resource_type: resourceType,
      resource_id: resourceId,
      workspace_id: workspaceId,
      access_mode: 'view',
      name: linkName.trim() || (resourceName ? `${resourceName} • Manager View` : 'Manager View'),
      config: normalizeShareConfig(config),
      expires_at: neverExpires ? null : (expiresAt ? new Date(expiresAt).toISOString() : null),
      created_by: user.id,
      disabled: forceEnable ? false : (link?.disabled ?? false),
      revoked_at: forceEnable ? null : (link?.revoked_at ?? null),
    }

    let nextLink = null
    if (link?.id) {
      const { data, error: updateError } = await supabase
        .from('share_links')
        .update(payload)
        .eq('id', link.id)
        .select('*')
        .single()
      if (updateError) setError(updateError.message)
      else nextLink = data
    } else {
      const { data, error: insertError } = await supabase
        .from('share_links')
        .insert(payload)
        .select('*')
        .single()
      if (insertError) setError(insertError.message)
      else nextLink = data
    }

    if (nextLink) setLink(nextLink)
    setWorking(false)
  }

  const setDisabled = async (disabled) => {
    if (!link?.id) return
    setWorking(true)
    setError('')
    const { data, error: updateError } = await supabase
      .from('share_links')
      .update({
        disabled,
        revoked_at: disabled ? (link.revoked_at ?? null) : null,
      })
      .eq('id', link.id)
      .select('*')
      .single()

    if (updateError) setError(updateError.message)
    else setLink(data)
    setWorking(false)
  }

  const revokeLink = async () => {
    if (!link?.id) return
    setWorking(true)
    setError('')
    const { data, error: updateError } = await supabase
      .from('share_links')
      .update({
        disabled: true,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', link.id)
      .select('*')
      .single()

    if (updateError) setError(updateError.message)
    else setLink(data)
    setWorking(false)
  }

  const toggleModule = (key) => {
    setConfig((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [key]: !prev.modules[key],
      },
    }))
  }

  const toggleFilterValue = (group, key) => {
    setConfig((prev) => {
      const curr = new Set(prev.filters[group] ?? [])
      if (curr.has(key)) curr.delete(key)
      else curr.add(key)
      return {
        ...prev,
        filters: {
          ...prev.filters,
          [group]: [...curr],
        },
      }
    })
  }

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setError('Unable to copy link. Please copy it manually.')
    }
  }

  const status = shareStatus(link)
  const isActive = isShareLinkActive(link)

  if (typeof document === 'undefined') return null

  return createPortal((
    <>
      <div className="overlay-bg z-50" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[60]
                   md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2
                   md:w-[min(680px,calc(100vw-2rem))]"
      >
        <div
          className="rounded-t-3xl md:rounded-2xl p-5 anim-slide-up safe-bottom"
          style={{
            background: 'rgba(18,8,30,0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(var(--accent-rgb),0.28)',
            boxShadow: '0 -16px 64px rgba(var(--accent-rgb),0.16)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Share {resourceLabel} View
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Manager-style read-only dashboard link. No write or comment access.
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
              <X size={16} />
            </button>
          </div>

          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Link Name
                </p>
                <input
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder={`${resourceLabel} manager view`}
                  className="w-full px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                />
              </div>

              <div
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Modules
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SHARE_MODULE_OPTIONS.map((option) => (
                    <TogglePill
                      key={option.key}
                      active={Boolean(config.modules[option.key])}
                      onClick={() => toggleModule(option.key)}
                      label={option.label}
                    />
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Task Filters
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <TogglePill
                    active={Boolean(config.filters.includeCompleted)}
                    onClick={() => setConfig((prev) => ({
                      ...prev,
                      filters: { ...prev.filters, includeCompleted: !prev.filters.includeCompleted },
                    }))}
                    label="Include completed"
                  />
                </div>
                <div className="mb-2">
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TASK_STATUS_OPTIONS.map((statusOption) => (
                      <TogglePill
                        key={statusOption.key}
                        active={(config.filters.status ?? []).includes(statusOption.key)}
                        onClick={() => toggleFilterValue('status', statusOption.key)}
                        label={statusOption.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>Priority</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TASK_PRIORITY_OPTIONS.map((priorityOption) => (
                      <TogglePill
                        key={priorityOption.key}
                        active={(config.filters.priority ?? []).includes(priorityOption.key)}
                        onClick={() => toggleFilterValue('priority', priorityOption.key)}
                        label={priorityOption.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>Due from</p>
                    <input
                      type="date"
                      value={config.filters.dueFrom || ''}
                      onChange={(e) => setConfig((prev) => ({ ...prev, filters: { ...prev.filters, dueFrom: e.target.value } }))}
                      className="w-full px-2 py-1.5 rounded-lg text-xs"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>Due to</p>
                    <input
                      type="date"
                      value={config.filters.dueTo || ''}
                      onChange={(e) => setConfig((prev) => ({ ...prev, filters: { ...prev.filters, dueTo: e.target.value } }))}
                      className="w-full px-2 py-1.5 rounded-lg text-xs"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Link Lifetime
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <TogglePill active={neverExpires} onClick={() => setNeverExpires(true)} label="Never expires" />
                  <TogglePill active={!neverExpires} onClick={() => setNeverExpires(false)} label="Set expiry" />
                </div>
                {!neverExpires && (
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                  />
                )}
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Default is permanent. Access ends only when you disable or revoke from Shared Views.
                </p>
              </div>

              {link ? (
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                  >
                    <Link2 size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                      {shareUrl}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={isActive
                        ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                        : { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                    >
                      {status}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      View-only access
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyLink}
                      disabled={working || !isActive}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
                      style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}
                    >
                      <Copy size={12} />
                      {copied ? 'Copied' : 'Copy link'}
                    </button>
                    <button
                      onClick={() => setDisabled(!link.disabled)}
                      disabled={working}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
                      style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                    >
                      <Shield size={12} />
                      {link.disabled ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                  <button
                    onClick={revokeLink}
                    disabled={working}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Trash2 size={12} />
                    Revoke permanently
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                    No link created yet.
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    Create one to share a read-only manager dashboard.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => saveLink({ forceEnable: true })}
                  disabled={working}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {link ? <Check size={13} /> : <Link2 size={13} />}
                  {link ? 'Save configuration' : 'Create permanent link'}
                </button>
              </div>

              {error && (
                <p className="text-xs px-2" style={{ color: '#ef4444' }}>
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  ), document.body)
})

export default ShareModal
