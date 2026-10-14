/**
 * Rotaciones, recepcion y validacion de solapamientos. Modulo puro.
 *
 * Zonas como en el reglamento, mirando la red desde el fondo propio:
 * delanteras 4 (izquierda), 3 (centro) y 2 (derecha); traseras 5, 6 y 1 en el
 * mismo orden. El equipo rota en sentido horario: el de la zona 2 pasa a la 1
 * y saca, el de la 1 a la 6, el de la 6 a la 5, el de la 5 a la 4, el de la 4
 * a la 3 y el de la 3 a la 2.
 */
import { ZONE_DEFAULTS } from './court'
import type { PositionRole, Vec, Zone } from './types'

export type RotationSystem = '5-1' | '4-2' | '6-2' | '6-3' | '6-6'
export type RotationNumber = 1 | 2 | 3 | 4 | 5 | 6
export type RotationPhase = 'serve' | 'receive'
export type ReceiverCount = 3 | 4 | 5

export interface RotationSlot {
  zone: Zone
  role: PositionRole
  pos: Vec
}

export interface RotationTemplate {
  id: string
  system: RotationSystem
  rotation: RotationNumber
  phase: RotationPhase
  slots: RotationSlot[]
}

export const SYSTEMS: RotationSystem[] = ['5-1', '4-2', '6-2', '6-3', '6-6']
export const ZONES: Zone[] = [1, 2, 3, 4, 5, 6]

/** Alineacion inicial (rotacion 1) por zonas 1 a 6. Ejemplos editables por el usuario. */
export const BASE_ALIGNMENT: Record<RotationSystem, PositionRole[]> = {
  '5-1': ['S', 'OH', 'MB', 'OPP', 'OH', 'MB'],
  '4-2': ['S', 'OH', 'OH', 'S', 'OH', 'OH'],
  '6-2': ['S', 'OH', 'MB', 'S', 'OH', 'MB'],
  '6-3': ['S', 'OH', 'S', 'MB', 'S', 'OPP'],
  '6-6': ['S', 'S', 'S', 'S', 'S', 'S'],
}

/** Zona a la que pasa un jugador que estaba en `zone` tras una rotacion. */
export function nextZone(zone: Zone): Zone {
  if (zone === 1) return 6
  return (((zone - 2 + 6) % 6) + 1) as Zone
}

export function rotateZone(zone: Zone, times: number): Zone {
  let current = zone
  for (let i = 0; i < times; i += 1) current = nextZone(current)
  return current
}

function posFor(zone: Zone): Vec {
  return { ...ZONE_DEFAULTS[zone] }
}

/** Genera la alineacion de un sistema en la rotacion y fase indicadas. */
export function generateRotation(
  system: RotationSystem,
  rotation: RotationNumber,
  phase: RotationPhase = 'serve',
): RotationTemplate {
  const base = BASE_ALIGNMENT[system]
  const slots: RotationSlot[] = []
  for (let index = 0; index < 6; index += 1) {
    const originZone = (index + 1) as Zone
    const role = base[index] as PositionRole
    const zone = rotateZone(originZone, rotation - 1)
    slots.push({ zone, role, pos: posFor(zone) })
  }
  slots.sort((a, b) => a.zone - b.zone)
  return { id: `${system}-${rotation}-${phase}`, system, rotation, phase, slots }
}

export function generateAllRotations(): RotationTemplate[] {
  const rotations: RotationNumber[] = [1, 2, 3, 4, 5, 6]
  return SYSTEMS.flatMap((system) =>
    rotations.map((rotation) => generateRotation(system, rotation)),
  )
}

/** Posiciones de recepcion que propone la app (revisables por un entrenador). */
const RECEIVE_LAYOUTS: Record<ReceiverCount, Vec[]> = {
  5: [
    { x: 1.5, y: 13 },
    { x: 3.2, y: 15.6 },
    { x: 6.2, y: 15.6 },
    { x: 7.8, y: 13 },
    { x: 4.6, y: 11.6 },
  ],
  4: [
    { x: 1.6, y: 14.2 },
    { x: 4.4, y: 15.6 },
    { x: 7.4, y: 14.2 },
    { x: 4.6, y: 11.6 },
  ],
  3: [
    { x: 1.8, y: 14.6 },
    { x: 4.6, y: 15.6 },
    { x: 7.4, y: 14.6 },
  ],
}

const SETTER_RECEIVE: Vec = { x: 4.6, y: 10.2 }

/** Formacion de recepcion con 5, 4 o 3 receptores (mas el colocador). */
export function generateReceiveFormation(
  receivers: ReceiverCount,
  rotation: RotationNumber = 1,
): RotationTemplate {
  const layout = RECEIVE_LAYOUTS[receivers]
  const slots: RotationSlot[] = layout.map((pos) => ({ zone: 6, role: 'OH', pos: { ...pos } }))
  slots.unshift({ zone: 2, role: 'S', pos: { ...SETTER_RECEIVE } })
  return {
    id: `receive-${receivers}-${rotation}`,
    system: '5-1',
    rotation,
    phase: 'receive',
    slots,
  }
}

export type ViolationRule = 'front' | 'back' | 'depth'

export interface Violation {
  rule: ViolationRule
  zones: [Zone, Zone]
}

const EPS = 0.05

/**
 * Regla simplificada de posiciones legales en el saque, con x hacia la derecha
 * e y hacia el fondo (red en y = 9). Una diferencia menor de 0,05 m cuenta como
 * solapamiento.
 */
export function validateServeOverlap(zones: Record<Zone, Vec>): Violation[] {
  const violations: Violation[] = []

  // Fila delantera: x4 < x3 < x2.
  if (zones[4].x > zones[3].x - EPS) violations.push({ rule: 'front', zones: [4, 3] })
  if (zones[3].x > zones[2].x - EPS) violations.push({ rule: 'front', zones: [3, 2] })

  // Fila trasera: x5 < x6 < x1.
  if (zones[5].x > zones[6].x - EPS) violations.push({ rule: 'back', zones: [5, 6] })
  if (zones[6].x > zones[1].x - EPS) violations.push({ rule: 'back', zones: [6, 1] })

  // Profundidad: cada trasero mas lejos de la red que su delantero.
  if (zones[5].y < zones[4].y + EPS) violations.push({ rule: 'depth', zones: [5, 4] })
  if (zones[6].y < zones[3].y + EPS) violations.push({ rule: 'depth', zones: [6, 3] })
  if (zones[1].y < zones[2].y + EPS) violations.push({ rule: 'depth', zones: [1, 2] })

  return violations
}
