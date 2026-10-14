import { Arrow, Line, Text } from 'react-konva'

import { scaleForView, strokePolyline, toScreen, type Viewport } from '@/domain/court'
import type { DashPattern, Stroke } from '@/domain/types'

interface StrokesLayerProps {
  viewport: Viewport
  strokes: Stroke[]
  draft?: Stroke | null
  selectedStrokeId?: string | null
}

function dashFor(pattern: DashPattern, widthPx: number): number[] | undefined {
  switch (pattern) {
    case 'dashed':
      return [widthPx * 3, widthPx * 2]
    case 'dotted':
      return [widthPx * 0.1, widthPx * 2]
    case 'dashdot':
      return [widthPx * 3, widthPx * 2, widthPx * 0.1, widthPx * 2]
    case 'solid':
    default:
      return undefined
  }
}

function flatten(points: { x: number; y: number }[], viewport: Viewport): number[] {
  const flat: number[] = []
  for (const point of points) {
    const screen = toScreen(point, viewport)
    flat.push(screen.x, screen.y)
  }
  return flat
}

export function StrokesLayer({ viewport, strokes, draft, selectedStrokeId }: StrokesLayerProps) {
  const scale = scaleForView(viewport)
  const all = draft ? [...strokes, draft] : strokes

  return (
    <>
      {all.map((stroke) => {
        if (stroke.tool === 'text') {
          const anchor = stroke.points[0]
          if (!anchor) return null
          const screen = toScreen(anchor, viewport)
          return (
            <Text
              key={stroke.id}
              text={stroke.text ?? ''}
              x={screen.x}
              y={screen.y}
              fontSize={Math.max(10, stroke.style.width * 3 * scale)}
              fontStyle="bold"
              fill={stroke.style.color}
            />
          )
        }

        const widthPx = Math.max(1, stroke.style.width * scale)
        const polyline = strokePolyline(stroke.points, stroke.style.shape)
        const flat = flatten(polyline, viewport)
        const props = {
          points: flat,
          stroke: stroke.style.color,
          strokeWidth: widthPx,
          dash: dashFor(stroke.style.dash, widthPx),
          lineCap: 'round' as const,
          lineJoin: 'round' as const,
        }

        if (stroke.tool === 'line' && stroke.style.head === 'arrow') {
          return (
            <Arrow
              key={stroke.id}
              {...props}
              pointerLength={Math.max(8, widthPx * 3)}
              pointerWidth={Math.max(8, widthPx * 3)}
              fill={stroke.style.color}
            />
          )
        }

        return (
          <Line
            key={stroke.id}
            {...props}
            shadowEnabled={selectedStrokeId === stroke.id}
            shadowColor="#f59e0b"
            shadowBlur={8}
            shadowOpacity={0.9}
          />
        )
      })}
    </>
  )
}
