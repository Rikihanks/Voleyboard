import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FRAME_DURATION, LIMITS } from '@/domain/types'
import { useBoardStore } from '@/state/boardStore'
import { usePlaybackStore } from '@/state/playbackStore'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

/** Tira de fotogramas: anadir, duplicar, borrar, reordenar y duracion. */
export function FrameStrip() {
  const { t } = useTranslation()
  const frames = useBoardStore((s) => s.board.frames)
  const activeFrameIndex = useBoardStore((s) => s.activeFrameIndex)
  const setActiveFrameIndex = useBoardStore((s) => s.setActiveFrameIndex)
  const addFrame = useBoardStore((s) => s.addFrame)
  const duplicateFrame = useBoardStore((s) => s.duplicateFrame)
  const deleteFrame = useBoardStore((s) => s.deleteFrame)
  const moveFrame = useBoardStore((s) => s.moveFrame)
  const setFrameDuration = useBoardStore((s) => s.setFrameDuration)
  const stop = usePlaybackStore((s) => s.stop)
  const [copyStrokes, setCopyStrokes] = useState(false)

  const index = Math.min(activeFrameIndex, frames.length - 1)
  const active = frames[index]

  return (
    <div className="frame-strip">
      <div className="frame-list" role="tablist" aria-label={t('frames.title')}>
        {frames.map((frame, i) => (
          <button
            key={frame.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`frame-chip${i === index ? ' is-active' : ''}`}
            onClick={() => {
              stop()
              setActiveFrameIndex(i)
            }}
          >
            <span className="frame-index">{i + 1}</span>
            <span className="frame-duration">{(frame.durationMs / 1000).toFixed(1)}s</span>
          </button>
        ))}
      </div>

      <div className="frame-actions">
        <IconButton
          label={t('frames.add')}
          disabled={frames.length >= LIMITS.framesPerBoard}
          onClick={() => addFrame(copyStrokes)}
        >
          <Icon name="plus" />
        </IconButton>
        <IconButton
          label={t('frames.duplicate')}
          disabled={frames.length >= LIMITS.framesPerBoard}
          onClick={() => duplicateFrame(index, copyStrokes)}
        >
          <Icon name="redo" />
        </IconButton>
        <IconButton
          label={t('frames.moveLeft')}
          disabled={index === 0}
          onClick={() => moveFrame(index, index - 1)}
        >
          <Icon name="undo" />
        </IconButton>
        <IconButton
          label={t('frames.moveRight')}
          disabled={index >= frames.length - 1}
          onClick={() => moveFrame(index, index + 1)}
        >
          <Icon name="redo" />
        </IconButton>
        <IconButton
          label={t('frames.delete')}
          disabled={frames.length <= 1}
          onClick={() => deleteFrame(index)}
        >
          <Icon name="clear" />
        </IconButton>

        <label className="inline-field">
          <input
            type="checkbox"
            checked={copyStrokes}
            onChange={(event) => setCopyStrokes(event.target.checked)}
          />
          {t('frames.copyStrokes')}
        </label>

        <label className="inline-field">
          <span>{t('frames.duration')}</span>
          <input
            type="number"
            min={FRAME_DURATION.min}
            max={FRAME_DURATION.max}
            step={100}
            value={active?.durationMs ?? FRAME_DURATION.default}
            onChange={(event) => setFrameDuration(index, Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  )
}
