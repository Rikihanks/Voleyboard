/**
 * Geometria de la pista y conversion de coordenadas.
 *
 * Toda posicion se guarda en metros (types.ts). Aqui vive la unica
 * conversion metros <-> pixeles. Modulo puro: sin React, Konva ni DOM.
 */
import type { CourtView, Vec, Zone } from './types'

export interface Rect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Viewport de pantalla. `pan` se expresa en pixeles y se aplica antes de la
 * rotacion; el zoom multiplica la escala base.
 */
export interface Viewport {
  width: number
  height: number
  view: CourtView
  rotation: 0 | 90
  zoom: number
  pan: Vec
}

/** Medidas de la pista reglamentaria, en metros. */
export const COURT = {
  width: 9,
  length: 18,
  /** La red esta en y = 9. */
  netY: 9,
  /** Lineas de ataque a 3 m de la red: y = 6 e y = 12. */
  attackOffset: 3,
} as const

/** Rango visible en metros para cada vista. */
export const VIEW_RECTS: Record<CourtView, Rect> = {
  full: { minX: -2, minY: -2, maxX: 11, maxY: 20 },
  half: { minX: -2, minY: 8, maxX: 11, maxY: 20 },
  blank: { minX: -2, minY: -2, maxX: 11, maxY: 20 },
}

/** Rango permitido para las piezas, en metros. */
export const PIECE_RANGE: Rect = { minX: -3, minY: -3, maxX: 12, maxY: 21 }

/** Tamano base de las piezas, en metros (visual, no reglamentario). */
export const PIECE_SIZE = { player: 1.0, ball: 0.5 } as const

export const PIECE_SCALE_MIN = 0.5
export const PIECE_SCALE_MAX = 2
export const MIN_PIECE_PX = 24
export const ZOOM_MIN = 1
export const ZOOM_MAX = 4

/** Posiciones por defecto de cada zona, en metros (ajustables por el usuario). */
export const ZONE_DEFAULTS: Record<Zone, Vec> = {
  4: { x: 1.5, y: 10 },
  3: { x: 4.5, y: 10 },
  2: { x: 7.5, y: 10 },
  5: { x: 1.5, y: 15 },
  6: { x: 4.5, y: 15 },
  1: { x: 7.5, y: 15 },
}

/** Fila de banquillo visible fuera de la pista, por debajo del fondo propio. */
export function benchPosition(index: number): Vec {
  const columns = 8
  const row = Math.floor(index / columns)
  const column = index % columns
  return { x: 0.6 + column, y: 19.2 + row * 1.1 }
}

export function visibleRect(view: CourtView): Rect {
  return VIEW_RECTS[view]
}

function effectiveSize(viewport: Viewport): { w: number; h: number } {
  return viewport.rotation === 90
    ? { w: viewport.height, h: viewport.width }
    : { w: viewport.width, h: viewport.height }
}

/**
 * Escala en pixeles por metro: el minimo entre ancho y alto disponibles, de
 * modo que la pista quede centrada sin recortarse. El zoom multiplica el
 * resultado. Devuelve 0 si el viewport no tiene area util.
 */
export function scaleFor(rect: Rect, viewport: Viewport): number {
  const { w, h } = effectiveSize(viewport)
  const rectW = rect.maxX - rect.minX
  const rectH = rect.maxY - rect.minY
  if (rectW <= 0 || rectH <= 0 || w <= 0 || h <= 0) return 0
  const base = Math.min(w / rectW, h / rectH)
  return base * viewport.zoom
}

/** Escala en pixeles por metro para la vista del viewport. */
export function scaleForView(viewport: Viewport): number {
  return scaleFor(visibleRect(viewport.view), viewport)
}

function rectCenter(rect: Rect): Vec {
  return { x: (rect.minX + rect.maxX) / 2, y: (rect.minY + rect.maxY) / 2 }
}

/** Convierte metros de pista a pixeles de pantalla. */
export function toScreen(v: Vec, viewport: Viewport): Vec {
  const rect = visibleRect(viewport.view)
  const scale = scaleFor(rect, viewport)
  const center = rectCenter(rect)
  const rx = (v.x - center.x) * scale + viewport.pan.x
  const ry = (v.y - center.y) * scale + viewport.pan.y
  if (viewport.rotation === 90) {
    return { x: viewport.width / 2 - ry, y: viewport.height / 2 + rx }
  }
  return { x: viewport.width / 2 + rx, y: viewport.height / 2 + ry }
}

/** Convierte pixeles de pantalla a metros de pista (inversa exacta de toScreen). */
export function toCourt(p: Vec, viewport: Viewport): Vec {
  const rect = visibleRect(viewport.view)
  const scale = scaleFor(rect, viewport)
  const center = rectCenter(rect)
  if (scale <= 0) return { ...center }
  let rx: number
  let ry: number
  if (viewport.rotation === 90) {
    ry = viewport.width / 2 - p.x
    rx = p.y - viewport.height / 2
  } else {
    rx = p.x - viewport.width / 2
    ry = p.y - viewport.height / 2
  }
  return {
    x: (rx - viewport.pan.x) / scale + center.x,
    y: (ry - viewport.pan.y) / scale + center.y,
  }
}

/** Metros por pixel para el viewport (inverso de la escala). */
export function metersPerPixel(viewport: Viewport): number {
  const scale = scaleForView(viewport)
  return scale > 0 ? 1 / scale : Number.POSITIVE_INFINITY
}

/**
 * Desplazamiento (pan) que mantiene fijo en pantalla el punto de pista `v`
 * bajo el pixel `p` para el viewport dado (con su zoom ya aplicado).
 */
export function panToKeepPoint(v: Vec, p: Vec, viewport: Viewport): Vec {
  const rect = visibleRect(viewport.view)
  const center = rectCenter(rect)
  const scale = scaleFor(rect, viewport)
  if (viewport.rotation === 90) {
    return {
      x: p.y - viewport.height / 2 - (v.x - center.x) * scale,
      y: viewport.width / 2 - p.x - (v.y - center.y) * scale,
    }
  }
  return {
    x: p.x - viewport.width / 2 - (v.x - center.x) * scale,
    y: p.y - viewport.height / 2 - (v.y - center.y) * scale,
  }
}

/** Diametro de una pieza en metros, aplicando su escala. */
export function pieceDiameterMeters(kind: 'player' | 'ball', scale: number): number {
  return PIECE_SIZE[kind] * scale
}

/** Diametro de una pieza en pixeles, con un minimo de MIN_PIECE_PX. */
export function pieceDiameterPixels(
  kind: 'player' | 'ball',
  scale: number,
  viewport: Viewport,
): number {
  const px = pieceDiameterMeters(kind, scale) * scaleForView(viewport)
  return Math.max(px, MIN_PIECE_PX)
}

export function isInsidePieceRange(v: Vec): boolean {
  return (
    v.x >= PIECE_RANGE.minX &&
    v.x <= PIECE_RANGE.maxX &&
    v.y >= PIECE_RANGE.minY &&
    v.y <= PIECE_RANGE.maxY
  )
}

/** Ajusta una posicion al rango permitido para las piezas. */
export function clampToPieceRange(v: Vec): Vec {
  return {
    x: Math.min(Math.max(v.x, PIECE_RANGE.minX), PIECE_RANGE.maxX),
    y: Math.min(Math.max(v.y, PIECE_RANGE.minY), PIECE_RANGE.maxY),
  }
}

export function rectContains(rect: Rect, v: Vec): boolean {
  return v.x >= rect.minX && v.x <= rect.maxX && v.y >= rect.minY && v.y <= rect.maxY
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX)
}

export function clampPieceScale(scale: number): number {
  return Math.min(Math.max(scale, PIECE_SCALE_MIN), PIECE_SCALE_MAX)
}

/** Distancia de un punto a un segmento, en la misma unidad que los puntos. */
export function distancePointToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return distance(p, a)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq
  t = Math.min(1, Math.max(0, t))
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/** Distancia minima de un punto a una polilinea. Infinity si tiene menos de 2 puntos. */
export function distancePointToPolyline(p: Vec, points: Vec[]): number {
  if (points.length === 0) return Number.POSITIVE_INFINITY
  if (points.length === 1) {
    const only = points[0] as Vec
    return distance(p, only)
  }
  let min = Number.POSITIVE_INFINITY
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i] as Vec
    const b = points[i + 1] as Vec
    min = Math.min(min, distancePointToSegment(p, a, b))
  }
  return min
}

/** Muestrea una curva de Bezier cuadratica (p0, p1 = control, p2). */
export function quadraticBezier(p0: Vec, p1: Vec, p2: Vec, steps = 24): Vec[] {
  const points: Vec[] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const mt = 1 - t
    points.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    })
  }
  return points
}

/** Polilinea efectiva de un trazo segun su forma (recta o curva). */
export function strokePolyline(points: Vec[], shape: 'straight' | 'curve'): Vec[] {
  if (shape === 'curve' && points.length >= 3) {
    const [p0, p1, p2] = points as [Vec, Vec, Vec]
    return quadraticBezier(p0, p1, p2)
  }
  return points
}

/** Punto de control de una curva (segundo punto) o null si no aplica. */
export function curveControlPoint(points: Vec[]): Vec | null {
  return points.length >= 3 ? (points[1] as Vec) : null
}
