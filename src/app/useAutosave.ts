import type Konva from 'konva'
import { useEffect, useRef, type RefObject } from 'react'

import { stageToThumbBlob } from '@/features/export/thumbnail'
import { boardsRepo, thumbsRepo } from '@/persistence/repositories'
import { useBoardStore } from '@/state/boardStore'

const AUTOSAVE_DELAY = 500

/**
 * Autoguarda 500 ms despues del ultimo cambio real y regenera la miniatura.
 * Al desmontar, vuelca el guardado pendiente en lugar de descartarlo.
 */
export function useAutosave(
  stageRef: RefObject<Konva.Stage | null>,
  onFirstSave?: (id: string) => void,
): void {
  const onFirstSaveRef = useRef(onFirstSave)
  useEffect(() => {
    onFirstSaveRef.current = onFirstSave
  }, [onFirstSave])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const initial = useBoardStore.getState().board
    let lastUpdated = initial.updatedAt
    let lastId = initial.id
    let dirty = false
    const savedIds = new Set<string>()

    const flush = async (notify: boolean) => {
      const current = useBoardStore.getState().board
      await boardsRepo.put(structuredClone(current))
      const blob = await stageToThumbBlob(stageRef.current)
      if (blob) await thumbsRepo.put(current.id, blob)
      if (notify && !savedIds.has(current.id)) {
        savedIds.add(current.id)
        onFirstSaveRef.current?.(current.id)
      }
    }

    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        dirty = false
        void flush(true)
      }, AUTOSAVE_DELAY)
    }

    const unsubscribe = useBoardStore.subscribe((state) => {
      const board = state.board
      if (board.updatedAt === lastUpdated && board.id === lastId) return
      lastUpdated = board.updatedAt
      lastId = board.id
      dirty = true
      schedule()
    })

    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
      if (dirty) void flush(false)
    }
  }, [stageRef])
}
