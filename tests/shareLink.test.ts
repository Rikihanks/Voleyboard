import { describe, expect, it } from 'vitest'

import {
  decodeBoardPayload,
  encodeBoardPayload,
  encodeBoardV1,
} from '../src/features/export/boardCodec'
import { createEmptyBoard } from '../src/state/boardFactory'

describe('boardCodec', () => {
  it('v2: ida y vuelta conserva los datos (coordenadas al cm)', async () => {
    const board = createEmptyBoard({ id: 'b1', title: 'Saque y recepcion' })
    board.entities.push({
      id: 'p1',
      kind: 'player',
      label: 'Ana',
      zone: 4,
      role: 'OH',
      color: '#e11d48',
    })
    board.entities.push({ id: 'x', kind: 'ball' })
    board.frames[0]!.positions = { p1: { x: 1.5, y: 10 }, x: { x: 4.5, y: 9.6 } }
    board.frames[0]!.strokes.push({
      id: 's1',
      tool: 'line',
      points: [
        { x: 0, y: 0 },
        { x: 9, y: 18 },
      ],
      style: { dash: 'dashed', shape: 'straight', head: 'arrow', color: '#ffffff', width: 0.15 },
    })
    board.frames[0]!.strokes.push({
      id: 't1',
      tool: 'text',
      points: [{ x: 2, y: 2 }],
      style: { dash: 'solid', shape: 'straight', head: 'none', color: '#ffffff', width: 0.15 },
      text: 'Nota',
    })

    const payload = await encodeBoardPayload(board)
    expect(payload.startsWith('2.')).toBe(true)

    const decoded = await decodeBoardPayload(payload)
    expect(decoded).not.toBeNull()
    if (!decoded) return
    expect(decoded.title).toBe(board.title)
    expect(decoded.view).toBe(board.view)
    expect(decoded.settings).toEqual(board.settings)
    expect(decoded.entities.map((entity) => ({ ...entity, id: '' }))).toEqual(
      board.entities.map((entity) => ({ ...entity, id: '' })),
    )
    // Las entidades llevan id nuevo, asi que se comparan por orden.
    expect(Object.values(decoded.frames[0]!.positions)).toEqual(
      Object.values(board.frames[0]!.positions),
    )

    const line = decoded.frames[0]!.strokes[0]!
    expect(line.tool).toBe('line')
    expect(line.style).toEqual(board.frames[0]!.strokes[0]!.style)
    expect(line.points).toEqual(board.frames[0]!.strokes[0]!.points)
    const text = decoded.frames[0]!.strokes[1]!
    expect(text.tool).toBe('text')
    expect(text.text).toBe('Nota')
  })

  it('sigue abriendo enlaces v1 (antiguos)', async () => {
    const board = createEmptyBoard({ id: 'old', title: 'Antiguo' })
    board.entities.push({ id: 'p1', kind: 'player', label: 'Ana' })
    board.frames[0]!.positions = { p1: { x: 3, y: 12 } }

    const payload = await encodeBoardV1(board)
    expect(payload.startsWith('2.')).toBe(false)

    const decoded = await decodeBoardPayload(payload)
    expect(decoded).toEqual(board)
  })

  it('devuelve null ante un fragmento invalido', async () => {
    expect(await decodeBoardPayload('!!!no-base64!!!')).toBeNull()
  })

  it('v2 es mucho mas corto que v1 con un trazo denso', async () => {
    const board = createEmptyBoard({ title: 'Dibujo' })
    board.entities.push({ id: 'p1', kind: 'player', label: 'Ana' })
    board.frames[0]!.positions = { p1: { x: 1, y: 1 } }
    const points = Array.from({ length: 300 }, (_, i) => ({
      x: 1 + i * 0.03,
      y: 5 + Math.sin(i / 5),
    }))
    board.frames[0]!.strokes.push({
      id: 's1',
      tool: 'pencil',
      points,
      style: { dash: 'solid', shape: 'straight', head: 'none', color: '#ffffff', width: 0.15 },
    })

    const v1 = await encodeBoardV1(board)
    const v2 = await encodeBoardPayload(board)
    expect(v2.length).toBeLessThan(v1.length / 2)
  })
})
