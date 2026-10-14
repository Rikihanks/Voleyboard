import { describe, expect, it } from 'vitest'

import { ZONE_DEFAULTS } from '../src/domain/court'
import {
  BASE_ALIGNMENT,
  generateAllRotations,
  generateReceiveFormation,
  generateRotation,
  nextZone,
  rotateZone,
  validateServeOverlap,
  ZONES,
  SYSTEMS,
  type RotationNumber,
} from '../src/domain/rotations'
import type { Vec, Zone } from '../src/domain/types'

function zonesFromDefaults(overrides: Partial<Record<Zone, Vec>> = {}): Record<Zone, Vec> {
  return {
    1: { ...(overrides[1] ?? ZONE_DEFAULTS[1]) },
    2: { ...(overrides[2] ?? ZONE_DEFAULTS[2]) },
    3: { ...(overrides[3] ?? ZONE_DEFAULTS[3]) },
    4: { ...(overrides[4] ?? ZONE_DEFAULTS[4]) },
    5: { ...(overrides[5] ?? ZONE_DEFAULTS[5]) },
    6: { ...(overrides[6] ?? ZONE_DEFAULTS[6]) },
  }
}

describe('generateRotation', () => {
  it('las 6 rotaciones de cada sistema ocupan las 6 zonas sin repetir', () => {
    const rotations: RotationNumber[] = [1, 2, 3, 4, 5, 6]
    for (const system of SYSTEMS) {
      for (const rotation of rotations) {
        const template = generateRotation(system, rotation)
        const zones = template.slots.map((slot) => slot.zone)
        expect(new Set(zones).size).toBe(6)
        expect([...zones].sort()).toEqual(ZONES)
        expect(template.slots).toHaveLength(6)
      }
    }
  })

  it('tras 6 rotaciones se vuelve a la alineacion inicial', () => {
    for (const system of SYSTEMS) {
      const initial = generateRotation(system, 1)
      const rotated = initial.slots.map((slot) => ({
        role: slot.role,
        zone: rotateZone(slot.zone, 6),
      }))
      const back = [...rotated].sort((a, b) => a.zone - b.zone)
      expect(back.map((slot) => slot.role)).toEqual([...BASE_ALIGNMENT[system]])
      expect(back.map((slot) => slot.zone)).toEqual(ZONES)
    }
  })

  it('la rotacion 1 coincide con la alineacion inicial', () => {
    for (const system of SYSTEMS) {
      const template = generateRotation(system, 1)
      const byZone = [...template.slots].sort((a, b) => a.zone - b.zone).map((slot) => slot.role)
      expect(byZone).toEqual([...BASE_ALIGNMENT[system]])
    }
  })

  it('nextZone sigue el sentido horario del reglamento', () => {
    expect(nextZone(2)).toBe(1)
    expect(nextZone(1)).toBe(6)
    expect(nextZone(6)).toBe(5)
    expect(nextZone(5)).toBe(4)
    expect(nextZone(4)).toBe(3)
    expect(nextZone(3)).toBe(2)
  })

  it('genera 30 alineaciones (5 sistemas x 6 rotaciones)', () => {
    expect(generateAllRotations()).toHaveLength(30)
  })
})

describe('generateReceiveFormation', () => {
  it('crea 5, 4 o 3 receptores mas el colocador', () => {
    expect(generateReceiveFormation(5).slots).toHaveLength(6)
    expect(generateReceiveFormation(4).slots).toHaveLength(5)
    expect(generateReceiveFormation(3).slots).toHaveLength(4)
  })
})

describe('validateServeOverlap', () => {
  it('acepta la alineacion por defecto', () => {
    expect(validateServeOverlap(zonesFromDefaults())).toEqual([])
  })

  it('detecta un delantero de la zona 4 a la derecha del de la 3', () => {
    const violations = validateServeOverlap(zonesFromDefaults({ 4: { x: 6, y: 10 } }))
    expect(violations).toContainEqual({ rule: 'front', zones: [4, 3] })
  })

  it('detecta un trasero de la zona 6 por delante del de la 3', () => {
    const violations = validateServeOverlap(zonesFromDefaults({ 6: { x: 4.5, y: 10 } }))
    expect(violations).toContainEqual({ rule: 'depth', zones: [6, 3] })
  })

  it('acepta una diferencia limite de 0,05 m y rechaza menos', () => {
    const exact = validateServeOverlap(zonesFromDefaults({ 4: { x: 4.45, y: 10 } }))
    expect(exact).toEqual([])
    const under = validateServeOverlap(zonesFromDefaults({ 4: { x: 4.46, y: 10 } }))
    expect(under).toContainEqual({ rule: 'front', zones: [4, 3] })
  })
})
