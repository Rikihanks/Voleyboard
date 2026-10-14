import { useEffect, type ReactNode } from 'react'

import { Icon } from './Icon'
import { IconButton } from './IconButton'

export interface BottomSheetProps {
  open: boolean
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}

/** Panel inferior deslizante, pensado para moviles. */
export function BottomSheet({ open, title, closeLabel, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sheet-header">
          <span className="sheet-handle" aria-hidden="true" />
          <h2>{title}</h2>
          <IconButton label={closeLabel} onClick={onClose}>
            <Icon name="close" />
          </IconButton>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
