import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, Link2, RefreshCw, Shield, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/useAuthStore'
import useWorkspaceStore from '../../store/useWorkspaceStore'
import ShareModal from '../ShareModal'
import { isShareLinkActive, scopeLabel, shareStatus } from '../../lib/share'

const statusPillStyle = (status) => {
  if (status === 'active') return { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
  if (status === 'disabled') return { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
  if (status === 'expired') return { background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }
  return { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
}

const SharedViewsPanel = memo(function SharedViewsPanel() {
  const user = useAuthStore((s) => s.user)
  const workspaceId = useWorkspaceStore((s) => s.workspaceId)
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')
  const [showWorkspaceShare, setShowWorkspaceShare] = useState(false)
  const userId = user?.id

  const loadLinks = useCallback(async () => {
    if (!userId) {
      setLinks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('share_links')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    if (queryError) setError(queryError.message)
    setLinks(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  const copyUrl = async (link) => {
    const url = `${window.location.origin}/share/${link.token}`
    await navigator.clipboard.writeText(url)
  }

  const toggleDisabled = async (link) => {
    setWorkingId(link.id)
    setError('')
    const { data, error: updateError } = await supabase
      .from('share_links')
      .update({
        disabled: !link.disabled,
        revoked_at: link.disabled ? null : link.revoked_at,
      })
      .eq('id', link.id)
      .select('*')
      .single()
    if (updateError) setError(updateError.message)
    else setLinks((prev) => prev.map((item) => (item.id === link.id ? data : item)))
    setWorkingId('')
  }

  const revoke = async (link) => {
    setWorkingId(link.id)
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
    else setLinks((prev) => prev.map((item) => (item.id === link.id ? data : item)))
    setWorkingId('')
  }

  const activeCount = useMemo(
    () => links.filter((link) => isShareLinkActive(link)).length,
    [links]
  )

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-3 flex items-center justify-between gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Shared view links
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {activeCount} active view links. Links stay valid until you disable or revoke them.
          </p>
        </div>
        <button
          onClick={() => setShowWorkspaceShare(true)}
          disabled={!workspaceId}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50"
          style={{ background: 'rgba(var(--accent-rgb),0.16)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.32)' }}
        >
          <span className="inline-flex items-center gap-1">
            <Link2 size={12} />
            Workspace Link
          </span>
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center">
          <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : links.length === 0 ? (
        <div
          className="rounded-xl p-4 text-xs"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
        >
          No shared links yet. Create your first shared view from a program/project share button or by using "Workspace Link".
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const status = shareStatus(link)
            const scope = scopeLabel(link.resource_type)
            const isBusy = workingId === link.id
            return (
              <div
                key={link.id}
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {link.name || `${scope} View`}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {scope} • {link.resource_id}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={statusPillStyle(status)}>
                    {status}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => copyUrl(link)}
                    disabled={isBusy || !isShareLinkActive(link)}
                    className="px-2.5 py-1 rounded-lg text-[11px] disabled:opacity-50"
                    style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Copy size={10} /> Copy
                    </span>
                  </button>
                  <a
                    href={`${window.location.origin}/share/${link.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg text-[11px]"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <ExternalLink size={10} /> Open
                    </span>
                  </a>
                  <button
                    onClick={() => toggleDisabled(link)}
                    disabled={isBusy || Boolean(link.revoked_at)}
                    className="px-2.5 py-1 rounded-lg text-[11px] disabled:opacity-50"
                    style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Shield size={10} />
                      {link.disabled ? 'Enable' : 'Disable'}
                    </span>
                  </button>
                  <button
                    onClick={() => revoke(link)}
                    disabled={isBusy || Boolean(link.revoked_at)}
                    className="px-2.5 py-1 rounded-lg text-[11px] disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Trash2 size={10} /> Revoke
                    </span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}

      {showWorkspaceShare && workspaceId && (
        <ShareModal
          resourceType="workspace"
          resourceId={workspaceId}
          resourceName="Workspace"
          onClose={() => {
            setShowWorkspaceShare(false)
            void loadLinks()
          }}
        />
      )}
    </div>
  )
})

export default SharedViewsPanel
