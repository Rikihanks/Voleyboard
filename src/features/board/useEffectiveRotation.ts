import { useSettingsStore } from '@/state/settingsStore'
import { useMediaQuery } from '@/ui/useMediaQuery'

/** A partir de aqui la pista se muestra en horizontal por defecto. */
export const WIDE_QUERY = '(min-width: 721px)'

/**
 * Rotacion efectiva de la pista: 90 grados en pantallas grandes y 0 en movil,
 * salvo que el usuario haya fijado una manualmente.
 */
export function useEffectiveRotation(): 0 | 90 {
  const rotation = useSettingsStore((s) => s.rotation)
  const rotationAuto = useSettingsStore((s) => s.rotationAuto)
  const wide = useMediaQuery(WIDE_QUERY)
  if (!rotationAuto) return rotation
  return wide ? 90 : 0
}
