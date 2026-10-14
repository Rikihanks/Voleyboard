import { useEffect } from 'react'

import { totalDuration } from '@/domain/animation'
import { useBoardStore } from '@/state/boardStore'
import { usePlaybackStore } from '@/state/playbackStore'

/** Avanza el tiempo de reproduccion con requestAnimationFrame. */
export function usePlaybackLoop(): void {
  const playing = usePlaybackStore((s) => s.playing)

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      const delta = now - last
      last = now
      const playback = usePlaybackStore.getState()
      const { frames, settings } = useBoardStore.getState().board
      const total = totalDuration(frames)
      if (total <= 0) {
        playback.pause()
        return
      }
      let next = playback.time + delta * settings.speed
      if (next >= total) {
        if (settings.loop) {
          next %= total
        } else {
          playback.setTime(total)
          playback.pause()
          return
        }
      }
      playback.setTime(next)
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing])
}
