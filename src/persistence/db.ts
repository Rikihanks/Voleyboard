import Dexie, { type Table } from 'dexie'

import type { Board, Folder, Team } from '@/domain/types'

export interface Thumb {
  boardId: string
  blob: Blob
  updatedAt: number
}

export interface MetaRecord {
  key: string
  value: unknown
}

/** Base de datos IndexedDB. Tablas: boards, folders, teams, thumbs, meta. */
export class VoleyBoardDB extends Dexie {
  boards!: Table<Board, string>
  folders!: Table<Folder, string>
  teams!: Table<Team, string>
  thumbs!: Table<Thumb, string>
  meta!: Table<MetaRecord, string>

  constructor() {
    super('voleyboard')
    this.version(1).stores({
      boards: 'id, folderId, updatedAt',
      folders: 'id, parentId',
      teams: 'id, name',
      thumbs: 'boardId',
      meta: 'key',
    })
  }
}

export const db = new VoleyBoardDB()

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
