import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/i18n'
import { App } from '@/app/App'
import './index.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
