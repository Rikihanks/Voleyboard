import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LIMITS } from '@/domain/types'
import { useBoardStore } from '@/state/boardStore'
import { usePlaybackStore } from '@/state/playbackStore'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

import { LineOptions, ToolButtons, ViewSelector } from './toolbarParts'

interface BoardToolbarProps {
  onExport: () => void
  onExportPdf: () => void
  onShare: () => void
  onOpenSettings: () => void
  onClear: () => void
  mobile?: boolean
  onMore?: () => void
}

export function BoardToolbar({
  onExport,
  onExportPdf,
  onShare,
  onOpenSettings,
  onClear,
  mobile = false,
  onMore,
}: BoardToolbarProps) {
  const { t } = useTranslation()
  const tool = useBoardStore((s) => s.tool)
  const addPlayer = useBoardStore((s) => s.addPlayer)
  const addBall = useBoardStore((s) => s.addBall)
  const setTool = useBoardStore((s) => s.setTool)
  const undo = useBoardStore((s) => s.undo)
  const redo = useBoardStore((s) => s.redo)
  const canUndo = useBoardStore((s) => s.past.length > 0)
  const canRedo = useBoardStore((s) => s.future.length > 0)
  const players = useBoardStore((s) => s.board.entities.filter((e) => e.kind === 'player').length)
  const balls = useBoardStore((s) => s.board.entities.filter((e) => e.kind === 'ball').length)
  const activeFrameIndex = useBoardStore((s) => s.activeFrameIndex)
  const frameCount = useBoardStore((s) => s.board.frames.length)
  const setActiveFrameIndex = useBoardStore((s) => s.setActiveFrameIndex)
  const addFrame = useBoardStore((s) => s.addFrame)
  const playing = usePlaybackStore((s) => s.playing)
  const togglePlayback = usePlaybackStore((s) => s.toggle)
  const stopPlayback = usePlaybackStore((s) => s.stop)
  const [mode, setMode] = useState<'draw' | 'play'>('draw')

  if (mobile) {
    return (
      <div className="toolbar toolbar-mobile" role="toolbar" aria-label={t('a11y.toolbar')}>
        {mode === 'draw' ? (
          <>
            <IconButton
              label={t('toolbar.addPlayer')}
              onClick={addPlayer}
              disabled={players >= LIMITS.playersPerBoard}
            >
              <Icon name="plus" />
              <Icon name="player" />
            </IconButton>
            <IconButton
              label={t('toolbar.addBall')}
              onClick={addBall}
              disabled={balls >= LIMITS.ballsPerBoard}
            >
              <Icon name="plus" />
              <Icon name="ball" />
            </IconButton>
            <IconButton
              label={t('toolbar.select')}
              active={tool === 'select'}
              onClick={() => setTool('select')}
            >
              <Icon name="select" />
            </IconButton>
            <IconButton
              label={t('toolbar.pencil')}
              active={tool === 'pencil'}
              onClick={() => setTool('pencil')}
            >
              <Icon name="pencil" />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton
              label={t('frames.previous')}
              disabled={activeFrameIndex <= 0}
              onClick={() => {
                stopPlayback()
                setActiveFrameIndex(activeFrameIndex - 1)
              }}
            >
              <Icon name="back" />
            </IconButton>
            <IconButton
              label={playing ? t('playback.pause') : t('playback.play')}
              active={playing}
              disabled={frameCount < 2}
              onClick={togglePlayback}
            >
              <Icon name={playing ? 'pause' : 'play'} />
            </IconButton>
            <IconButton
              label={t('frames.next')}
              disabled={activeFrameIndex >= frameCount - 1}
              onClick={() => {
                stopPlayback()
                setActiveFrameIndex(activeFrameIndex + 1)
              }}
            >
              <Icon name="forward" />
            </IconButton>
            <IconButton
              label={t('frames.add')}
              disabled={frameCount >= LIMITS.framesPerBoard}
              onClick={() => addFrame(false)}
            >
              <Icon name="plus" />
            </IconButton>
          </>
        )}
        <IconButton
          label={mode === 'draw' ? t('mobile.animation') : t('mobile.drawing')}
          active={mode === 'play'}
          onClick={() => setMode((current) => (current === 'draw' ? 'play' : 'draw'))}
        >
          <Icon name={mode === 'draw' ? 'play' : 'pencil'} />
        </IconButton>
        <IconButton label={t('toolbar.more')} onClick={onMore}>
          <Icon name="more" />
        </IconButton>
      </div>
    )
  }

  return (
    <div className="toolbar" role="toolbar" aria-label={t('a11y.toolbar')}>
      <div className="toolbar-group">
        <IconButton
          label={t('toolbar.addPlayer')}
          onClick={addPlayer}
          disabled={players >= LIMITS.playersPerBoard}
        >
          <Icon name="plus" />
          <Icon name="player" />
        </IconButton>
        <IconButton
          label={t('toolbar.addBall')}
          onClick={addBall}
          disabled={balls >= LIMITS.ballsPerBoard}
        >
          <Icon name="plus" />
          <Icon name="ball" />
        </IconButton>
        <span className="toolbar-count" aria-hidden="true">
          {players}/{LIMITS.playersPerBoard} · {balls}/{LIMITS.ballsPerBoard}
        </span>
      </div>

      <div className="toolbar-group" role="group" aria-label={t('toolbar.groupTools')}>
        <ToolButtons />
      </div>

      {tool === 'line' && (
        <div className="toolbar-group">
          <LineOptions />
        </div>
      )}

      <div className="toolbar-group" role="group" aria-label={t('views.title')}>
        <ViewSelector />
      </div>

      <div className="toolbar-group" role="group" aria-label={t('toolbar.groupHistory')}>
        <IconButton label={t('toolbar.undo')} onClick={undo} disabled={!canUndo}>
          <Icon name="undo" />
        </IconButton>
        <IconButton label={t('toolbar.redo')} onClick={redo} disabled={!canRedo}>
          <Icon name="redo" />
        </IconButton>
      </div>

      <div className="toolbar-group">
        <IconButton label={t('toolbar.clear')} onClick={onClear}>
          <Icon name="clear" />
        </IconButton>
        <IconButton label={t('toolbar.exportPng')} onClick={onExport}>
          <Icon name="download" />
        </IconButton>
        <IconButton label={t('toolbar.exportPdf')} onClick={onExportPdf}>
          <Icon name="file" />
        </IconButton>
        <IconButton label={t('toolbar.share')} onClick={onShare}>
          <Icon name="share" />
        </IconButton>
        <IconButton label={t('toolbar.settings')} onClick={onOpenSettings}>
          <Icon name="settings" />
        </IconButton>
      </div>
    </div>
  )
}
