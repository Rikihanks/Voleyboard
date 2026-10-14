import { useEffect } from 'react'

interface WakeLockSentinelLike {
  released: boolean
  release: () => Promise<void>
}

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
}

/**
 * Mantiene la pantalla encendida mientras la pizarra este en uso.
 * Degrada sin romper si la API no existe (RF-6.2).
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const nav = navigator as Navigator & WakeLockNavigator
    if (!nav.wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const request = async () => {
      try {
        const next = await nav.wakeLock?.request('screen')
        if (!next) return
        if (cancelled) {
          void next.release()
          return
        }
        sentinel = next
      } catch {
        // La API puede rechazar la solicitud; no es un error fatal.
      }
    }

    void request()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinel && !sentinel.released) void sentinel.release()
    }
  }, [enabled])
}
