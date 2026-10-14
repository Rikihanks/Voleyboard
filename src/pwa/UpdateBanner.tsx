import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Aviso de nueva version; nunca recarga sola a mitad de edicion. */
export function UpdateBanner() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span>{t('pwa.updateAvailable')}</span>
      <div className="update-actions">
        <button
          type="button"
          className="button primary"
          onClick={() => void updateServiceWorker(true)}
        >
          {t('pwa.update')}
        </button>
        <button type="button" className="button ghost" onClick={() => setNeedRefresh(false)}>
          {t('pwa.later')}
        </button>
      </div>
    </div>
  )
}
