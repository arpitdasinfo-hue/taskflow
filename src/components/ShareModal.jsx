import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Link2, RefreshCw, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ShareModal = memo(function ShareModal({ resourceType, resourceId, resourceName, onClose }) {
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [link, setLink] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (!link?.token) return ''
    return `${window.location.origin}/share/${link.token}`
  }, [link])

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
    setLink(data ?? null)
    setLoading(false)
  }, [resourceId, resourceType])

  useEffect(() => {
    void loadLink()
  }, [loadLink])

  const generateLink = async () => {
    setWorking(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('share_links')
      .insert({ resource_type: resourceType, resource_id: resourceId })
      .select('*')
      .single()

    if (insertError) setError(insertError.message)
    else setLink(data)
    setWorking(false)
  }

  const revokeLink = async () => {
    if (!link?.id) return
    setWorking(true)
    setError('')
    const { error: deleteError } = await supabase
      .from('share_links')
      .delete()
      .eq('id', link.id)

    if (deleteError) setError(deleteError.message)
    else setLink(null)
    setWorking(false)
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

  return (
    <>
      <div className="overlay-bg z-50" onClick={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:w-[520px] z-[60]
                   rounded-t-3xl md:rounded-2xl p-5 anim-slide-up safe-bottom"
        style={{
          background: 'rgba(18,8,30,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(var(--accent-rgb),0.28)',
          boxShadow: '0 -16px 64px rgba(var(--accent-rgb),0.16)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Share "{resourceName || resourceType}"
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Anyone with the link can view this in read-only mode.
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
          <div className="space-y-3">
            {link ? (
              <>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <Link2 size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                    {shareUrl}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    disabled={working}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
                    style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}
                  >
                    <Copy size={12} />
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <button
                    onClick={revokeLink}
                    disabled={working}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Trash2 size={12} />
                    Revoke
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={generateLink}
                disabled={working}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <Link2 size={13} />
                Generate share link
              </button>
            )}

            {error && (
              <p className="text-xs px-2" style={{ color: '#ef4444' }}>
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
})

export default ShareModal
