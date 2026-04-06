import { useEffect, useRef, useCallback } from 'react'

interface UseAutoRefreshOptions {
  interval?: number
  enabled?: boolean
  onRefresh: () => void | Promise<void>
  pauseOnHover?: boolean
  pauseOnFocus?: boolean
}

export function useAutoRefresh({
  interval = 30000,
  enabled = true,
  onRefresh,
  pauseOnHover = false,
  pauseOnFocus = false
}: UseAutoRefreshOptions) {
  const intervalRef = useRef<number | null>(null)
  const isPausedRef = useRef(false)
  const lastRefreshRef = useRef<number>(0)

  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (enabled && !isPausedRef.current) {
      intervalRef.current = setInterval(async () => {
        if (!isPausedRef.current) {
          try {
            await onRefresh()
            lastRefreshRef.current = Date.now()
          } catch (error) {
            console.error('Ошибка автообновления:', error)
          }
        }
      }, interval)
    }
  }, [enabled, interval, onRefresh])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const pause = useCallback(() => {
    isPausedRef.current = true
    stopInterval()
  }, [stopInterval])

  const resume = useCallback(() => {
    isPausedRef.current = false
    startInterval()
  }, [startInterval])

  const refresh = useCallback(async () => {
    try {
      await onRefresh()
      lastRefreshRef.current = Date.now()
    } catch (error) {
      console.error('Ошибка ручного обновления:', error)
    }
  }, [onRefresh])


  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) {
      pause()
    }
  }, [pauseOnHover, pause])

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) {
      resume()
    }
  }, [pauseOnHover, resume])


  const handleFocus = useCallback(() => {
    if (pauseOnFocus) {
      pause()
    }
  }, [pauseOnFocus, pause])

  const handleBlur = useCallback(() => {
    if (pauseOnFocus) {
      resume()
    }
  }, [pauseOnFocus, resume])

  useEffect(() => {
    startInterval()
    return () => stopInterval()
  }, [startInterval, stopInterval])

  return {
    pause,
    resume,
    refresh,
    isPaused: isPausedRef.current,
    lastRefresh: lastRefreshRef.current,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur
    }
  }
}
