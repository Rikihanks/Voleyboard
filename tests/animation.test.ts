import { describe, expect, it } from 'vitest'

import { clampFrameDuration, sampleAnimation, totalDuration } from '../src/domain/animation'
import type { Frame, Vec } from '../src/domain/types'

function frame(id: string, positions: Record<string, Vec>, durationMs: number): Frame {
  return { id, positions, strokes: [], durationMs }
}

const frames: Frame[] = [
  frame('f1', { a: { x: 0, y: 0 } }, 1000),
  frame('f2', { a: { x: 10, y: 0 } }, 1000),
  frame('f3', { a: { x: 10, y: 10 } }, 1000),
]

describe('totalDuration', () => {
  it('suma las duraciones', () => {
    expect(totalDuration(frames)).toBe(3000)
  })
})

describe('sampleAnimation', () => {
  it('en t=0 devuelve el primer fotograma', () => {
    const sample = sampleAnimation(frames, 0)
    expect(sample.positions.a).toEqual({ x: 0, y: 0 })
    expect(sample.frameIndex).toBe(0)
  })

  it('interpola linealmente a mitad del tramo', () => {
    const sample = sampleAnimation(frames, 500)
    expect(sample.positions.a?.x).toBeCloseTo(5, 6)
    expect(sample.positions.a?.y).toBeCloseTo(0, 6)
    expect(sample.alpha).toBeCloseTo(0.5, 6)
  })

  it('en el borde del tramo devuelve el siguiente fotograma', () => {
    const sample = sampleAnimation(frames, 1000)
    expect(sample.positions.a).toEqual({ x: 10, y: 0 })
    expect(sample.frameIndex).toBe(1)
  })

  it('sin loop se detiene en el ultimo fotograma', () => {
    const sample = sampleAnimation(frames, 9999)
    expect(sample.positions.a).toEqual({ x: 10, y: 10 })
    expect(sample.frameIndex).toBe(2)
  })

  it('con loop da la vuelta', () => {
    const sample = sampleAnimation(frames, 3500, { loop: true })
    expect(sample.positions.a?.x).toBeCloseTo(5, 6)
  })

  it('mantiene una pieza ausente en el siguiente fotograma', () => {
    const two: Frame[] = [
      frame('a', { a: { x: 0, y: 0 }, b: { x: 5, y: 5 } }, 1000),
      frame('b', { a: { x: 10, y: 0 } }, 1000),
    ]
    const sample = sampleAnimation(two, 500)
    expect(sample.positions.a?.x).toBeCloseTo(5, 6)
    expect(sample.positions.b).toEqual({ x: 5, y: 5 })
  })

  it('usa easing suavizado en los extremos', () => {
    const smooth = sampleAnimation(frames, 250, { easing: 'smooth' })
    const linear = sampleAnimation(frames, 250, { easing: 'linear' })
    expect(smooth.positions.a?.x).toBeLessThan(linear.positions.a?.x ?? 0)
  })
})

describe('clampFrameDuration', () => {
  it('acota entre 500 y 5000 ms', () => {
    expect(clampFrameDuration(100)).toBe(500)
    expect(clampFrameDuration(9000)).toBe(5000)
    expect(clampFrameDuration(1500)).toBe(1500)
  })
})
