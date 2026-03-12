import { useState } from 'react'
import { Zap, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import useAuthStore from '../store/useAuthStore'

export default function Auth() {
  const [mode,    setMode]    = useState('signin') // signin | signup
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const signInWithEmail = useAuthStore((s) => s.signInWithEmail)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await signInWithEmail(email.trim().toLowerCase(), mode)
    setLoading(false)
    if (error) {
      const raw = error.message || ''
      const notRegistered =
        raw.toLowerCase().includes('signups not allowed for otp') ||
        raw.toLowerCase().includes('user not found')
      if (mode === 'signin' && notRegistered) {
        setError('No account found for this email. Use Sign up to create one.')
      } else {
        setError(raw)
      }
      return
    }

    setSent(true)
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-4"
      style={{ background: 'var(--bg-gradient)' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 24px rgba(var(--accent-rgb),0.5)' }}
          >
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            TaskFlow
          </span>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6">
          {sent ? (
            /* ── Success state ── */
            <div className="text-center py-2">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(16,185,129,0.15)' }}
              >
                <CheckCircle2 size={22} style={{ color: '#10b981' }} />
              </div>
              <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Check your email
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                We sent a {mode === 'signup' ? 'sign-up' : 'sign-in'} link to{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                {' '}Open it to continue — no password needed.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); setError('') }}
                className="mt-5 text-xs underline transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* ── Sign-in form ── */
            <>
              <div className="mb-4 flex items-center gap-1 rounded-xl p-1"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError('') }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={mode === 'signin'
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-secondary)' }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError('') }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={mode === 'signup'
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-secondary)' }}
                >
                  Sign up
                </button>
              </div>

              <p className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {mode === 'signup' ? 'Create your TaskFlow account' : 'Sign in to TaskFlow'}
              </p>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                {mode === 'signup'
                  ? "New here? Enter your email and we'll send a sign-up link."
                  : "Already have an account? Enter your email and we'll send a sign-in link."}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {/* Email input */}
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <Mail size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {loading
                    ? 'Sending…'
                    : <><span>{mode === 'signup' ? 'Send sign-up link' : 'Send sign-in link'}</span><ArrowRight size={14} /></>}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
          Organize your work, beautifully.
        </p>
      </div>
    </div>
  )
}
