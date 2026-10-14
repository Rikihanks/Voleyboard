import type Konva from 'konva'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Circle, Layer, Line, Stage } from 'react-konva'

import {
  distance,
  distancePointToPolyline,
  pieceDiameterPixels,
  strokePolyline,
  toCourt,
  toScreen,
  type Viewport,
} from '@/domain/court'
import { sampleAnimation } from '@/domain/animation'
import { ZONES, validateServeOverlap } from '@/domain/rotations'
import type { ID, Stroke, StrokeStyle, Vec, Zone } from '@/domain/types'
import { useBoardStore } from '@/state/boardStore'
import { usePlaybackStore } from '@/state/playbackStore'
import { useRotationStore } from '@/state/rotationStore'
import { useSettingsStore } from '@/state/settingsStore'
import { Icon } from '@/ui/Icon'
import { IconButton } from '@/ui/IconButton'
import { TextPromptDialog } from '@/ui/TextPromptDialog'

import { courtColors } from './courtTheme'
import { CourtLayer } from './CourtLayer'
import { EntityLayer } from './EntityLayer'
import { StrokesLayer } from './StrokesLayer'
import { useEffectiveRotation } from './useEffectiveRotation'
import { useViewport } from './useViewport'

/** Separacion minima entre muestras del lapiz, en metros. */
const PENCIL_MIN_STEP = 0.06
/** Tolerancia del borrador por trazo, en metros. */
const ERASER_TOLERANCE = 0.3

interface BoardCanvasProps {
  stageRef: RefObject<Konva.Stage | null>
}

interface PointerInfo {
  x: number
  y: number
}

interface GestureState {
  distance: number
  mid: Vec
}

export function BoardCanvas({ stageRef }: BoardCanvasProps) {
  const { t } = useTranslation()
  const board = useBoardStore((s) => s.board)
  const selection = useBoardStore((s) => s.selection)
  const tool = useBoardStore((s) => s.tool)
  const activeFrameIndex = useBoardStore((s) => s.activeFrameIndex)
  const selectedStrokeId = useBoardStore((s) => s.selectedStrokeId)
  const playing = usePlaybackStore((s) => s.playing)
  const playbackTime = usePlaybackStore((s) => s.time)
  const checking = useRotationStore((s) => s.checking)
  const rotation = useEffectiveRotation()
  const { containerRef, size, viewport, zoom, zoomBy, panBy, resetView } = useViewport(
    board.view,
    rotation,
  )
  const colors = courtColors(board.settings.courtTheme)

  const frame = board.frames[Math.min(activeFrameIndex, board.frames.length - 1)]
  const positions = frame?.positions ?? {}
  const strokes = frame?.strokes ?? []
  const selectedStroke = selectedStrokeId
    ? strokes.find((stroke) => stroke.id === selectedStrokeId)
    : undefined

  const playbackActive = playing || playbackTime > 0
  const displayPositions = playbackActive
    ? sampleAnimation(board.frames, playbackTime, { loop: board.settings.loop }).positions
    : positions
  const ghostPositions =
    board.settings.showGhost && !playbackActive && activeFrameIndex > 0
      ? (board.frames[activeFrameIndex - 1]?.positions ?? null)
      : null

  const violationData = (() => {
    if (!checking) return null
    const byZone: Partial<Record<Zone, ID>> = {}
    const zonePositions: Partial<Record<Zone, Vec>> = {}
    for (const entity of board.entities) {
      const position = displayPositions[entity.id]
      if (entity.zone && position) {
        byZone[entity.zone] = entity.id
        zonePositions[entity.zone] = position
      }
    }
    if (!ZONES.every((zone) => zonePositions[zone])) return null
    return {
      byZone,
      violations: validateServeOverlap(zonePositions as Record<Zone, Vec>),
    }
  })()

  const [draft, setDraft] = useState<Stroke | null>(null)
  const [textAt, setTextAt] = useState<Vec | null>(null)
  const draftRef = useRef<Stroke | null>(null)
  const drawingRef = useRef(false)
  const domRef = useRef<HTMLDivElement | null>(null)
  const pointersRef = useRef<Map<number, PointerInfo>>(new Map())
  const gestureRef = useRef<GestureState | null>(null)
  const gestureActiveRef = useRef(false)

  const viewportRef = useRef<Viewport>(viewport)
  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  const setContainer = useCallback(
    (node: HTMLDivElement | null) => {
      domRef.current = node
      containerRef(node)
    },
    [containerRef],
  )

  const clearDraft = useCallback(() => {
    drawingRef.current = false
    draftRef.current = null
    setDraft(null)
  }, [])

  const pointInContainer = useCallback((event: { clientX: number; clientY: number }): Vec => {
    const el = domRef.current
    if (!el) return { x: event.clientX, y: event.clientY }
    const rect = el.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }, [])

  // Gestos de dos dedos (zoom y desplazamiento) y rueda.
  useEffect(() => {
    const el = domRef.current
    if (!el) return

    const onPointerDown = (event: PointerEvent) => {
      pointersRef.current.set(event.pointerId, pointInContainer(event))
      if (pointersRef.current.size === 2) {
        const [a, b] = Array.from(pointersRef.current.values()) as [Vec, Vec]
        gestureRef.current = {
          distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        }
        gestureActiveRef.current = true
        clearDraft()
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) return
      pointersRef.current.set(event.pointerId, pointInContainer(event))
      const gesture = gestureRef.current
      if (!gesture || pointersRef.current.size < 2) return
      const [a, b] = Array.from(pointersRef.current.values()) as [Vec, Vec]
      const distanceNow = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
      const mid: Vec = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      panBy({ x: mid.x - gesture.mid.x, y: mid.y - gesture.mid.y })
      zoomBy(distanceNow / gesture.distance, mid)
      gesture.distance = distanceNow
      gesture.mid = mid
      if (event.cancelable) event.preventDefault()
    }

    const onPointerUp = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId)
      if (pointersRef.current.size < 2) {
        gestureRef.current = null
        gestureActiveRef.current = false
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const anchor = pointInContainer(event)
      zoomBy(Math.exp(-event.deltaY * 0.0015), anchor)
    }

    el.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown, { capture: true })
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [clearDraft, panBy, pointInContainer, zoomBy])

  const styleFromSettings = useCallback((): StrokeStyle => {
    const { strokeColor, strokeWidth, lineDash, lineShape, lineHead } = useSettingsStore.getState()
    return {
      dash: lineDash,
      shape: lineShape,
      head: lineHead,
      color: strokeColor,
      width: strokeWidth,
    }
  }, [])

  const pointForStage = useCallback((stage: Konva.Stage): Vec | null => {
    const pos = stage.getPointerPosition()
    if (!pos) return null
    return toCourt(pos, viewportRef.current)
  }, [])

  const eraseAt = useCallback((point: Vec) => {
    const store = useBoardStore.getState()
    const active = store.board.frames[store.activeFrameIndex] ?? store.board.frames[0]
    if (!active) return
    let bestId: ID | null = null
    let bestDistance = ERASER_TOLERANCE
    for (const stroke of active.strokes) {
      const d = distancePointToPolyline(point, stroke.points)
      if (d < bestDistance) {
        bestDistance = d
        bestId = stroke.id
      }
    }
    if (bestId) store.removeStroke(bestId)
  }, [])

  const strokeAt = useCallback((point: Vec): ID | null => {
    const store = useBoardStore.getState()
    const active = store.board.frames[store.activeFrameIndex] ?? store.board.frames[0]
    if (!active) return null
    let bestId: ID | null = null
    let bestDistance = 0.35
    for (const stroke of active.strokes) {
      const anchor = stroke.points[0]
      const d =
        stroke.tool === 'text' && anchor
          ? distance(point, anchor)
          : distancePointToPolyline(point, strokePolyline(stroke.points, stroke.style.shape))
      if (d < bestDistance) {
        bestDistance = d
        bestId = stroke.id
      }
    }
    return bestId
  }, [])

  const handlePointerDown = (event: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = event.target.getStage()
    if (!stage) return
    if (gestureActiveRef.current) return
    if (usePlaybackStore.getState().playing) usePlaybackStore.getState().stop()
    const button = event.evt.button
    if (typeof button === 'number' && button !== 0) return

    const { tool: currentTool } = useBoardStore.getState()
    if (currentTool === 'select') {
      if (event.target === stage) {
        const selectPoint = pointForStage(stage)
        const hit = selectPoint ? strokeAt(selectPoint) : null
        if (hit) useBoardStore.getState().selectStroke(hit)
        else useBoardStore.getState().clearSelection()
      }
      return
    }

    const point = pointForStage(stage)
    if (!point) return

    if (currentTool === 'eraser') {
      eraseAt(point)
      return
    }

    if (currentTool === 'text') {
      setTextAt(point)
      return
    }

    const style = styleFromSettings()
    const stroke: Stroke =
      currentTool === 'pencil'
        ? { id: nanoid(), tool: 'pencil', points: [point], style }
        : {
            id: nanoid(),
            tool: 'line',
            points: style.shape === 'curve' ? [point, point, point] : [point, point],
            style,
          }
    drawingRef.current = true
    draftRef.current = stroke
    setDraft(stroke)
  }

  const handlePointerMove = useCallback(
    (event: Konva.KonvaEventObject<PointerEvent>) => {
      if (!drawingRef.current || !draftRef.current) return
      if (gestureActiveRef.current) {
        clearDraft()
        return
      }
      const stage = event.target.getStage()
      if (!stage) return
      const point = pointForStage(stage)
      if (!point) return
      const current = draftRef.current
      if (current.tool === 'pencil') {
        const last = current.points[current.points.length - 1]
        if (last && distance(last, point) < PENCIL_MIN_STEP) return
        const next: Stroke = { ...current, points: [...current.points, point] }
        draftRef.current = next
        setDraft(next)
      } else {
        const start = current.points[0] as Vec
        const next: Stroke =
          current.points.length >= 3
            ? {
                ...current,
                points: [start, { x: (start.x + point.x) / 2, y: (start.y + point.y) / 2 }, point],
              }
            : { ...current, points: [start, point] }
        draftRef.current = next
        setDraft(next)
      }
    },
    [clearDraft, pointForStage],
  )

  const handlePointerUp = useCallback(() => {
    if (gestureActiveRef.current) return
    const current = draftRef.current
    drawingRef.current = false
    draftRef.current = null
    setDraft(null)
    if (!current) return
    const store = useBoardStore.getState()
    if (current.tool === 'pencil') {
      if (current.points.length >= 2) store.addStroke(current)
    } else {
      const start = current.points[0] as Vec
      const end = current.points[current.points.length - 1] as Vec
      if (distance(start, end) > 0.01) store.addStroke(current)
    }
  }, [])

  const handleSelect = useCallback((id: ID) => {
    useBoardStore.getState().select([id])
  }, [])

  const handleRequestLabelEdit = useCallback((id: ID) => {
    useBoardStore.getState().requestLabelEdit(id)
  }, [])

  const handleDragStart = useCallback(() => {
    useBoardStore.getState().beginInteraction()
  }, [])

  const handleDragEnd = useCallback((id: ID, position: Vec) => {
    const store = useBoardStore.getState()
    const board = store.board
    const frameIndex = Math.min(store.activeFrameIndex, board.frames.length - 1)
    const snapshot = store.interactionSnapshot
    const dragged = board.entities.find((entity) => entity.id === id)

    // RF-3.4: soltar un jugador encima de otro los intercambia (sustitucion).
    if (dragged?.kind === 'player' && snapshot) {
      const original = snapshot.frames[frameIndex]?.positions[id]
      if (original) {
        let targetId: ID | null = null
        let best = 0.6
        for (const entity of board.entities) {
          if (entity.id === id || entity.kind !== 'player') continue
          const candidate = board.frames[frameIndex]?.positions[entity.id]
          if (!candidate) continue
          const d = distance(position, candidate)
          if (d < best) {
            best = d
            targetId = entity.id
          }
        }
        const targetPos = targetId ? board.frames[frameIndex]?.positions[targetId] : undefined
        if (targetId && targetPos) {
          store.moveEntity(id, targetPos)
          store.moveEntity(targetId, original)
          store.endInteraction()
          return
        }
      }
    }

    store.moveEntity(id, position)
    store.endInteraction()
  }, [])

  const cursor = tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair'

  return (
    <>
      <div
        ref={setContainer}
        className="board-canvas"
        style={{ cursor }}
        role="application"
        aria-label={t('a11y.board')}
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <Layer listening={false}>
            <CourtLayer viewport={viewport} view={board.view} colors={colors} />
          </Layer>
          <Layer listening={false}>
            <StrokesLayer
              viewport={viewport}
              strokes={strokes}
              draft={draft}
              selectedStrokeId={selectedStrokeId}
            />
          </Layer>
          <Layer>
            {ghostPositions && (
              <EntityLayer
                board={board}
                positions={ghostPositions}
                selection={[]}
                tool="select"
                viewport={viewport}
                accent={colors.accent}
                ghost
                onSelect={() => {}}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                onRequestLabelEdit={() => {}}
              />
            )}
            <EntityLayer
              board={board}
              positions={displayPositions}
              selection={selection}
              tool={tool}
              viewport={viewport}
              accent={colors.accent}
              onSelect={handleSelect}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onRequestLabelEdit={handleRequestLabelEdit}
            />
          </Layer>
          <Layer>
            {!playbackActive &&
              selectedStroke?.tool === 'line' &&
              selectedStroke.points.map((point, index) => {
                const screen = toScreen(point, viewport)
                return (
                  <Circle
                    key={index}
                    x={screen.x}
                    y={screen.y}
                    radius={8}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth={2}
                    draggable
                    onDragStart={handleDragStart}
                    onDragMove={(event) => {
                      const courtPoint = toCourt(
                        { x: event.target.x(), y: event.target.y() },
                        viewport,
                      )
                      const next = selectedStroke.points.map((p, i) =>
                        i === index ? courtPoint : p,
                      )
                      useBoardStore.getState().updateStrokePoints(selectedStroke.id, next)
                    }}
                    onDragEnd={() => useBoardStore.getState().endInteraction()}
                  />
                )
              })}
          </Layer>
          {violationData && (
            <Layer listening={false}>
              {violationData.violations.map((violation, i) => {
                const a = violationData.byZone[violation.zones[0]]
                const b = violationData.byZone[violation.zones[1]]
                const pa = a ? displayPositions[a] : undefined
                const pb = b ? displayPositions[b] : undefined
                if (!pa || !pb) return null
                const sa = toScreen(pa, viewport)
                const sb = toScreen(pb, viewport)
                return (
                  <Line
                    key={`${violation.rule}-${i}`}
                    points={[sa.x, sa.y, sb.x, sb.y]}
                    stroke="#ef4444"
                    strokeWidth={3}
                    dash={[8, 6]}
                  />
                )
              })}
              {Array.from(new Set(violationData.violations.flatMap((v) => v.zones))).map((zone) => {
                const id = violationData.byZone[zone]
                const position = id ? displayPositions[id] : undefined
                if (!position) return null
                const screen = toScreen(position, viewport)
                const radius =
                  pieceDiameterPixels('player', board.settings.playerScale, viewport) / 2 + 6
                return (
                  <Circle
                    key={`ring-${zone}`}
                    x={screen.x}
                    y={screen.y}
                    radius={radius}
                    stroke="#ef4444"
                    strokeWidth={3}
                  />
                )
              })}
            </Layer>
          )}
        </Stage>
      </div>
      <div className="zoom-controls" role="group" aria-label={t('board.zoom')}>
        <IconButton label={t('board.zoomOut')} onClick={() => zoomBy(1 / 1.25)}>
          <Icon name="minus" />
        </IconButton>
        <span className="zoom-value" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <IconButton label={t('board.zoomIn')} onClick={() => zoomBy(1.25)}>
          <Icon name="plus" />
        </IconButton>
        <IconButton label={t('board.zoomReset')} onClick={resetView}>
          <Icon name="fit" />
        </IconButton>
      </div>
      <TextPromptDialog
        open={textAt !== null}
        title={t('toolbar.text')}
        label={t('toolbar.text')}
        initialValue=""
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onConfirm={(value) => {
          if (value.trim() && textAt) {
            useBoardStore.getState().addStroke({
              id: nanoid(),
              tool: 'text',
              points: [textAt],
              style: styleFromSettings(),
              text: value.trim(),
            })
          }
          setTextAt(null)
        }}
        onCancel={() => setTextAt(null)}
      />
    </>
  )
}
