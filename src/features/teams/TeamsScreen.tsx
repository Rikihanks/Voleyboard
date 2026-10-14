import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LIMITS, type Player, type PositionRole, type Team } from '@/domain/types'
import { teamsRepo } from '@/persistence/repositories'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'

const ROLES: PositionRole[] = ['S', 'OH', 'MB', 'OPP', 'L', 'DS', 'OTHER']

function emptyTeam(): Team {
  return { id: nanoid(), name: '', color: '#e11d48', players: [], updatedAt: Date.now() }
}

function nextNumber(players: Player[]): number {
  const used = new Set(players.map((player) => player.number))
  for (let n = 1; n <= 99; n += 1) if (!used.has(n)) return n
  return 0
}

function clampNumber(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.min(99, Math.max(0, parsed))
}

export function TeamsScreen() {
  const { t } = useTranslation()
  const teams = useLiveQuery(() => teamsRepo.all(), [], [] as Team[])
  const [editing, setEditing] = useState<Team | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Team | null>(null)

  return (
    <section className="screen">
      <header className="screen-header">
        <h2>{t('teams.title')}</h2>
        <button type="button" className="button primary" onClick={() => setEditing(emptyTeam())}>
          <Icon name="plus" />
          {t('teams.new')}
        </button>
      </header>
      {teams.length === 0 ? (
        <p className="muted">{t('teams.empty')}</p>
      ) : (
        <ul className="card-grid">
          {teams.map((team) => (
            <li key={team.id} className="card">
              <div className="card-head">
                <span className="team-dot" style={{ background: team.color }} aria-hidden="true" />
                <strong>{team.name || t('library.untitled')}</strong>
              </div>
              <p className="muted">
                {team.players.length} · {t('teams.players')}
              </p>
              <div className="card-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => setEditing(structuredClone(team))}
                >
                  {t('teams.title')}
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => void teamsRepo.duplicate(team.id)}
                >
                  {t('teams.duplicate')}
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => setPendingDelete(team)}
                >
                  {t('teams.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <TeamEditor
          key={editing.id}
          team={editing}
          onSave={(team) => {
            void teamsRepo.put(team)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('teams.delete')}
        message={t('teams.confirmDelete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (pendingDelete) void teamsRepo.remove(pendingDelete.id)
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}

interface TeamEditorProps {
  team: Team
  onSave: (team: Team) => void
  onCancel: () => void
}

function TeamEditor({ team, onSave, onCancel }: TeamEditorProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Team>(team)
  const numbers = draft.players.map((player) => player.number)
  const hasDuplicate = numbers.some((number, index) => numbers.indexOf(number) !== index)

  const updatePlayer = (id: string, patch: Partial<Player>) =>
    setDraft((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === id ? { ...player, ...patch } : player,
      ),
    }))

  const addPlayer = () =>
    setDraft((current) =>
      current.players.length >= LIMITS.playersPerTeam
        ? current
        : {
            ...current,
            players: [
              ...current.players,
              { id: nanoid(), name: '', number: nextNumber(current.players), position: 'OTHER' },
            ],
          },
    )

  const removePlayer = (id: string) =>
    setDraft((current) => ({
      ...current,
      players: current.players.filter((player) => player.id !== id),
    }))

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div
        className="dialog wide"
        role="dialog"
        aria-modal="true"
        aria-label={t('teams.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <h2>{t('teams.title')}</h2>
          <IconButton label={t('common.close')} onClick={onCancel}>
            <Icon name="close" />
          </IconButton>
        </header>

        <div className="field-row">
          <label className="field grow">
            <span>{t('teams.name')}</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>{t('teams.color')}</span>
            <input
              type="color"
              value={draft.color}
              onChange={(event) =>
                setDraft((current) => ({ ...current, color: event.target.value }))
              }
            />
          </label>
        </div>

        {hasDuplicate && (
          <p className="warning" role="alert">
            {t('teams.duplicateNumber')}
          </p>
        )}

        <h3>{t('teams.players')}</h3>
        <ul className="player-list">
          {draft.players.map((player) => (
            <li key={player.id}>
              <input
                type="text"
                value={player.name}
                placeholder={t('teams.playerName')}
                onChange={(event) => updatePlayer(player.id, { name: event.target.value })}
              />
              <input
                type="number"
                min={0}
                max={99}
                aria-label={t('teams.number')}
                value={player.number}
                onChange={(event) =>
                  updatePlayer(player.id, { number: clampNumber(event.target.value) })
                }
              />
              <select
                aria-label={t('teams.position')}
                value={player.position}
                onChange={(event) =>
                  updatePlayer(player.id, { position: event.target.value as PositionRole })
                }
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <IconButton label={t('teams.removePlayer')} onClick={() => removePlayer(player.id)}>
                <Icon name="clear" />
              </IconButton>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="button"
          onClick={addPlayer}
          disabled={draft.players.length >= LIMITS.playersPerTeam}
        >
          <Icon name="plus" />
          {t('teams.addPlayer')}
        </button>

        <div className="confirm-actions">
          <button type="button" className="button ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={hasDuplicate}
            onClick={() => onSave(draft)}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
