import { nanoid } from 'nanoid'

import { LIMITS, type Board, type Folder, type ID, type Team } from '@/domain/types'

import { db, type MetaRecord } from './db'
import { migrateBoard } from './migrations'

export const boardsRepo = {
  async all(): Promise<Board[]> {
    const boards = await db.boards.orderBy('updatedAt').reverse().toArray()
    return boards.map((board) => migrateBoard(board))
  },
  async byFolder(folderId: ID | null): Promise<Board[]> {
    const boards = await db.boards.toArray()
    return boards
      .filter((board) => board.folderId === folderId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((board) => migrateBoard(board))
  },
  async get(id: ID): Promise<Board | undefined> {
    const board = await db.boards.get(id)
    return board ? migrateBoard(board) : undefined
  },
  async put(board: Board): Promise<void> {
    await db.boards.put(board)
  },
  async remove(id: ID): Promise<void> {
    await db.transaction('rw', db.boards, db.thumbs, async () => {
      await db.boards.delete(id)
      await db.thumbs.delete(id)
    })
  },
  async rename(id: ID, title: string): Promise<void> {
    await db.boards.update(id, { title, updatedAt: Date.now() })
  },
  async duplicate(id: ID): Promise<Board | undefined> {
    const source = await db.boards.get(id)
    if (!source) return undefined
    const copy: Board = {
      ...structuredClone(source),
      id: nanoid(),
      title: `${source.title} (copia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await db.boards.put(copy)
    return copy
  },
  async moveToFolder(id: ID, folderId: ID | null): Promise<void> {
    await db.boards.update(id, { folderId, updatedAt: Date.now() })
  },
  async search(query: string): Promise<Board[]> {
    const needle = query.trim().toLowerCase()
    const boards = await this.all()
    if (!needle) return boards
    return boards.filter((board) => board.title.toLowerCase().includes(needle))
  },
}

function depthOf(folders: Folder[], id: ID): number {
  let depth = 1
  let current = folders.find((folder) => folder.id === id)
  let guard = 0
  while (current && current.parentId && guard < 100) {
    depth += 1
    current = folders.find((folder) => folder.id === current?.parentId)
    guard += 1
  }
  return depth
}

function descendantsOf(folders: Folder[], id: ID): ID[] {
  const result: ID[] = []
  const walk = (parentId: ID) => {
    for (const folder of folders) {
      if (folder.parentId === parentId) {
        result.push(folder.id)
        walk(folder.id)
      }
    }
  }
  walk(id)
  return result
}

export const foldersRepo = {
  async all(): Promise<Folder[]> {
    const folders = await db.folders.toArray()
    return folders.sort((a, b) => a.order - b.order)
  },
  async get(id: ID): Promise<Folder | undefined> {
    return db.folders.get(id)
  },
  /** Crea una carpeta si no supera el limite de anidamiento. */
  async create(name: string, parentId: ID | null): Promise<Folder | null> {
    const folders = await this.all()
    if (parentId) {
      const parent = folders.find((folder) => folder.id === parentId)
      if (parent && depthOf(folders, parent.id) + 1 > LIMITS.folderDepth) return null
    }
    const siblings = folders.filter((folder) => folder.parentId === parentId)
    const folder: Folder = {
      id: nanoid(),
      name,
      parentId,
      order: siblings.length,
    }
    await db.folders.put(folder)
    return folder
  },
  async rename(id: ID, name: string): Promise<void> {
    await db.folders.update(id, { name })
  },
  async move(id: ID, parentId: ID | null): Promise<boolean> {
    const folders = await this.all()
    const self = folders.find((folder) => folder.id === id)
    if (!self) return false
    if (parentId) {
      const descendants = descendantsOf(folders, id)
      if (parentId === id || descendants.includes(parentId)) return false
      if (depthOf(folders, parentId) + 1 > LIMITS.folderDepth) return false
    }
    await db.folders.update(id, { parentId })
    return true
  },
  async remove(id: ID): Promise<void> {
    const folders = await this.all()
    const ids = [id, ...descendantsOf(folders, id)]
    const boards = await db.boards.toArray()
    await db.transaction('rw', db.folders, db.boards, async () => {
      for (const board of boards) {
        if (board.folderId && ids.includes(board.folderId)) {
          await db.boards.update(board.id, { folderId: null })
        }
      }
      await db.folders.bulkDelete(ids)
    })
  },
}

export const teamsRepo = {
  async all(): Promise<Team[]> {
    const teams = await db.teams.toArray()
    return teams.sort((a, b) => a.name.localeCompare(b.name))
  },
  async get(id: ID): Promise<Team | undefined> {
    return db.teams.get(id)
  },
  async put(team: Team): Promise<void> {
    await db.teams.put({ ...team, updatedAt: Date.now() })
  },
  async remove(id: ID): Promise<void> {
    await db.teams.delete(id)
  },
  async duplicate(id: ID): Promise<Team | undefined> {
    const source = await db.teams.get(id)
    if (!source) return undefined
    const copy: Team = {
      ...structuredClone(source),
      id: nanoid(),
      name: `${source.name} (copia)`,
      players: source.players.map((player) => ({ ...player, id: nanoid() })),
      updatedAt: Date.now(),
    }
    await db.teams.put(copy)
    return copy
  },
}

export const thumbsRepo = {
  async get(boardId: ID): Promise<Blob | undefined> {
    const record = await db.thumbs.get(boardId)
    return record?.blob
  },
  async put(boardId: ID, blob: Blob): Promise<void> {
    await db.thumbs.put({ boardId, blob, updatedAt: Date.now() })
  },
}

export const metaRepo = {
  async get<T>(key: string): Promise<T | undefined> {
    const record = await db.meta.get(key)
    return record?.value as T | undefined
  },
  async set(key: string, value: unknown): Promise<void> {
    await db.meta.put({ key, value } satisfies MetaRecord)
  },
}
