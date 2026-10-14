/**
 * Interpolacion entre fotogramas. Modulo puro: sin React ni DOM.
 *
 * Cada fotograma guarda su posicion de cada pieza y `durationMs`, el tiempo
 * hasta el fotograma siguiente. La animacion muestrea posiciones en un tiempo.
 */
import { FRAME_DURATION, type Frame, type ID, type Vec } from './types'

export type Easing = 'linear' | 'smooth'

export function totalDuration(frames: Frame[]): number {
  return frames.reduce((sum, frame) => sum + Math.max(0, frame.durationMs), 0)
}

function applyEasing(t: number, easing: Easing): number {
  if (easing === 'smooth') return t * t * (3 - 2 * t)
  return t
}

export interface AnimationSample {
  positions: Record<ID, Vec>
  frameIndex: number
  nextFrameIndex: number
  /** Progreso 0..1 dentro del tramo actual. */
  alpha: number
}

/** Posiciones interpoladas en `timeMs`. Con loop, el tiempo da la vuelta. */
export function sampleAnimation(
  frames: Frame[],
  timeMs: number,
  options: { loop?: boolean; easing?: Easing } = {},
): AnimationSample {
  const easing = options.easing ?? 'linear'
  const count = frames.length
  if (count === 0) {
    return { positions: {}, frameIndex: 0, nextFrameIndex: 0, alpha: 0 }
  }

  const first = frames[0] as Frame
  const total = totalDuration(frames)
  if (total <= 0) {
    return { positions: { ...first.positions }, frameIndex: 0, nextFrameIndex: 0, alpha: 0 }
  }

  let t = Math.max(0, timeMs)
  t = options.loop ? t % total : Math.min(t, total)

  let acc = 0
  let index = 0
  while (index < count - 1 && t >= acc + (frames[index] as Frame).durationMs) {
    acc += (frames[index] as Frame).durationMs
    index += 1
  }

  const current = frames[index] as Frame
  const nextIndex = Math.min(index + 1, count - 1)
  const next = frames[nextIndex] as Frame
  const duration = Math.max(1, current.durationMs)
  const alpha = index >= count - 1 ? 0 : Math.min(1, Math.max(0, (t - acc) / duration))
  const eased = applyEasing(alpha, easing)

  const positions: Record<ID, Vec> = {}
  const ids = new Set<ID>([...Object.keys(current.positions), ...Object.keys(next.positions)])
  for (const id of ids) {
    const a = current.positions[id]
    const b = next.positions[id]
    if (a && b) {
      positions[id] = { x: a.x + (b.x - a.x) * eased, y: a.y + (b.y - a.y) * eased }
    } else if (a) {
      positions[id] = { ...a }
    } else if (b) {
      positions[id] = { ...b }
    }
  }

  return { positions, frameIndex: index, nextFrameIndex: nextIndex, alpha }
}

/** Duracion efectiva de un fotograma, acotada al rango permitido. */
export function clampFrameDuration(ms: number): number {
  return Math.min(FRAME_DURATION.max, Math.max(FRAME_DURATION.min, ms))
}
