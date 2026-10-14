import type Konva from 'konva'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BoardCanvas } from '@/features/board/BoardCanvas'
import { BoardToolbar } from '@/features/board/BoardToolbar'
import { PieceInspector } from '@/features/board/PieceInspector'
import { RotationPanel } from '@/features/board/RotationPanel'
import { SettingsPanel } from '@/features/board/SettingsPanel'
import { TeamPicker } from '@/features/board/TeamPicker'
import { useKeyboardShortcuts } from '@/features/board/useKeyboardShortcuts'
import { buildBoardPdf, type PdfImage } from '@/features/export/exportPdf'
import { buildFilename, exportStagePng } from '@/features/export/exportPng'
import { shareOrDownload } from '@/features/export/share'
import {
  decodeBoard,
  encodeBoard,
  MAX_SHARE_URL_LENGTH,
  shareUrlFor,
} from '@/features/export/shareLink'
import { FrameStrip } from '@/features/playback/FrameStrip'
import { PlaybackControls } from '@/features/playback/PlaybackControls'
import { usePlaybackLoop } from '@/features/playback/usePlaybackLoop'
import { boardsRepo } from '@/persistence/repositories'
import { useBoardStore } from '@/state/boardStore'
import { useSettingsStore } from '@/state/settingsStore'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Icon } from '@/ui/Icon'
import { MOBILE_QUERY, useMediaQuery } from '@/ui/useMediaQuery'

import { BoardSheet } from './BoardSheet'
import { navigate } from './router'
import { useAutosave } from './useAutosave'

interface BoardScreenProps {
  boardId: string | null
  sharedPayload?: string
}

/** Editor de pizarra: carga, autoguarda y compone barra, lienzo y paneles. */
export function BoardScreen({ boardId, sharedPayload }: BoardScreenProps) {
  const { t } = useTranslation()
  const stageRef = useRef<Konva.Stage | null>(null)
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rotationOpen, setRotationOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [teamPickerOpen, setTeamPickerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const title = useBoardStore((s) => s.board.title)
  const storeBoardId = useBoardStore((s) => s.board.id)
  const setBoardTitle = useBoardStore((s) => s.setBoardTitle)
  const ready = boardId === null || storeBoardId === boardId
  useKeyboardShortcuts()
  usePlaybackLoop()

  useEffect(() => {
    if (!boardId) return
    if (useBoardStore.getState().board.id === boardId) return
    let cancelled = false
    void boardsRepo.get(boardId).then((board) => {
      if (cancelled) return
      if (board) useBoardStore.getState().loadBoard(board)
      else navigate({ name: 'library' })
    })
    return () => {
      cancelled = true
    }
  }, [boardId])

  const boardIdRef = useRef(boardId)
  useEffect(() => {
    boardIdRef.current = boardId
  }, [boardId])

  useEffect(() => {
    if (!sharedPayload) return
    let cancelled = false
    void decodeBoard(sharedPayload).then((decoded) => {
      if (cancelled) return
      if (decoded) {
        const now = Date.now()
        useBoardStore.getState().loadBoard({
          ...decoded,
          id: nanoid(),
          title: `${decoded.title || t('board.untitled')} (enlace)`,
          createdAt: now,
          updatedAt: now,
        })
      } else {
        setStatus(t('share.invalid'))
      }
    })
    return () => {
      cancelled = true
    }
  }, [sharedPayload, t])

  useAutosave(
    stageRef,
    useCallback((id: string) => {
      if (boardIdRef.current !== id) navigate({ name: 'board', id })
    }, []),
  )

  const nextPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

  const exportPng = useCallback(() => {
    void exportStagePng(stageRef.current, title || t('board.untitled'))
  }, [title, t])

  const exportPdf = useCallback(async () => {
    const stage = stageRef.current
    if (!stage) return
    const perFrame = useSettingsStore.getState().pdfPerFrame
    const store = useBoardStore.getState()
    const originalIndex = store.activeFrameIndex
    const indices = perFrame ? store.board.frames.map((_, index) => index) : [originalIndex]
    const aspect = stage.width() / Math.max(1, stage.height())
    const images: PdfImage[] = []
    for (const index of indices) {
      useBoardStore.getState().setActiveFrameIndex(index)
      await nextPaint()
      images.push({ dataUrl: stage.toDataURL({ pixelRatio: 2 }), aspect })
    }
    useBoardStore.getState().setActiveFrameIndex(originalIndex)
    const blob = await buildBoardPdf(images, store.board.view, title || t('board.untitled'))
    await shareOrDownload(blob, buildFilename(title || t('board.untitled'), 'pdf'))
  }, [title, t])

  const sharePng = useCallback(async () => {
    const stage = stageRef.current
    if (!stage) return
    const blob = await new Promise<Blob | null>((resolve) => {
      stage.toBlob({ pixelRatio: 2, mimeType: 'image/png', callback: resolve })
    })
    if (blob) await shareOrDownload(blob, buildFilename(title || t('board.untitled'), 'png'))
  }, [title, t])

  const copyLink = useCallback(async () => {
    try {
      const payload = await encodeBoard(useBoardStore.getState().board)
      const url = shareUrlFor(payload)
      if (url.length > MAX_SHARE_URL_LENGTH) {
        setStatus(t('share.tooLong'))
        return
      }
      await navigator.clipboard?.writeText(url)
      setStatus(t('share.copied'))
    } catch {
      setStatus(t('share.tooLong'))
    }
  }, [t])

  if (!ready) {
    return <div className="screen-loading">{t('nav.board')}…</div>
  }

  return (
    <div className="board-screen">
      <div className="board-topbar">
        <button
          type="button"
          className="button ghost"
          aria-label={t('nav.library')}
          onClick={() => navigate({ name: 'library' })}
        >
          {isMobile ? <Icon name="back" /> : t('nav.library')}
        </button>
        <label className="board-title-field">
          <span className="sr-only">{t('boardTitle.label')}</span>
          <input
            type="text"
            value={title}
            placeholder={t('boardTitle.placeholder')}
            aria-label={t('boardTitle.label')}
            onChange={(event) => setBoardTitle(event.target.value)}
          />
        </label>
        {isMobile ? null : (
          <>
            <button type="button" className="button" onClick={() => setTeamPickerOpen(true)}>
              {t('toolbar.loadTeam')}
            </button>
            <button type="button" className="button" onClick={() => setRotationOpen(true)}>
              {t('rotation.title')}
            </button>
            <button type="button" className="button" onClick={() => void copyLink()}>
              {t('toolbar.copyLink')}
            </button>
          </>
        )}
      </div>

      {status && (
        <p className="status-banner" role="status">
          {status}
        </p>
      )}

      <BoardToolbar
        mobile={isMobile}
        onMore={() => setSheetOpen(true)}
        onExport={exportPng}
        onExportPdf={() => void exportPdf()}
        onShare={() => void sharePng()}
        onOpenSettings={() => setSettingsOpen(true)}
        onClear={() => setClearOpen(true)}
      />

      <div className="board-stage-wrap">
        <BoardCanvas stageRef={stageRef} />
        <PieceInspector />
      </div>

      {!isMobile && (
        <div className="board-footer">
          <FrameStrip />
          <PlaybackControls />
        </div>
      )}

      {isMobile && (
        <BoardSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onExportPng={exportPng}
          onExportPdf={() => void exportPdf()}
          onShare={() => void sharePng()}
          onCopyLink={() => void copyLink()}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenClear={() => setClearOpen(true)}
          onOpenTeams={() => setTeamPickerOpen(true)}
          onOpenRotation={() => setRotationOpen(true)}
        />
      )}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <RotationPanel open={rotationOpen} onClose={() => setRotationOpen(false)} />
      <TeamPicker open={teamPickerOpen} onClose={() => setTeamPickerOpen(false)} />
      <ConfirmDialog
        open={clearOpen}
        title={t('confirm.clearTitle')}
        message={t('confirm.clearMessage')}
        confirmLabel={t('confirm.yes')}
        cancelLabel={t('confirm.no')}
        onConfirm={() => {
          useBoardStore.getState().clearBoard()
          setClearOpen(false)
        }}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  )
}
