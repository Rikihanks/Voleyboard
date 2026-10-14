import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { DashPattern, LineHead, LineShape } from '@/domain/types'

export type Language = 'es' | 'en'
export type Theme = 'light' | 'dark'

interface SettingsStore {
  language: Language
  theme: Theme
  /** Rotacion de la vista de pista: 0 o 90 grados. */
  rotation: 0 | 90
  /** Si la rotacion se elige segun el tamano de pantalla (90 en grande). */
  rotationAuto: boolean
  strokeColor: string
  /** Grosor del trazo en metros. */
  strokeWidth: number
  /** Estilo de la herramienta de linea (16 combinaciones). */
  lineDash: DashPattern
  lineShape: LineShape
  lineHead: LineHead
  /** Mantener la pantalla encendida mientras se usa la pizarra. */
  keepAwake: boolean
  /** PDF: una pagina por fotograma en lugar de una por tactica. */
  pdfPerFrame: boolean
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setRotation: (rotation: 0 | 90) => void
  toggleRotation: () => void
  setRotationAuto: (value: boolean) => void
  setStrokeColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setLineDash: (dash: DashPattern) => void
  setLineShape: (shape: LineShape) => void
  setLineHead: (head: LineHead) => void
  setKeepAwake: (value: boolean) => void
  setPdfPerFrame: (value: boolean) => void
}

function detectLanguage(): Language {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
    return 'en'
  }
  return 'es'
}

function detectTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

/** Orientacion por defecto: horizontal en pantallas grandes, vertical en movil. */
function detectRotation(): 0 | 90 {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(min-width: 721px)').matches ? 90 : 0
  }
  return 0
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: detectLanguage(),
      theme: detectTheme(),
      rotation: detectRotation(),
      rotationAuto: true,
      strokeColor: '#f8fafc',
      strokeWidth: 0.15,
      lineDash: 'solid',
      lineShape: 'straight',
      lineHead: 'none',
      keepAwake: true,
      pdfPerFrame: false,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setRotation: (rotation) => set({ rotation, rotationAuto: false }),
      toggleRotation: () =>
        set((s) => ({
          rotation: s.rotation === 90 ? 0 : 90,
          rotationAuto: false,
        })),
      setRotationAuto: (rotationAuto) => set({ rotationAuto }),
      setStrokeColor: (strokeColor) => set({ strokeColor }),
      setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
      setLineDash: (lineDash) => set({ lineDash }),
      setLineShape: (lineShape) => set({ lineShape }),
      setLineHead: (lineHead) => set({ lineHead }),
      setKeepAwake: (keepAwake) => set({ keepAwake }),
      setPdfPerFrame: (pdfPerFrame) => set({ pdfPerFrame }),
    }),
    { name: 'voleyboard.settings' },
  ),
)
