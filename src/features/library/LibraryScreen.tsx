import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LIMITS, type Board, type Folder, type ID } from '@/domain/types'
import {
  buildBackup,
  importBackup,
  parseBackup,
  previewImport,
  serializeBackup,
  type ImportSummary,
} from '@/persistence/backup'
import { boardsRepo, foldersRepo, thumbsRepo } from '@/persistence/repositories'
import { createEmptyBoard } from '@/state/boardFactory'
import { useSettingsStore } from '@/state/settingsStore'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'
import { TextPromptDialog } from '@/ui/TextPromptDialog'

type FolderSelection = { type: 'all' } | { type: 'root' } | { type: 'folder'; id: ID }
type SortMode = 'date' | 'name'

interface LibraryScreenProps {
  onOpenBoard: (id: ID) => void
}

function childrenOf(folders: Folder[], parentId: ID | null): Folder[] {
  return folders.filter((folder) => folder.parentId === parentId).sort((a, b) => a.order - b.order)
}

function folderDepth(folders: Folder[], id: ID): number {
  let depth = 1
  let current = folders.find((folder) => folder.id === id)
  let guard = 0
  while (current?.parentId && guard < 100) {
    depth += 1
    current = folders.find((folder) => folder.id === current?.parentId)
    guard += 1
  }
  return depth
}

function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function dateStamp(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
}

export function LibraryScreen({ onOpenBoard }: LibraryScreenProps) {
  const { t } = useTranslation()
  const language = useSettingsStore((state) => state.language)
  const boards = useLiveQuery(() => boardsRepo.all(), [], [] as Board[])
  const folders = useLiveQuery(() => foldersRepo.all(), [], [] as Folder[])

  const [selection, setSelection] = useState<FolderSelection>({ type: 'all' })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('date')
  const [status, setStatus] = useState<string | null>(null)

  const [renaming, setRenaming] = useState<Board | null>(null)
  const [deleting, setDeleting] = useState<Board | null>(null)
  const [newFolderFor, setNewFolderFor] = useState<{ parentId: ID | null } | null>(null)
  const [pendingBackup, setPendingBackup] = useState<{
    text: string
    summary: ImportSummary
  } | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }),
    [language],
  )

  const visibleBoards = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = boards.filter((board) => {
      if (selection.type === 'root') return board.folderId === null
      if (selection.type === 'folder') return board.folderId === selection.id
      return true
    })
    const searched = needle
      ? filtered.filter((board) => board.title.toLowerCase().includes(needle))
      : filtered
    return [...searched].sort((a, b) =>
      sort === 'name' ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt,
    )
  }, [boards, search, selection, sort])

  const selectedFolder = selection.type === 'folder' ? selection.id : null
  const canNest =
    selectedFolder === null || folderDepth(folders, selectedFolder) < LIMITS.folderDepth

  const createBoard = async () => {
    const board = createEmptyBoard({ title: t('library.untitled'), folderId: selectedFolder })
    await boardsRepo.put(board)
    onOpenBoard(board.id)
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      const summary = await previewImport(parsed)
      setPendingBackup({ text, summary })
    } catch {
      setStatus(t('library.importTitle') + ': error')
    }
  }

  const exportBackup = async () => {
    const file = await buildBackup()
    downloadJson(`voleyboard-${dateStamp()}.voleyboard.json`, serializeBackup(file))
  }

  return (
    <section className="screen library-screen">
      <header className="screen-header">
        <h2>{t('library.title')}</h2>
        <div className="screen-header-actions">
          <button type="button" className="button" onClick={() => void exportBackup()}>
            <Icon name="download" />
            {t('library.backupExport')}
          </button>
          <button type="button" className="button" onClick={() => fileRef.current?.click()}>
            {t('library.backupImport')}
          </button>
          <button type="button" className="button primary" onClick={() => void createBoard()}>
            <Icon name="plus" />
            {t('library.newBoard')}
          </button>
        </div>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleImportFile(file)
          event.target.value = ''
        }}
      />

      {status && (
        <p className="status-banner" role="status">
          {status}
        </p>
      )}

      <div className="library-layout">
        <aside className="folder-tree" aria-label={t('library.folders')}>
          <button
            type="button"
            className={`tree-item${selection.type === 'all' ? ' is-active' : ''}`}
            onClick={() => setSelection({ type: 'all' })}
          >
            {t('library.all')}
          </button>
          <button
            type="button"
            className={`tree-item${selection.type === 'root' ? ' is-active' : ''}`}
            onClick={() => setSelection({ type: 'root' })}
          >
            {t('library.root')}
          </button>
          {childrenOf(folders, null).map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              folders={folders}
              depth={1}
              selection={selection}
              onSelect={setSelection}
            />
          ))}
          <button
            type="button"
            className="tree-item subtle"
            disabled={!canNest}
            title={canNest ? undefined : t('library.folderDepthLimit')}
            onClick={() => setNewFolderFor({ parentId: selectedFolder })}
          >
            <Icon name="plus" />
            {t('library.newFolder')}
          </button>
        </aside>

        <div className="library-main">
          <div className="library-filters">
            <input
              type="search"
              value={search}
              placeholder={t('library.search')}
              aria-label={t('library.search')}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label className="inline-field">
              <span>{t('library.sort')}</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                <option value="date">{t('library.sortDate')}</option>
                <option value="name">{t('library.sortName')}</option>
              </select>
            </label>
          </div>

          {visibleBoards.length === 0 ? (
            <p className="muted">{t('library.empty')}</p>
          ) : (
            <ul className="board-grid">
              {visibleBoards.map((board) => (
                <li key={board.id} className="board-card">
                  <button
                    type="button"
                    className="board-open"
                    onClick={() => onOpenBoard(board.id)}
                    aria-label={`${t('nav.board')}: ${board.title || t('library.untitled')}`}
                  >
                    <BoardThumb boardId={board.id} />
                    <span className="board-title">{board.title || t('library.untitled')}</span>
                    <span className="muted small">
                      {dateFormatter.format(new Date(board.updatedAt))}
                    </span>
                  </button>
                  <div className="board-actions">
                    <IconButton label={t('library.rename')} onClick={() => setRenaming(board)}>
                      <Icon name="pencil" />
                    </IconButton>
                    <IconButton
                      label={t('library.duplicate')}
                      onClick={() => void boardsRepo.duplicate(board.id)}
                    >
                      <Icon name="redo" />
                    </IconButton>
                    <IconButton label={t('library.delete')} onClick={() => setDeleting(board)}>
                      <Icon name="clear" />
                    </IconButton>
                    <label className="inline-field move-field">
                      <span className="sr-only">{t('library.moveTo')}</span>
                      <select
                        aria-label={t('library.moveTo')}
                        value={board.folderId ?? ''}
                        onChange={(event) =>
                          void boardsRepo.moveToFolder(board.id, event.target.value || null)
                        }
                      >
                        <option value="">{t('library.root')}</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {'— '.repeat(folderDepth(folders, folder.id) - 1)}
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <TextPromptDialog
        open={renaming !== null}
        title={t('library.rename')}
        label={t('boardTitle.label')}
        initialValue={renaming?.title ?? ''}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onConfirm={(value) => {
          if (renaming) void boardsRepo.rename(renaming.id, value)
          setRenaming(null)
        }}
        onCancel={() => setRenaming(null)}
      />

      <TextPromptDialog
        open={newFolderFor !== null}
        title={t('library.newFolder')}
        label={t('library.folders')}
        initialValue=""
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onConfirm={(value) => {
          const parentId = newFolderFor?.parentId ?? null
          void foldersRepo.create(value || t('library.newFolder'), parentId).then((folder) => {
            if (!folder) setStatus(t('library.folderDepthLimit'))
          })
          setNewFolderFor(null)
        }}
        onCancel={() => setNewFolderFor(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t('library.delete')}
        message={t('library.confirmDelete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (deleting) void boardsRepo.remove(deleting.id)
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={pendingBackup !== null}
        title={t('library.importTitle')}
        message={
          pendingBackup
            ? t('library.importSummary', {
                boards: pendingBackup.summary.boards,
                teams: pendingBackup.summary.teams,
                folders: pendingBackup.summary.folders,
                renamed: pendingBackup.summary.renamed,
              })
            : ''
        }
        confirmLabel={t('library.importConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (pendingBackup) {
            void importBackup(parseBackup(pendingBackup.text)).then(() =>
              setStatus(t('library.importDone')),
            )
          }
          setPendingBackup(null)
        }}
        onCancel={() => setPendingBackup(null)}
      />
    </section>
  )
}

interface FolderNodeProps {
  folder: Folder
  folders: Folder[]
  depth: number
  selection: FolderSelection
  onSelect: (selection: FolderSelection) => void
}

function FolderNode({ folder, folders, depth, selection, onSelect }: FolderNodeProps) {
  const isActive = selection.type === 'folder' && selection.id === folder.id
  return (
    <>
      <button
        type="button"
        className={`tree-item${isActive ? ' is-active' : ''}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => onSelect({ type: 'folder', id: folder.id })}
      >
        {folder.name}
      </button>
      {childrenOf(folders, folder.id).map((child) => (
        <FolderNode
          key={child.id}
          folder={child}
          folders={folders}
          depth={depth + 1}
          selection={selection}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}

function BoardThumb({ boardId }: { boardId: ID }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    void thumbsRepo.get(boardId).then((blob) => {
      if (active && blob) {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      }
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [boardId])

  if (!url) return <span className="thumb placeholder" aria-hidden="true" />
  return <img className="thumb" src={url} alt="" />
}
