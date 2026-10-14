import { nanoid } from 'nanoid'

import { DEFAULT_BOARD_SETTINGS, FRAME_DURATION } from '@/domain/types'

type LooseBoard = Record<string, unknown> & {
  settings?: unknown
  view?: unknown
  frames?: unknown
  entities?: unknown
  schemaVersion?: number
}

/** v0 -> v1: rellena ajustes, vista y fotogramas que faltaban. */
export function migrateV0ToV1(input: unknown): LooseBoard {
  const board: LooseBoard = { ...(input as LooseBoard) }
  if (!board.settings || typeof board.settings !== 'object') {
    board.settings = { ...DEFAULT_BOARD_SETTINGS }
  }
  if (typeof board.view !== 'string') board.view = 'full'
  if (!Array.isArray(board.entities)) board.entities = []
  if (!Array.isArray(board.frames) || board.frames.length === 0) {
    board.frames = [
      { id: nanoid(), positions: {}, strokes: [], durationMs: FRAME_DURATION.default },
    ]
  }
  board.schemaVersion = 1
  return board
}
