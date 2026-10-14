import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { clampZoom, panToKeepPoint, toCourt, type Viewport } from '@/domain/court'
import type { CourtView, Vec } from '@/domain/types'

import { useElementSize } from '@/ui/useElementSize'

export interface UseViewport {
  containerRef: (node: HTMLDivElement | null) => void
  size: { width: number; height: number }
  viewport: Viewport
  zoom: number
  pan: Vec
  zoomAt: (targetZoom: number, anchor?: Vec) => void
  zoomBy: (factor: number, anchor?: Vec) => void
  panBy: (delta: Vec) => void
  resetView: () => void
}

/** Gestiona zoom y desplazamiento del viewport (nunca tocan los datos). */
export function useViewport(view: CourtView, rotation: 0 | 90): UseViewport {
  const { ref, size } = useElementSize<HTMLDivElement>()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Vec>({ x: 0, y: 0 })

  const viewport = useMemo<Viewport>(
    () => ({ width: size.width, height: size.height, view, rotation, zoom, pan }),
    [size.width, size.height, view, rotation, zoom, pan],
  )
  const viewportRef = useRef(viewport)
  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  const zoomAt = useCallback((targetZoom: number, anchor?: Vec) => {
    const current = viewportRef.current
    const nextZoom = clampZoom(targetZoom)
    if (anchor && current.width > 0 && current.height > 0) {
      const courtPoint = toCourt(anchor, current)
      const nextPan = panToKeepPoint(courtPoint, anchor, { ...current, zoom: nextZoom })
      setPan(nextPan)
    }
    setZoom(nextZoom)
  }, [])

  const zoomBy = useCallback(
    (factor: number, anchor?: Vec) => {
      zoomAt(viewportRef.current.zoom * factor, anchor)
    },
    [zoomAt],
  )

  const panBy = useCallback((delta: Vec) => {
    setPan((prev) => ({ x: prev.x + delta.x, y: prev.y + delta.y }))
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  return { containerRef: ref, size, viewport, zoom, pan, zoomAt, zoomBy, panBy, resetView }
}
