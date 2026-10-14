import { useEffect, useState } from 'react'

export interface Size {
  width: number
  height: number
}

/** Observa el tamano de un elemento mediante ResizeObserver. */
export function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    if (!element) return
    const update = (width: number, height: number) => {
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }
    update(element.clientWidth, element.clientHeight)
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) update(rect.width, rect.height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return { ref: setElement, size }
}
