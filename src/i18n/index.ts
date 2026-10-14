import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import es from './es.json'

export const resources = {
  es: { translation: es },
  en: { translation: en },
} as const

function initialLanguage(): 'es' | 'en' {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
    return 'en'
  }
  return 'es'
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: 'es',
  supportedLngs: ['es', 'en'],
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
