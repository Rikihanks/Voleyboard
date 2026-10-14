import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { DEFAULT_BALL_COLOR, DEFAULT_TEAM_COLOR } from '@/domain/types'
import { useBoardStore } from '@/state/boardStore'

import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

/** Panel flotante para editar la pieza seleccionada. */
export function PieceInspector() {
  const { t } = useTranslation()
  const entity = useBoardStore((s) =>
    s.selection.length === 1 ? s.board.entities.find((e) => e.id === s.selection[0]) : undefined,
  )
  const labelEditRequest = useBoardStore((s) => s.labelEditRequest)
  const clearLabelEdit = useBoardStore((s) => s.clearLabelEdit)
  const setEntityLabel = useBoardStore((s) => s.setEntityLabel)
  const setEntityColor = useBoardStore((s) => s.setEntityColor)
  const removeEntity = useBoardStore((s) => s.removeEntity)
  const labelRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (entity && labelEditRequest === entity.id) {
      labelRef.current?.focus()
      labelRef.current?.select()
      clearLabelEdit()
    }
  }, [entity, labelEditRequest, clearLabelEdit])

  if (!entity) return null
  const fallbackColor = entity.kind === 'player' ? DEFAULT_TEAM_COLOR : DEFAULT_BALL_COLOR

  return (
    <div className="piece-inspector">
      {entity.kind === 'player' && (
        <label className="piece-field">
          <span>{t('piece.label')}</span>
          <input
            ref={labelRef}
            type="text"
            value={entity.label ?? ''}
            maxLength={12}
            onChange={(event) => setEntityLabel(entity.id, event.target.value)}
          />
        </label>
      )}
      <label className="piece-field">
        <span>{t('piece.color')}</span>
        <input
          type="color"
          value={entity.color ?? fallbackColor}
          onChange={(event) => setEntityColor(entity.id, event.target.value)}
        />
      </label>
      <IconButton label={t('piece.remove')} onClick={() => removeEntity(entity.id)}>
        <Icon name="clear" />
      </IconButton>
    </div>
  )
}
