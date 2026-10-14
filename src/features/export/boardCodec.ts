/**
 * Codificacion de tableros para el fragmento de la URL.
 *
 * v2: formato binario compacto (varint + coordenadas en cm) con los trazos de
 * lapiz simplificados, luego deflate-raw y base64url. El payload empieza por
 * "2." para distinguirlo del formato antiguo.
 *
 * v1 (antiguo): JSON -> deflate-raw -> base64url, sin prefijo. Se sigue
 * decodificando para que los enlaces ya compartidos sigan abriendo.
 */
import { nanoid } from 'nanoid'

import { simplifyPath } from '@/domain/court'
import {
  DEFAULT_BOARD_SETTINGS,
  SCHEMA_VERSION,
  type Board,
  type BoardSettings,
  type CourtTheme,
  type CourtView,
  type Entity,
  type Frame,
  type LabelMode,
  type PlaybackSpeed,
  type PositionRole,
  type Stroke,
  type StrokeStyle,
  type Vec,
  type Zone,
} from '@/domain/types'
import { migrateBoard } from '@/persistence/migrations'

export const MAX_SHARE_URL_LENGTH = 2000
/** Tolerancia de simplificacion de trazos, en metros (7 cm). */
export const SHARE_SIMPLIFY_EPSILON = 0.07
const QUANT = 100

const KINDS = ['player', 'ball'] as const
const VIEWS: CourtView[] = ['full', 'half', 'blank']
const LABELS: LabelMode[] = ['number', 'name', 'position', 'none']
const THEMES: CourtTheme[] = ['blue', 'green', 'wood', 'neutral']
const DASHES: StrokeStyle['dash'][] = ['solid', 'dashed', 'dotted', 'dashdot']
const SHAPES: StrokeStyle['shape'][] = ['straight', 'curve']
const HEADS: StrokeStyle['head'][] = ['none', 'arrow']
const TOOLS: Stroke['tool'][] = ['pencil', 'line', 'text']
const ROLES: PositionRole[] = ['S', 'OH', 'MB', 'OPP', 'L', 'DS', 'OTHER']
const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2]
const NO_ROLE = 255

class Writer {
  private bytes: number[] = []

  u8(value: number): void {
    this.bytes.push(value & 0xff)
  }

  varint(value: number): void {
    let v = Math.max(0, Math.floor(value))
    while (v >= 0x80) {
      this.u8((v & 0x7f) | 0x80)
      v = Math.floor(v / 128)
    }
    this.u8(v)
  }

  signed(value: number): void {
    this.varint(value < 0 ? -value * 2 - 1 : value * 2)
  }

  str(value: string): void {
    const utf8 = new TextEncoder().encode(value)
    this.varint(utf8.length)
    for (const byte of utf8) this.u8(byte)
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes)
  }
}

class Reader {
  private pos = 0
  private readonly bytes: Uint8Array

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  u8(): number {
    if (this.pos >= this.bytes.length) throw new Error('payload truncado')
    const value = this.bytes[this.pos] as number
    this.pos += 1
    return value
  }

  varint(): number {
    let shift = 1
    let value = 0
    for (;;) {
      const byte = this.u8()
      value += (byte & 0x7f) * shift
      if ((byte & 0x80) === 0) break
      shift *= 128
    }
    return value
  }

  signed(): number {
    const value = this.varint()
    return value % 2 === 1 ? -(value + 1) / 2 : value / 2
  }

  str(): string {
    const length = this.varint()
    const slice = this.bytes.subarray(this.pos, this.pos + length)
    this.pos += length
    return new TextDecoder().decode(slice)
  }
}

function indexOf<T>(list: readonly T[], value: T, fallback = 0): number {
  const index = list.indexOf(value)
  return index === -1 ? fallback : index
}

function cm(meters: number): number {
  return Math.round(meters * QUANT)
}

function encodeV2Bytes(board: Board): Uint8Array {
  const w = new Writer()
  w.u8(2)
  w.str(board.title)
  w.u8(indexOf(VIEWS, board.view))
  w.u8(cm(board.settings.playerScale))
  w.u8(cm(board.settings.ballScale))
  w.u8(indexOf(LABELS, board.settings.labelMode))
  w.u8(indexOf(THEMES, board.settings.courtTheme))
  w.u8((board.settings.showGhost ? 1 : 0) | (board.settings.loop ? 2 : 0))
  w.u8(indexOf(SPEEDS, board.settings.speed))
  w.u8(board.teamId ? 1 : 0)
  if (board.teamId) w.str(board.teamId)

  w.varint(board.entities.length)
  for (const entity of board.entities) {
    w.u8(indexOf(KINDS, entity.kind))
    w.str(entity.label ?? '')
    w.u8(entity.zone ?? 0)
    w.u8(entity.role ? indexOf(ROLES, entity.role) : NO_ROLE)
    w.u8(entity.playerId ? 1 : 0)
    if (entity.playerId) w.str(entity.playerId)
    w.u8(entity.color ? 1 : 0)
    if (entity.color) w.str(entity.color)
  }

  w.varint(board.frames.length)
  for (const frame of board.frames) {
    w.varint(frame.durationMs)
    for (const entity of board.entities) {
      const position = frame.positions[entity.id]
      if (!position) {
        w.u8(0)
        continue
      }
      w.u8(1)
      w.signed(cm(position.x))
      w.signed(cm(position.y))
    }
    w.varint(frame.strokes.length)
    for (const stroke of frame.strokes) {
      w.u8(indexOf(TOOLS, stroke.tool))
      w.u8(indexOf(DASHES, stroke.style.dash))
      w.u8(indexOf(SHAPES, stroke.style.shape))
      w.u8(indexOf(HEADS, stroke.style.head))
      w.str(stroke.style.color)
      w.u8(cm(stroke.style.width))
      const points =
        stroke.tool === 'pencil'
          ? simplifyPath(stroke.points, SHARE_SIMPLIFY_EPSILON)
          : stroke.points
      w.varint(points.length)
      let prevX = 0
      let prevY = 0
      for (const point of points) {
        const x = cm(point.x)
        const y = cm(point.y)
        w.signed(x - prevX)
        w.signed(y - prevY)
        prevX = x
        prevY = y
      }
      if (stroke.tool === 'text') w.str(stroke.text ?? '')
    }
  }

  return w.toBytes()
}

function decodeV2Bytes(bytes: Uint8Array): Board {
  const r = new Reader(bytes)
  const version = r.u8()
  if (version !== 2) throw new Error('version no soportada')
  const title = r.str()
  const view = VIEWS[r.u8()] ?? 'full'
  const playerScale = r.u8() / QUANT
  const ballScale = r.u8() / QUANT
  const labelMode = LABELS[r.u8()] ?? DEFAULT_BOARD_SETTINGS.labelMode
  const courtTheme = THEMES[r.u8()] ?? DEFAULT_BOARD_SETTINGS.courtTheme
  const flags = r.u8()
  const speed = SPEEDS[r.u8()] ?? 1
  const settings: BoardSettings = {
    playerScale,
    ballScale,
    labelMode,
    courtTheme,
    showGhost: (flags & 1) !== 0,
    loop: (flags & 2) !== 0,
    speed,
  }
  const teamId = r.u8() ? r.str() : null

  const entityCount = r.varint()
  const entities: Entity[] = []
  for (let i = 0; i < entityCount; i += 1) {
    const kind = KINDS[r.u8()] ?? 'player'
    const label = r.str()
    const zone = r.u8()
    const roleIndex = r.u8()
    const playerId = r.u8() ? r.str() : undefined
    const color = r.u8() ? r.str() : undefined
    const entity: Entity = { id: nanoid(), kind }
    if (label) entity.label = label
    if (zone >= 1 && zone <= 6) entity.zone = zone as Zone
    if (roleIndex !== NO_ROLE) entity.role = ROLES[roleIndex]
    if (playerId) entity.playerId = playerId
    if (color) entity.color = color
    entities.push(entity)
  }

  const frameCount = r.varint()
  const frames: Frame[] = []
  for (let i = 0; i < frameCount; i += 1) {
    const durationMs = r.varint()
    const positions: Record<string, Vec> = {}
    for (const entity of entities) {
      if (r.u8() === 0) continue
      positions[entity.id] = { x: r.signed() / QUANT, y: r.signed() / QUANT }
    }
    const strokeCount = r.varint()
    const strokes: Stroke[] = []
    for (let s = 0; s < strokeCount; s += 1) {
      const tool = TOOLS[r.u8()] ?? 'pencil'
      const style: StrokeStyle = {
        dash: DASHES[r.u8()] ?? 'solid',
        shape: SHAPES[r.u8()] ?? 'straight',
        head: HEADS[r.u8()] ?? 'none',
        color: r.str(),
        width: r.u8() / QUANT,
      }
      const pointCount = r.varint()
      const points: Vec[] = []
      let x = 0
      let y = 0
      for (let p = 0; p < pointCount; p += 1) {
        x += r.signed()
        y += r.signed()
        points.push({ x: x / QUANT, y: y / QUANT })
      }
      const stroke: Stroke = { id: nanoid(), tool, points, style }
      if (tool === 'text') stroke.text = r.str()
      strokes.push(stroke)
    }
    frames.push({ id: nanoid(), positions, strokes, durationMs })
  }

  const now = Date.now()
  return {
    id: nanoid(),
    folderId: null,
    title,
    view,
    teamId,
    entities,
    frames,
    settings,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function deflateRaw(input: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') throw new Error('CompressionStream no disponible')
  const stream = new Blob([input as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function inflateRaw(input: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([input as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** v1 (antiguo): JSON + deflate-raw + base64url, sin prefijo. */
export async function encodeBoardV1(board: Board): Promise<string> {
  return toBase64Url(await deflateRaw(new TextEncoder().encode(JSON.stringify(board))))
}

/** Codifica con el formato compacto v2. */
export async function encodeBoardPayload(board: Board): Promise<string> {
  return `2.${toBase64Url(await deflateRaw(encodeV2Bytes(board)))}`
}

/** Decodifica v2 o v1 (enlaces antiguos). Devuelve null si no es valido. */
export async function decodeBoardPayload(payload: string): Promise<Board | null> {
  try {
    let board: Board
    if (payload.startsWith('2.')) {
      board = decodeV2Bytes(await inflateRaw(fromBase64Url(payload.slice(2))))
    } else {
      const json = await inflateRaw(fromBase64Url(payload))
      board = migrateBoard(JSON.parse(new TextDecoder().decode(json)))
    }
    // Zod se carga bajo demanda para no engordar el JavaScript inicial.
    const { boardSchema } = await import('@/persistence/schemas')
    boardSchema.parse(board)
    return board
  } catch {
    return null
  }
}

export function shareUrlFor(payload: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/s/${payload}`
}
