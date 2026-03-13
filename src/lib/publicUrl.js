const FALLBACK_PUBLIC_APP_URL = 'https://taskflow-arpit.vercel.app'

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')

export const getPublicAppUrl = () => {
  const envUrl = trimTrailingSlash(import.meta.env.VITE_PUBLIC_APP_URL)
  if (envUrl) return envUrl

  if (typeof window === 'undefined') return FALLBACK_PUBLIC_APP_URL

  const { origin, hostname } = window.location
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    /taskflow-[a-z0-9-]+-arpitdasinfo-3313s-projects\.vercel\.app$/i.test(hostname)
  ) {
    return FALLBACK_PUBLIC_APP_URL
  }

  return trimTrailingSlash(origin) || FALLBACK_PUBLIC_APP_URL
}

export default getPublicAppUrl
