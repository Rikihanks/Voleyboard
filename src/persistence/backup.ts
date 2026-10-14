import { nanoid } from 'nanoid'

import { BACKUP_FORMAT_VERSION, type BackupFile, type ID } from '@/domain/types'

import { db } from './db'
import { migrateBoard } from './migrations'
import { boardsRepo, foldersRepo, teamsRepo } from './repositories'
import { backupFileSchema } from './schemas'

export interface ImportSummary {
  boards: number
  teams: number
  folders: number
  renamed: number
}

export async function buildBackup(boardIds?: ID[]): Promise<BackupFile> {
  const [folders, teams, boards] = await Promise.all([
    foldersRepo.all(),
    teamsRepo.all(),
    boardsRepo.all(),
  ])
  const selected = boardIds ? boards.filter((board) => boardIds.includes(board.id)) : boards
  return {
    app: 'voleyboard',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    folders,
    teams,
    boards: selected,
  }
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2)
}

/** Valida y migra un fichero de copia de seguridad. */
export function parseBackup(text: string): BackupFile {
  const parsed = backupFileSchema.parse(JSON.parse(text))
  const boards = parsed.boards.map((board) => migrateBoard(board))
  return { ...parsed, boards }
}

function sameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function mergeCollection<T extends { id: ID }>(
  incoming: T[],
  existing: Map<ID, T>,
  rename: (item: T) => T,
): { added: T[]; renamed: number } {
  const added: T[] = []
  let renamed = 0
  for (const item of incoming) {
    const current = existing.get(item.id)
    if (!current) {
      added.push(item)
    } else if (sameContent(current, item)) {
      // identico: no se toca
    } else {
      added.push(rename(item))
      renamed += 1
    }
  }
  return { added, renamed }
}

export async function previewImport(file: BackupFile): Promise<ImportSummary> {
  const [boards, teams, folders] = await Promise.all([
    db.boards.toArray(),
    db.teams.toArray(),
    db.folders.toArray(),
  ])
  const boardMap = new Map(boards.map((board) => [board.id, board]))
  const teamMap = new Map(teams.map((team) => [team.id, team]))
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]))

  const b = mergeCollection(file.boards, boardMap, (board) => ({
    ...board,
    id: nanoid(),
    title: `${board.title} (importada)`,
  }))
  const t = mergeCollection(file.teams, teamMap, (team) => ({
    ...team,
    id: nanoid(),
    name: `${team.name} (importada)`,
    players: team.players.map((player) => ({ ...player, id: nanoid() })),
  }))
  const f = mergeCollection(file.folders, folderMap, (folder) => ({ ...folder, id: nanoid() }))

  return {
    boards: b.added.length,
    teams: t.added.length,
    folders: f.added.length,
    renamed: b.renamed + t.renamed + f.renamed,
  }
}

/** Fusiona la copia sin sobrescribir; en conflicto, importa con id nuevo. */
export async function importBackup(file: BackupFile): Promise<ImportSummary> {
  const summary = await previewImport(file)
  const [boards, teams, folders] = await Promise.all([
    db.boards.toArray(),
    db.teams.toArray(),
    db.folders.toArray(),
  ])
  const boardMap = new Map(boards.map((board) => [board.id, board]))
  const teamMap = new Map(teams.map((team) => [team.id, team]))
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]))

  const b = mergeCollection(file.boards, boardMap, (board) => ({
    ...board,
    id: nanoid(),
    title: `${board.title} (importada)`,
  }))
  const t = mergeCollection(file.teams, teamMap, (team) => ({
    ...team,
    id: nanoid(),
    name: `${team.name} (importada)`,
    players: team.players.map((player) => ({ ...player, id: nanoid() })),
  }))
  const f = mergeCollection(file.folders, folderMap, (folder) => ({ ...folder, id: nanoid() }))

  await db.transaction('rw', db.boards, db.teams, db.folders, async () => {
    await db.folders.bulkPut(f.added)
    await db.teams.bulkPut(t.added)
    await db.boards.bulkPut(b.added)
  })
  return summary
}
