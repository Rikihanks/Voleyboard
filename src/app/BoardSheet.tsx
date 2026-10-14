import { useTranslation } from 'react-i18next'

import { LineOptions, ToolButtons, ViewSelector } from '@/features/board/toolbarParts'
import { FrameStrip } from '@/features/playback/FrameStrip'
import { PlaybackControls } from '@/features/playback/PlaybackControls'
import { useBoardStore } from '@/state/boardStore'
import { BottomSheet } from '@/ui/BottomSheet'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

export interface BoardSheetProps {
  open: boolean
  onClose: () => void
  onExportPng: () => void
  onExportPdf: () => void
  onShare: () => void
  onCopyLink: () => void
  onOpenSettings: () => void
  onOpenClear: () => void
  onOpenTeams: () => void
  onOpenRotation: () => void
}

/** Menu inferior con las acciones secundarias en movil. */
export function BoardSheet({
  open,
  onClose,
  onExportPng,
  onExportPdf,
  onShare,
  onCopyLink,
  onOpenSettings,
  onOpenClear,
  onOpenTeams,
  onOpenRotation,
}: BoardSheetProps) {
  const { t } = useTranslation()
  const undo = useBoardStore((s) => s.undo)
  const redo = useBoardStore((s) => s.redo)
  const canUndo = useBoardStore((s) => s.past.length > 0)
  const canRedo = useBoardStore((s) => s.future.length > 0)

  const withClose = (action: () => void) => () => {
    action()
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      title={t('toolbar.more')}
      closeLabel={t('common.close')}
      onClose={onClose}
    >
      <section className="sheet-section">
        <h3>{t('views.title')}</h3>
        <ViewSelector />
      </section>

      <section className="sheet-section">
        <h3>{t('toolbar.groupTools')}</h3>
        <div className="sheet-tools">
          <ToolButtons />
        </div>
        <LineOptions />
      </section>

      <section className="sheet-section">
        <h3>{t('toolbar.groupHistory')}</h3>
        <div className="sheet-tools">
          <IconButton label={t('toolbar.undo')} onClick={undo} disabled={!canUndo}>
            <Icon name="undo" />
          </IconButton>
          <IconButton label={t('toolbar.redo')} onClick={redo} disabled={!canRedo}>
            <Icon name="redo" />
          </IconButton>
        </div>
      </section>

      <section className="sheet-section">
        <h3>{t('frames.title')}</h3>
        <FrameStrip />
        <PlaybackControls />
      </section>

      <section className="sheet-section">
        <h3>{t('toolbar.groupFile')}</h3>
        <div className="sheet-grid">
          <button type="button" className="button" onClick={withClose(onExportPng)}>
            {t('toolbar.exportPng')}
          </button>
          <button type="button" className="button" onClick={withClose(onExportPdf)}>
            {t('toolbar.exportPdf')}
          </button>
          <button type="button" className="button" onClick={withClose(onShare)}>
            {t('toolbar.share')}
          </button>
          <button type="button" className="button" onClick={withClose(onCopyLink)}>
            {t('toolbar.copyLink')}
          </button>
        </div>
      </section>

      <section className="sheet-section">
        <h3>{t('nav.board')}</h3>
        <div className="sheet-grid">
          <button type="button" className="button" onClick={withClose(onOpenTeams)}>
            {t('toolbar.loadTeam')}
          </button>
          <button type="button" className="button" onClick={withClose(onOpenRotation)}>
            {t('rotation.title')}
          </button>
          <button type="button" className="button" onClick={withClose(onOpenSettings)}>
            {t('toolbar.settings')}
          </button>
          <button type="button" className="button danger" onClick={withClose(onOpenClear)}>
            {t('toolbar.clear')}
          </button>
        </div>
      </section>
    </BottomSheet>
  )
}
