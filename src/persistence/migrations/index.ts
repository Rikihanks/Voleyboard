import { SCHEMA_VERSION, type Board } from '@/domain/types'

import { migrateV0ToV1 } from './v0_to_v1'

export interface Migration {
  from: number
  to: number
  migrate: (board: unknown) => unknown
}

/** Migraciones n -> n+1, aplicadas en cadena segun schemaVersion. */
export const migrations: Migration[] = [{ from: 0, to: 1, migrate: migrateV0ToV1 }]

/** Aplica las migraciones necesarias hasta SCHEMA_VERSION. */
export function migrateBoard(input: unknown): Board {
  let board = input as Record<string, unknown> & { schemaVersion?: number }
  let version = typeof board.schemaVersion === 'number' ? board.schemaVersion : 0
  let guard = 0
  while (version < SCHEMA_VERSION && guard < 100) {
    const step = migrations.find((migration) => migration.from === version)
    if (!step) break
    board = step.migrate(board) as Record<string, unknown> & { schemaVersion?: number }
    version = step.to
    guard += 1
  }
  return board as unknown as Board
}
