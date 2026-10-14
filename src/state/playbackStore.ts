import { create } from 'zustand'

interface PlaybackStore {
  playing: boolean
  /** Tiempo de reproduccion en ms. */
  time: number
  play: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  setTime: (time: number) => void
  stop: () => void
}

/** Estado de reproduccion de la animacion (no se persiste). */
export const usePlaybackStore = create<PlaybackStore>()((set) => ({
  playing: false,
  time: 0,
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set((s) => ({ playing: !s.playing })),
  reset: () => set({ time: 0, playing: false }),
  setTime: (time) => set({ time }),
  stop: () => set({ playing: false, time: 0 }),
}))
