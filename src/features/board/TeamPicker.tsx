import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'

import { teamsRepo } from '@/persistence/repositories'
import { useBoardStore } from '@/state/boardStore'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

interface TeamPickerProps {
  open: boolean
  onClose: () => void
}

/** Carga un equipo en la pizarra: titulares en zonas y resto en banquillo. */
export function TeamPicker({ open, onClose }: TeamPickerProps) {
  const { t } = useTranslation()
  const teams = useLiveQuery(() => teamsRepo.all(), [], [])
  const addTeamToBoard = useBoardStore((state) => state.addTeamToBoard)

  if (!open) return null

  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('teams.pickTitle')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <h2>{t('teams.pickTitle')}</h2>
          <IconButton label={t('common.close')} onClick={onClose}>
            <Icon name="close" />
          </IconButton>
        </header>
        <p className="muted">{t('teams.pickHint')}</p>
        {teams.length === 0 ? (
          <p>{t('teams.empty')}</p>
        ) : (
          <ul className="pick-list">
            {teams.map((team) => (
              <li key={team.id}>
                <span className="team-dot" style={{ background: team.color }} aria-hidden="true" />
                <span className="pick-name">{team.name}</span>
                <span className="muted">{team.players.length}</span>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    addTeamToBoard(team)
                    onClose()
                  }}
                >
                  {t('teams.load')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
