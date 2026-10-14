import { useTranslation } from 'react-i18next'

import { sampleAnimation, totalDuration } from '@/domain/animation'
import type { PlaybackSpeed } from '@/domain/types'
import { useBoardStore } from '@/state/boardStore'
import { usePlaybackStore } from '@/state/playbackStore'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2]

/** Reproductor: play, detener, velocidad, bucle, fantasma y progreso. */
export function PlaybackControls() {
  const { t } = useTranslation()
  const playing = usePlaybackStore((s) => s.playing)
  const time = usePlaybackStore((s) => s.time)
  const toggle = usePlaybackStore((s) => s.toggle)
  const reset = usePlaybackStore((s) => s.reset)
  const setTime = usePlaybackStore((s) => s.setTime)
  const frames = useBoardStore((s) => s.board.frames)
  const settings = useBoardStore((s) => s.board.settings)
  const updateSettings = useBoardStore((s) => s.updateSettings)

  const total = totalDuration(frames)
  const sample = sampleAnimation(frames, time, { loop: settings.loop })
  const progress = total > 0 ? Math.min(1, time / total) : 0

  return (
    <div className="playback-controls">
      <IconButton label={playing ? t('playback.pause') : t('playback.play')} onClick={toggle}>
        <Icon name={playing ? 'pause' : 'play'} />
      </IconButton>
      <IconButton label={t('playback.stop')} onClick={reset}>
        <Icon name="stop" />
      </IconButton>

      <input
        className="playback-progress"
        type="range"
        min={0}
        max={Math.max(1, total)}
        step={10}
        value={time}
        aria-label={t('playback.frame')}
        onChange={(event) => setTime(Number(event.target.value))}
      />

      <span className="muted small">
        {t('playback.frame')} {sample.frameIndex + 1}/{frames.length} · {Math.round(progress * 100)}
        %
      </span>

      <label className="inline-field">
        <span>{t('playback.speed')}</span>
        <select
          value={settings.speed}
          onChange={(event) =>
            updateSettings({ speed: Number(event.target.value) as PlaybackSpeed })
          }
        >
          {SPEEDS.map((speed) => (
            <option key={speed} value={speed}>
              {speed}×
            </option>
          ))}
        </select>
      </label>

      <label className="inline-field">
        <input
          type="checkbox"
          checked={settings.loop}
          onChange={(event) => updateSettings({ loop: event.target.checked })}
        />
        {t('playback.loop')}
      </label>

      <label className="inline-field">
        <input
          type="checkbox"
          checked={settings.showGhost}
          onChange={(event) => updateSettings({ showGhost: event.target.checked })}
        />
        {t('playback.ghost')}
      </label>
    </div>
  )
}
