import { describe, expect, it } from 'vitest'

import { decodeBoard, encodeBoard } from '../src/features/export/shareLink'
import { createEmptyBoard } from '../src/state/boardFactory'

const hasCompression = typeof CompressionStream !== 'undefined'

describe('shareLink', () => {
  it.skipIf(!hasCompression)('codifica y decodifica una tactica sin perder datos', async () => {
    const board = createEmptyBoard({ id: 'board-1', title: 'Saque y recepcion' })
    const payload = await encodeBoard(board)
    const decoded = await decodeBoard(payload)
    expect(decoded).toEqual(board)
  })

  it('devuelve null ante un fragmento invalido', async () => {
    expect(await decodeBoard('!!!no-es-base64!!!')).toBeNull()
  })
})
