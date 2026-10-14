import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import i18n from '@/i18n'
import { requestPersistence } from '@/persistence/db'
import { useBoardStore } from '@/state/boardStore'
import { useSettingsStore } from '@/state/settingsStore'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'
import { UpdateBanner } from '@/pwa/UpdateBanner'

import { Root } from './Root'
import { navigate, useRoute } from './router'
import { useWakeLock } from './useWakeLock'

export function App() {
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const keepAwake = useSettingsStore((s) => s.keepAwake)
  const boardId = useBoardStore((s) => s.board.id)
  const route = useRoute()

  useWakeLock(keepAwake)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    void i18n.changeLanguage(language)
  }, [language])

  useEffect(() => {
    void requestPersistence()
  }, [])

  const navItems: Array<{
    name: 'board' | 'library' | 'teams'
    label: string
    onClick: () => void
  }> = [
    {
      name: 'board',
      label: t('nav.board'),
      onClick: () => navigate({ name: 'board', id: boardId }),
    },
    { name: 'library', label: t('nav.library'), onClick: () => navigate({ name: 'library' }) },
    { name: 'teams', label: t('nav.teams'), onClick: () => navigate({ name: 'teams' }) },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="ball" size={22} />
          </span>
          <div className="brand-text">
            <h1>{t('app.title')}</h1>
            <p>{t('app.tagline')}</p>
          </div>
        </div>

        <nav className="app-nav" aria-label={t('app.title')}>
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`nav-button${route.name === item.name ? ' is-active' : ''}`}
              aria-current={route.name === item.name ? 'page' : undefined}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <IconButton
            label={`${t('settings.language')}: ${language === 'es' ? 'English' : 'Español'}`}
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
          >
            <Icon name="globe" />
          </IconButton>
          <IconButton label={t('settings.theme')} onClick={toggleTheme}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </IconButton>
        </div>
      </header>

      <Root />
      <UpdateBanner />
    </div>
  )
}
