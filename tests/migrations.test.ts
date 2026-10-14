import { describe, expect, it } from 'vitest'

import { DEFAULT_BOARD_SETTINGS, FRAME_DURATION, SCHEMA_VERSION } from '../src/domain/types'
import { migrateBoard } from '../src/persistence/migrations'

import legacy from './fixtures/board-v0.json'

describe('migrateBoard', () => {
  it('migra un fichero de ejemplo v0 hasta la version actual', () => {
    const board = migrateBoard(legacy)
    expect(board.schemaVersion).toBe(SCHEMA_VERSION)
    expect(board.settings).toEqual(DEFAULT_BOARD_SETTINGS)
    expect(board.view).toBe('full')
    expect(board.entities).toEqual([])
    expect(board.frames).toHaveLength(1)
    expect(board.frames[0]?.durationMs).toBe(FRAME_DURATION.default)
    expect(board.title).toBe('Tactica antigua')
  })

  it('no toca un tablero ya en la version actual', () => {
    const board = migrateBoard({
      ...legacy,
      schemaVersion: SCHEMA_VERSION,
      settings: { ...DEFAULT_BOARD_SETTINGS },
      view: 'half',
      frames: [{ id: 'f1', positions: {}, strokes: [], durationMs: 2000 }],
    })
    expect(board.view).toBe('half')
    expect(board.frames[0]?.durationMs).toBe(2000)
  })
})
