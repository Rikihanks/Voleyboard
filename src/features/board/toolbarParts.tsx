import { useTranslation } from 'react-i18next'

import { type CourtView, type DashPattern, type LineHead, type LineShape } from '@/domain/types'
import { useBoardStore, type Tool } from '@/state/boardStore'
import { useSettingsStore } from '@/state/settingsStore'
import { Icon, type IconName } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

export interface ToolEntry {
  id: Tool
  icon: IconName
  labelKey: string
}

const TOOLS: ToolEntry[] = [
  { id: 'select', icon: 'select', labelKey: 'toolbar.select' },
  { id: 'pencil', icon: 'pencil', labelKey: 'toolbar.pencil' },
  { id: 'line', icon: 'line', labelKey: 'toolbar.line' },
  { id: 'text', icon: 'text', labelKey: 'toolbar.text' },
  { id: 'eraser', icon: 'eraser', labelKey: 'toolbar.eraser' },
]

const VIEWS: CourtView[] = ['full', 'half', 'blank']
const DASHES: DashPattern[] = ['solid', 'dashed', 'dotted', 'dashdot']
const SHAPES: LineShape[] = ['straight', 'curve']
const HEADS: LineHead[] = ['none', 'arrow']

export function ToolButtons({ tools = TOOLS }: { tools?: ToolEntry[] }) {
  const { t } = useTranslation()
  const tool = useBoardStore((s) => s.tool)
  const setTool = useBoardStore((s) => s.setTool)
  return (
    <>
      {tools.map((entry) => (
        <IconButton
          key={entry.id}
          label={t(entry.labelKey)}
          active={tool === entry.id}
          onClick={() => setTool(entry.id)}
        >
          <Icon name={entry.icon} />
        </IconButton>
      ))}
    </>
  )
}

export function ViewSelector() {
  const { t } = useTranslation()
  const view = useBoardStore((s) => s.board.view)
  const setView = useBoardStore((s) => s.setView)
  return (
    <div className="segmented-row">
      {VIEWS.map((entry) => (
        <button
          key={entry}
          type="button"
          className={`segmented${view === entry ? ' is-active' : ''}`}
          aria-pressed={view === entry}
          onClick={() => setView(entry)}
        >
          {t(`views.${entry}`)}
        </button>
      ))}
    </div>
  )
}

export function LineOptions() {
  const { t } = useTranslation()
  const lineDash = useSettingsStore((s) => s.lineDash)
  const setLineDash = useSettingsStore((s) => s.setLineDash)
  const lineShape = useSettingsStore((s) => s.lineShape)
  const setLineShape = useSettingsStore((s) => s.setLineShape)
  const lineHead = useSettingsStore((s) => s.lineHead)
  const setLineHead = useSettingsStore((s) => s.setLineHead)

  return (
    <div className="line-options">
      <label className="inline-field">
        <span>{t('line.dashLabel')}</span>
        <select
          value={lineDash}
          onChange={(event) => setLineDash(event.target.value as DashPattern)}
        >
          {DASHES.map((dash) => (
            <option key={dash} value={dash}>
              {t(`line.dash.${dash}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-field">
        <span>{t('line.shapeLabel')}</span>
        <select
          value={lineShape}
          onChange={(event) => setLineShape(event.target.value as LineShape)}
        >
          {SHAPES.map((shape) => (
            <option key={shape} value={shape}>
              {t(`line.shape.${shape}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-field">
        <span>{t('line.headLabel')}</span>
        <select value={lineHead} onChange={(event) => setLineHead(event.target.value as LineHead)}>
          {HEADS.map((head) => (
            <option key={head} value={head}>
              {t(`line.head.${head}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
