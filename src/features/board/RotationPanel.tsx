import { useTranslation } from 'react-i18next'

import {
  generateReceiveFormation,
  generateRotation,
  SYSTEMS,
  type ReceiverCount,
  type RotationNumber,
  type RotationSystem,
} from '@/domain/rotations'
import { useBoardStore } from '@/state/boardStore'
import { useRotationStore } from '@/state/rotationStore'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

const ROTATIONS: RotationNumber[] = [1, 2, 3, 4, 5, 6]
const RECEIVERS: ReceiverCount[] = [5, 4, 3]

interface RotationPanelProps {
  open: boolean
  onClose: () => void
}

/** Panel de rotaciones y recepcion, con validacion de solapamientos. */
export function RotationPanel({ open, onClose }: RotationPanelProps) {
  const { t } = useTranslation()
  const system = useRotationStore((s) => s.system)
  const setSystem = useRotationStore((s) => s.setSystem)
  const rotation = useRotationStore((s) => s.rotation)
  const setRotation = useRotationStore((s) => s.setRotation)
  const receivers = useRotationStore((s) => s.receivers)
  const setReceivers = useRotationStore((s) => s.setReceivers)
  const checking = useRotationStore((s) => s.checking)
  const setChecking = useRotationStore((s) => s.setChecking)
  const applyRotation = useBoardStore((s) => s.applyRotation)

  const apply = (value: RotationNumber) => {
    setRotation(value)
    applyRotation(generateRotation(system, value))
  }

  const nextRotation = () => {
    const value = ((rotation % 6) + 1) as RotationNumber
    useBoardStore.getState().addFrame(false)
    setRotation(value)
    useBoardStore.getState().applyRotation(generateRotation(system, value))
  }

  const applyReceive = () => {
    applyRotation(generateReceiveFormation(receivers, rotation))
  }

  return (
    <aside
      className={`settings-panel${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      aria-label={t('rotation.title')}
    >
      <header className="settings-header">
        <h2>{t('rotation.title')}</h2>
        <IconButton label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </IconButton>
      </header>

      <section className="settings-section">
        <label htmlFor="rotation-system">{t('rotation.system')}</label>
        <select
          id="rotation-system"
          value={system}
          onChange={(event) => setSystem(event.target.value as RotationSystem)}
        >
          {SYSTEMS.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </section>

      <section className="settings-section">
        <h3>{t('rotation.rotation')}</h3>
        <div className="segmented-row">
          {ROTATIONS.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`segmented${rotation === entry ? ' is-active' : ''}`}
              aria-pressed={rotation === entry}
              onClick={() => apply(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
        <button type="button" className="button primary" onClick={nextRotation}>
          {t('rotation.next')}
        </button>
      </section>

      <section className="settings-section">
        <label htmlFor="rotation-receivers">{t('rotation.receivers')}</label>
        <div className="field-row">
          <select
            id="rotation-receivers"
            value={receivers}
            onChange={(event) => setReceivers(Number(event.target.value) as ReceiverCount)}
          >
            {RECEIVERS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <button type="button" className="button" onClick={applyReceive}>
            {t('rotation.applyReceive')}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <label className="inline-field">
          <input
            type="checkbox"
            checked={checking}
            onChange={(event) => setChecking(event.target.checked)}
          />
          {t('rotation.check')}
        </label>
      </section>
    </aside>
  )
}
