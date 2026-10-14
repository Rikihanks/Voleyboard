import { Group, Line, Rect } from 'react-konva'

import { COURT, toScreen, type Viewport } from '@/domain/court'
import type { CourtView } from '@/domain/types'

import type { CourtColors } from './courtTheme'

const LINE_WIDTH = 2
const NET_WIDTH = 3

interface CourtLayerProps {
  viewport: Viewport
  view: CourtView
  colors: CourtColors
}

/** Capa estatica: fondo, pista, lineas de ataque y red. */
export function CourtLayer({ viewport, view, colors }: CourtLayerProps) {
  const width = viewport.width
  const height = viewport.height
  if (width <= 0 || height <= 0) return null

  const screenX = (x: number, y: number) => toScreen({ x, y }, viewport)

  const topLeft = screenX(0, 0)
  const bottomRight = screenX(COURT.width, COURT.length)
  const left = Math.min(topLeft.x, bottomRight.x)
  const top = Math.min(topLeft.y, bottomRight.y)
  const courtWidth = Math.abs(bottomRight.x - topLeft.x)
  const courtHeight = Math.abs(bottomRight.y - topLeft.y)

  const hLine = (y: number) => {
    const a = screenX(0, y)
    const b = screenX(COURT.width, y)
    return [a.x, a.y, b.x, b.y]
  }

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={width} height={height} fill={colors.background} />
      {view !== 'blank' && (
        <>
          <Rect
            x={left}
            y={top}
            width={courtWidth}
            height={courtHeight}
            fill={colors.court}
            stroke={colors.lines}
            strokeWidth={LINE_WIDTH}
          />
          <Line
            points={hLine(COURT.netY - COURT.attackOffset)}
            stroke={colors.lines}
            strokeWidth={LINE_WIDTH}
          />
          <Line
            points={hLine(COURT.netY + COURT.attackOffset)}
            stroke={colors.lines}
            strokeWidth={LINE_WIDTH}
          />
          <Line
            points={hLine(COURT.netY)}
            stroke={colors.net}
            strokeWidth={NET_WIDTH}
            dash={[10, 6]}
          />
        </>
      )}
    </Group>
  )
}
