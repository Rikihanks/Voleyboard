import { useTranslation } from 'react-i18next'

import { type CourtTheme, type LabelMode } from '@/domain/types'
import { useBoardStore } from '@/state/boardStore'
import { useSettingsStore, type Language, type Theme } from '@/state/settingsStore'

import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

import { useEffectiveRotation } from './useEffectiveRotation'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const LABEL_MODES: LabelMode[] = ['number', 'name', 'position', 'none']
const COURT_THEMES: CourtTheme[] = ['blue', 'green', 'wood', 'neutral']
const LANGUAGES: Language[] = ['es', 'en']

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { t } = useTranslation()
  const settings = useBoardStore((s) => s.board.settings)
  const updateSettings = useBoardStore((s) => s.updateSettings)

  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const rotation = useEffectiveRotation()
  const setRotation = useSettingsStore((s) => s.setRotation)
  const strokeColor = useSettingsStore((s) => s.strokeColor)
  const setStrokeColor = useSettingsStore((s) => s.setStrokeColor)
  const strokeWidth = useSettingsStore((s) => s.strokeWidth)
  const setStrokeWidth = useSettingsStore((s) => s.setStrokeWidth)
  const pdfPerFrame = useSettingsStore((s) => s.pdfPerFrame)
  const setPdfPerFrame = useSettingsStore((s) => s.setPdfPerFrame)
  const keepAwake = useSettingsStore((s) => s.keepAwake)
  const setKeepAwake = useSettingsStore((s) => s.setKeepAwake)

  return (
    <aside
      className={`settings-panel${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      aria-label={t('settings.title')}
    >
      <header className="settings-header">
        <h2>{t('settings.title')}</h2>
        <IconButton label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </header>

      <section className="settings-section">
        <h3>{t('settings.language')}</h3>
        <div className="segmented-row">
          {LANGUAGES.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`segmented${language === entry ? ' is-active' : ''}`}
              aria-pressed={language === entry}
              onClick={() => setLanguage(entry)}
            >
              {entry.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>{t('settings.theme')}</h3>
        <div className="segmented-row">
          {(['light', 'dark'] as Theme[]).map((entry) => (
            <button
              key={entry}
              type="button"
              className={`segmented${theme === entry ? ' is-active' : ''}`}
              aria-pressed={theme === entry}
              onClick={() => setTheme(entry)}
            >
              {t(`settings.${entry}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>{t('settings.rotation')}</h3>
        <div className="segmented-row">
          {([0, 90] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              data-testid={`rotation-${entry}`}
              className={`segmented${rotation === entry ? ' is-active' : ''}`}
              aria-pressed={rotation === entry}
              onClick={() => setRotation(entry)}
            >
              {t(`settings.rotation${entry}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <label htmlFor="player-scale">
          {t('settings.playerScale')} <span>{Math.round(settings.playerScale * 100)}%</span>
        </label>
        <input
          id="player-scale"
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={settings.playerScale}
          onChange={(event) => updateSettings({ playerScale: Number(event.target.value) })}
        />
      </section>

      <section className="settings-section">
        <label htmlFor="ball-scale">
          {t('settings.ballScale')} <span>{Math.round(settings.ballScale * 100)}%</span>
        </label>
        <input
          id="ball-scale"
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={settings.ballScale}
          onChange={(event) => updateSettings({ ballScale: Number(event.target.value) })}
        />
      </section>

      <section className="settings-section">
        <label htmlFor="label-mode">{t('settings.labelMode')}</label>
        <select
          id="label-mode"
          value={settings.labelMode}
          onChange={(event) => updateSettings({ labelMode: event.target.value as LabelMode })}
        >
          {LABEL_MODES.map((entry) => (
            <option key={entry} value={entry}>
              {t(`labelModes.${entry}`)}
            </option>
          ))}
        </select>
      </section>

      <section className="settings-section">
        <label htmlFor="court-theme">{t('settings.courtTheme')}</label>
        <select
          id="court-theme"
          value={settings.courtTheme}
          onChange={(event) => updateSettings({ courtTheme: event.target.value as CourtTheme })}
        >
          {COURT_THEMES.map((entry) => (
            <option key={entry} value={entry}>
              {t(`themes.${entry}`)}
            </option>
          ))}
        </select>
      </section>

      <section className="settings-section">
        <label htmlFor="stroke-color">{t('settings.strokeColor')}</label>
        <input
          id="stroke-color"
          type="color"
          value={strokeColor}
          onChange={(event) => setStrokeColor(event.target.value)}
        />
        <label htmlFor="stroke-width">
          {t('settings.strokeWidth')} <span>{strokeWidth.toFixed(2)} m</span>
        </label>
        <input
          id="stroke-width"
          type="range"
          min={0.05}
          max={0.5}
          step={0.05}
          value={strokeWidth}
          onChange={(event) => setStrokeWidth(Number(event.target.value))}
        />
      </section>

      <section className="settings-section">
        <h3>{t('settings.export')}</h3>
        <label className="inline-field">
          <input
            type="checkbox"
            checked={pdfPerFrame}
            onChange={(event) => setPdfPerFrame(event.target.checked)}
          />
          {t('settings.pdfPerFrame')}
        </label>
      </section>

      <section className="settings-section">
        <label className="inline-field">
          <input
            type="checkbox"
            checked={keepAwake}
            onChange={(event) => setKeepAwake(event.target.checked)}
          />
          {t('settings.keepAwake')}
        </label>
      </section>
    </aside>
  )
}
