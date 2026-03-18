import { useCallback, useEffect, useRef, useState } from 'react'

const getFullscreenElement = () => {
  if (typeof document === 'undefined') return null
  return document.fullscreenElement || null
}

export default function useElementFullscreen() {
  const targetRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const syncState = () => {
      const activeElement = getFullscreenElement()
      setIsFullscreen(Boolean(activeElement && targetRef.current && activeElement === targetRef.current))
    }

    document.addEventListener('fullscreenchange', syncState)
    syncState()

    return () => {
      document.removeEventListener('fullscreenchange', syncState)
    }
  }, [])

  const enterFullscreen = useCallback(async () => {
    if (!targetRef.current?.requestFullscreen) return false
    await targetRef.current.requestFullscreen()
    return true
  }, [])

  const exitFullscreen = useCallback(async () => {
    if (!getFullscreenElement() || !document.exitFullscreen) return false
    await document.exitFullscreen()
    return true
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) return exitFullscreen()
    return enterFullscreen()
  }, [enterFullscreen, exitFullscreen, isFullscreen])

  return {
    targetRef,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  }
}
