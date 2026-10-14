import { nanoid } from 'nanoid'

import { clampToPieceRange } from '@/domain/court'
import {
  DEFAULT_BOARD_SETTINGS,
  FRAME_DURATION,
  SCHEMA_VERSION,
  type Board,
  type Entity,
  type Frame,
  type ID,
  type Vec,
} from '@/domain/types'

/** Posiciones iniciales sugeridas para los primeros jugadores (metros). */
const PLAYER_START: Vec[] = [
  { x: 1.5, y: 10 },
  { x: 4.5, y: 10 },
  { x: 7.5, y: 10 },
  { x: 1.5, y: 15 },
  { x: 4.5, y: 15 },
  { x: 7.5, y: 15 },
]

export function createFrame(): Frame {
  return { id: nanoid(), positions: {}, strokes: [], durationMs: FRAME_DURATION.default }
}

export function createEmptyBoard(overrides: Partial<Board> = {}): Board {
  const now = Date.now()
  return {
    id: nanoid(),
    folderId: null,
    title: '',
    view: 'full',
    teamId: null,
    entities: [],
    frames: [createFrame()],
    settings: { ...DEFAULT_BOARD_SETTINGS },
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    ...overrides,
  }
}

export function defaultPlayerPosition(index: number): Vec {
  const preset = PLAYER_START[index]
  if (preset) return { ...preset }
  const ring = index - PLAYER_START.length
  const angle = (ring * 2 * Math.PI) / 8
  return clampToPieceRange({ x: 4.5 + Math.cos(angle) * 2.5, y: 14 + Math.sin(angle) * 2.5 })
}

export function defaultBallPosition(): Vec {
  return { x: 4.5, y: 9.6 }
}

export function createPlayerEntity(id: ID, label: string): Entity {
  return { id, kind: 'player', label }
}

export function createBallEntity(id: ID): Entity {
  return { id, kind: 'ball' }
}
