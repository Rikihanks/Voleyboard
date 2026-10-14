import { describe, expect, it } from 'vitest'

import {
  COURT,
  PIECE_RANGE,
  clampPieceScale,
  clampToPieceRange,
  clampZoom,
  distance,
  isInsidePieceRange,
  metersPerPixel,
  panToKeepPoint,
  pieceDiameterPixels,
  quadraticBezier,
  strokePolyline,
  rectContains,
  scaleForView,
  toCourt,
  toScreen,
  visibleRect,
  type Viewport,
} from '../src/domain/court'
import type { CourtView, Vec } from '../src/domain/types'

const views: CourtView[] = ['full', 'half', 'blank']
const rotations: Array<0 | 90> = [0, 90]
const zooms = [1, 1.5, 2, 4]
const sizes: Array<[number, number]> = [
  [1280, 720],
  [390, 844],
  [768, 1024],
  [1024, 768],
]

function makeViewport(
  view: CourtView,
  rotation: 0 | 90,
  zoom: number,
  w: number,
  h: number,
  pan: Vec = { x: 0, y: 0 },
): Viewport {
  return { width: w, height: h, view, rotation, zoom, pan }
}

describe('visibleRect', () => {
  it('expone los rangos de la especificacion', () => {
    expect(visibleRect('full')).toEqual({ minX: -2, minY: -2, maxX: 11, maxY: 20 })
    expect(visibleRect('half')).toEqual({ minX: -2, minY: 8, maxX: 11, maxY: 20 })
    expect(visibleRect('blank')).toEqual(visibleRect('full'))
  })
})

describe('toScreen / toCourt', () => {
  const points: Vec[] = [
    { x: 0, y: 0 },
    { x: 4.5, y: 9 },
    { x: 9, y: 18 },
    { x: -3, y: -3 },
    { x: 12, y: 21 },
    { x: 1.234, y: 14.567 },
  ]

  it('ida y vuelta devuelve el punto original con error < 0.001 m', () => {
    for (const view of views) {
      for (const rotation of rotations) {
        for (const zoom of zooms) {
          for (const [w, h] of sizes) {
            const viewport = makeViewport(view, rotation, zoom, w, h, { x: 17, y: -9 })
            for (const p of points) {
              const roundtrip = toCourt(toScreen(p, viewport), viewport)
              expect(Math.abs(roundtrip.x - p.x)).toBeLessThan(0.001)
              expect(Math.abs(roundtrip.y - p.y)).toBeLessThan(0.001)
            }
          }
        }
      }
    }
  })

  it('centra la vista en el centro del viewport sin pan', () => {
    const viewport = makeViewport('full', 0, 1, 1000, 600)
    const center = {
      x: (visibleRect('full').minX + visibleRect('full').maxX) / 2,
      y: (visibleRect('full').minY + visibleRect('full').maxY) / 2,
    }
    const screen = toScreen(center, viewport)
    expect(screen.x).toBeCloseTo(500, 6)
    expect(screen.y).toBeCloseTo(300, 6)
  })

  it('aplica el zoom a la escala', () => {
    const base = makeViewport('full', 0, 1, 1000, 600)
    const zoomed = makeViewport('full', 0, 2, 1000, 600)
    expect(scaleForView(zoomed)).toBeCloseTo(scaleForView(base) * 2, 6)
    expect(metersPerPixel(zoomed)).toBeCloseTo(metersPerPixel(base) / 2, 6)
  })

  it('en rotations de 90 grados intercambia el ajuste de ancho y alto', () => {
    const viewport = makeViewport('half', 90, 1, 1024, 768)
    const rect = visibleRect('half')
    const rectW = rect.maxX - rect.minX
    const rectH = rect.maxY - rect.minY
    const expected = Math.min(768 / rectW, 1024 / rectH)
    expect(scaleForView(viewport)).toBeCloseTo(expected, 6)
  })

  it('la red esta en y = 9', () => {
    expect(COURT.netY).toBe(9)
  })

  it('panToKeepPoint mantiene el punto bajo el cursor', () => {
    for (const view of views) {
      for (const rotation of rotations) {
        const vp = makeViewport(view, rotation, 2, 900, 700)
        const courtPoint: Vec = { x: 3.2, y: 11.4 }
        const cursor: Vec = { x: 250, y: 180 }
        const pan = panToKeepPoint(courtPoint, cursor, vp)
        const screen = toScreen(courtPoint, { ...vp, pan })
        expect(screen.x).toBeCloseTo(cursor.x, 6)
        expect(screen.y).toBeCloseTo(cursor.y, 6)
      }
    }
  })
})

describe('piezas', () => {
  it('el diametro en pixeles respeta el minimo de 24 px', () => {
    const tiny = makeViewport('full', 0, 1, 100, 100)
    expect(pieceDiameterPixels('ball', 1, tiny)).toBeGreaterThanOrEqual(24)
  })

  it('aplica la escala al diametro en metros dentro del viewport', () => {
    const viewport = makeViewport('full', 0, 1, 1000, 1000)
    const scale = scaleForView(viewport)
    expect(pieceDiameterPixels('player', 1, viewport)).toBeCloseTo(1.0 * scale, 6)
    expect(pieceDiameterPixels('ball', 2, viewport)).toBeCloseTo(0.5 * 2 * scale, 6)
  })
})

describe('curvas', () => {
  it('quadraticBezier pasa por los extremos y el punto medio ponderado', () => {
    const p0 = { x: 0, y: 0 }
    const p1 = { x: 5, y: 10 }
    const p2 = { x: 10, y: 0 }
    const curve = quadraticBezier(p0, p1, p2, 8)
    expect(curve[0]).toEqual(p0)
    expect(curve[curve.length - 1]).toEqual(p2)
    const mid = curve[4] as { x: number; y: number }
    expect(mid.x).toBeCloseTo(0.25 * p0.x + 0.5 * p1.x + 0.25 * p2.x, 6)
    expect(mid.y).toBeCloseTo(0.25 * p0.y + 0.5 * p1.y + 0.25 * p2.y, 6)
  })

  it('strokePolyline muestrea solo las curvas', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ]
    expect(strokePolyline(points, 'straight')).toHaveLength(3)
    expect(strokePolyline(points, 'curve').length).toBeGreaterThan(3)
  })
})

describe('rango de piezas', () => {
  it('isInsidePieceRange comprueba x de -3 a 12 e y de -3 a 21', () => {
    expect(isInsidePieceRange({ x: -3, y: -3 })).toBe(true)
    expect(isInsidePieceRange({ x: 12, y: 21 })).toBe(true)
    expect(isInsidePieceRange({ x: 12.01, y: 0 })).toBe(false)
    expect(isInsidePieceRange({ x: 0, y: 21.01 })).toBe(false)
  })

  it('clampToPieceRange limita a los bordes', () => {
    expect(clampToPieceRange({ x: 100, y: -100 })).toEqual({
      x: PIECE_RANGE.maxX,
      y: PIECE_RANGE.minY,
    })
  })

  it('rectContains y distance funcionan', () => {
    expect(rectContains(visibleRect('full'), { x: 0, y: 0 })).toBe(true)
    expect(rectContains(visibleRect('full'), { x: 100, y: 0 })).toBe(false)
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})

describe('clamps', () => {
  it('limita zoom de 1 a 4 y escala de piezas de 0.5 a 2', () => {
    expect(clampZoom(0.1)).toBe(1)
    expect(clampZoom(10)).toBe(4)
    expect(clampZoom(2.5)).toBe(2.5)
    expect(clampPieceScale(0.1)).toBe(0.5)
    expect(clampPieceScale(9)).toBe(2)
  })
})
