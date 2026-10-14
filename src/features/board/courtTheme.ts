import type { CourtTheme } from '@/domain/types'

export interface CourtColors {
  background: string
  court: string
  lines: string
  net: string
  text: string
  accent: string
}

export const COURT_THEMES: Record<CourtTheme, CourtColors> = {
  blue: {
    background: '#0b1220',
    court: '#1d4ed8',
    lines: '#f8fafc',
    net: '#e2e8f0',
    text: '#e2e8f0',
    accent: '#f59e0b',
  },
  green: {
    background: '#052e16',
    court: '#15803d',
    lines: '#f8fafc',
    net: '#ecfdf5',
    text: '#ecfdf5',
    accent: '#facc15',
  },
  wood: {
    background: '#2b1a0b',
    court: '#b45309',
    lines: '#fff7ed',
    net: '#fde68a',
    text: '#ffedd5',
    accent: '#38bdf8',
  },
  neutral: {
    background: '#111827',
    court: '#6b7280',
    lines: '#f9fafb',
    net: '#e5e7eb',
    text: '#f3f4f6',
    accent: '#f59e0b',
  },
}

export function courtColors(theme: CourtTheme): CourtColors {
  return COURT_THEMES[theme]
}
