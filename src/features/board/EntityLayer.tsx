import type Konva from 'konva'
import { Circle, Group, Text } from 'react-konva'

import { pieceDiameterPixels, toCourt, toScreen, type Viewport } from '@/domain/court'
import {
  DEFAULT_BALL_COLOR,
  DEFAULT_TEAM_COLOR,
  type Board,
  type Entity,
  type ID,
  type Vec,
} from '@/domain/types'

interface EntityLayerProps {
  board: Board
  positions: Record<ID, Vec>
  selection: ID[]
  tool: string
  viewport: Viewport
  accent: string
  ghost?: boolean
  onSelect: (id: ID) => void
  onDragStart: () => void
  onDragEnd: (id: ID, position: Vec) => void
  onRequestLabelEdit: (id: ID) => void
}

export function EntityLayer({
  board,
  positions,
  selection,
  tool,
  viewport,
  accent,
  ghost = false,
  onSelect,
  onDragStart,
  onDragEnd,
  onRequestLabelEdit,
}: EntityLayerProps) {
  const interactive = tool === 'select' && !ghost
  const { settings } = board

  return (
    <>
      {board.entities.map((entity) => {
        const position = positions[entity.id]
        if (!position) return null
        const screen = toScreen(position, viewport)
        const diameter = pieceDiameterPixels(
          entity.kind,
          entity.kind === 'player' ? settings.playerScale : settings.ballScale,
          viewport,
        )
        const radius = diameter / 2
        const selected = selection.includes(entity.id)
        const fill =
          entity.color ?? (entity.kind === 'player' ? DEFAULT_TEAM_COLOR : DEFAULT_BALL_COLOR)
        const label =
          settings.labelMode === 'none'
            ? null
            : settings.labelMode === 'position'
              ? (entity.role ?? entity.label ?? null)
              : (entity.label ?? null)

        return (
          <Group
            key={entity.id}
            x={screen.x}
            y={screen.y}
            opacity={ghost ? 0.35 : 1}
            draggable={interactive}
            listening={interactive}
            onPointerDown={() => onSelect(entity.id)}
            onDblClick={() => onRequestLabelEdit(entity.id)}
            onDblTap={() => onRequestLabelEdit(entity.id)}
            onDragStart={onDragStart}
            onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) => {
              const node = event.target
              onDragEnd(entity.id, toCourt({ x: node.x(), y: node.y() }, viewport))
            }}
          >
            {selected && !ghost && (
              <Circle radius={radius + 5} stroke={accent} strokeWidth={3} listening={false} />
            )}
            <EntityShape entity={entity} radius={radius} fill={fill} />
            {label && entity.kind === 'player' && (
              <Text
                text={label}
                width={diameter}
                height={diameter}
                offsetX={radius}
                offsetY={radius}
                align="center"
                verticalAlign="middle"
                fontSize={Math.max(8, Math.min(48, diameter * 0.5))}
                fontStyle="bold"
                fill="#ffffff"
                listening={false}
              />
            )}
          </Group>
        )
      })}
    </>
  )
}

function EntityShape({ entity, radius, fill }: { entity: Entity; radius: number; fill: string }) {
  if (entity.kind === 'ball') {
    return (
      <>
        <Circle
          radius={radius}
          fill={fill}
          stroke="#ffffff"
          strokeWidth={Math.max(1, radius * 0.12)}
        />
        <Circle
          radius={radius * 0.5}
          stroke="#ffffff"
          strokeWidth={Math.max(1, radius * 0.14)}
          listening={false}
        />
      </>
    )
  }
  return (
    <Circle
      radius={radius}
      fill={fill}
      stroke="#ffffff"
      strokeWidth={Math.max(1.5, radius * 0.1)}
    />
  )
}
