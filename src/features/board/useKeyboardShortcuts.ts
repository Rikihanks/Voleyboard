import { useEffect } from 'react'

import { useBoardStore } from '@/state/boardStore'

/** Atajos de teclado de la pizarra (deshacer, rehacer, borrar y mover). */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const store = useBoardStore.getState()
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (mod && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) store.redo()
        else store.undo()
        return
      }
      if (mod && key === 'y') {
        event.preventDefault()
        store.redo()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && store.selection.length > 0) {
        event.preventDefault()
        store.removeSelected()
        return
      }
      if (store.selection.length === 0) return
      const step = event.shiftKey ? 0.5 : 0.1
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          store.nudgeSelection({ x: -step, y: 0 })
          break
        case 'ArrowRight':
          event.preventDefault()
          store.nudgeSelection({ x: step, y: 0 })
          break
        case 'ArrowUp':
          event.preventDefault()
          store.nudgeSelection({ x: 0, y: -step })
          break
        case 'ArrowDown':
          event.preventDefault()
          store.nudgeSelection({ x: 0, y: step })
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
