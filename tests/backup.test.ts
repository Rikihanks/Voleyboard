import { beforeEach, describe, expect, it } from 'vitest'

import type { Team } from '../src/domain/types'
import {
  buildBackup,
  importBackup,
  parseBackup,
  previewImport,
  serializeBackup,
} from '../src/persistence/backup'
import { db } from '../src/persistence/db'
import { createEmptyBoard } from '../src/state/boardFactory'

async function resetDb(): Promise<void> {
  await Promise.all([
    db.boards.clear(),
    db.teams.clear(),
    db.folders.clear(),
    db.thumbs.clear(),
    db.meta.clear(),
  ])
}

function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index}`,
    name: `Equipo ${index}`,
    color: '#e11d48',
    updatedAt: 1700000000000,
    players: Array.from({ length: 6 }, (_, player) => ({
      id: `team-${index}-p${player}`,
      name: `Jugador ${player}`,
      number: player + 1,
      position: 'OTHER' as const,
    })),
  }))
}

describe('backup', () => {
  beforeEach(resetDb)

  it('exportar e importar 100 tacticas con equipos devuelve datos identicos', async () => {
    const boards = Array.from({ length: 100 }, (_, index) =>
      createEmptyBoard({ id: `board-${index}`, title: `Tactica ${index}`, teamId: 'team-0' }),
    )
    const teams = makeTeams(3)
    await db.boards.bulkPut(boards)
    await db.teams.bulkPut(teams)

    const file = await buildBackup()
    const text = serializeBackup(file)
    await resetDb()

    const parsed = parseBackup(text)
    const summary = await importBackup(parsed)
    expect(summary.boards).toBe(100)
    expect(summary.teams).toBe(3)

    const restoredBoards = await db.boards.toArray()
    const restoredTeams = await db.teams.toArray()
    expect(restoredBoards).toHaveLength(100)
    expect(restoredTeams).toHaveLength(3)

    for (const board of parsed.boards) {
      const restored = restoredBoards.find((candidate) => candidate.id === board.id)
      expect(restored).toEqual(board)
    }
    for (const team of parsed.teams) {
      const restored = restoredTeams.find((candidate) => candidate.id === team.id)
      expect(restored).toEqual(team)
    }
  })

  it('no duplica nada al reimportar una copia identica', async () => {
    await db.boards.bulkPut([createEmptyBoard({ id: 'board-1', title: 'A' })])
    const file = await buildBackup()
    const preview = await previewImport(file)
    expect(preview.boards).toBe(0)
    expect(preview.teams).toBe(0)
  })

  it('importa con id nuevo y titulo "(importada)" en conflicto', async () => {
    await db.boards.bulkPut([createEmptyBoard({ id: 'board-1', title: 'Original' })])
    const file = await buildBackup()
    // Cambia el contenido guardado manteniendo el id.
    await db.boards.update('board-1', { title: 'Modificada' })

    const preview = await previewImport(file)
    expect(preview.renamed).toBe(1)
    await importBackup(file)

    const all = await db.boards.toArray()
    expect(all).toHaveLength(2)
    expect(all.some((board) => board.title === 'Original (importada)')).toBe(true)
  })

  it('rechaza un fichero invalido', () => {
    expect(() => parseBackup('{"app":"otra"}')).toThrow()
  })
})
