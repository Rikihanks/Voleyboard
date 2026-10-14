/**
 * Tipos del modelo de datos. Esta es la unica fuente de verdad del formato.
 *
 * Toda posicion se guarda en metros de pista. La conversion a pixeles ocurre
 * solo en features/board. Este modulo no importa React, Konva ni el DOM.
 */

/** Identificador unico (nanoid). */
export type ID = string

/** Vista de pista: completa, media pista o en blanco. */
export type CourtView = 'full' | 'half' | 'blank'

/** Zona del reglamento (1 a 6). */
export type Zone = 1 | 2 | 3 | 4 | 5 | 6

/** Roles de posicion. 'OTHER' para jugadores sin rol definido. */
export type PositionRole = 'S' | 'OH' | 'MB' | 'OPP' | 'L' | 'DS' | 'OTHER'

/**
 * Vector en metros de pista.
 * x: 0 a 9 (ancho, de izquierda a derecha mirando la red desde el fondo propio).
 * y: 0 a 18 (largo); la red esta en y = 9. Se admiten valores fuera de la pista.
 */
export interface Vec {
  x: number
  y: number
}

/** Pieza presente en la pizarra. */
export interface Entity {
  id: ID
  kind: 'player' | 'ball'
  /** Referencia a Team.players cuando kind = 'player'. */
  playerId?: ID
  /** Texto libre si no hay playerId. */
  label?: string
  /** Sobrescribe el color del equipo. */
  color?: string
  /** Zona que ocupa, si viene de una plantilla de rotacion. */
  zone?: Zone
  /** Rol de posicion, si viene de una plantilla de rotacion. */
  role?: PositionRole
}

export type DashPattern = 'solid' | 'dashed' | 'dotted' | 'dashdot'
export type LineShape = 'straight' | 'curve'
export type LineHead = 'none' | 'arrow'

export interface StrokeStyle {
  dash: DashPattern
  /** Solo para tool = 'line'. */
  shape: LineShape
  head: LineHead
  color: string
  /** Grosor en metros. */
  width: number
}

export interface Stroke {
  id: ID
  tool: 'pencil' | 'line' | 'text'
  /** pencil: muestras; line: 2 extremos (+1 punto de control si es curva); text: 1 ancla. */
  points: Vec[]
  style: StrokeStyle
  /** Texto de una nota corta (solo tool = 'text'). */
  text?: string
}

/** Fotograma: posiciones de cada pieza y trazos dibujados. */
export interface Frame {
  id: ID
  /** entityId -> posicion. */
  positions: Record<ID, Vec>
  strokes: Stroke[]
  /** Tiempo hasta el siguiente fotograma, en ms. */
  durationMs: number
}

export type LabelMode = 'number' | 'name' | 'position' | 'none'
export type CourtTheme = 'blue' | 'green' | 'wood' | 'neutral'
export type PlaybackSpeed = 0.5 | 1 | 2

export interface BoardSettings {
  /** 0.5 a 2. */
  playerScale: number
  /** 0.5 a 2. */
  ballScale: number
  labelMode: LabelMode
  courtTheme: CourtTheme
  /** Fotograma anterior en transparencia. */
  showGhost: boolean
  loop: boolean
  speed: PlaybackSpeed
}

export interface Board {
  id: ID
  folderId: ID | null
  title: string
  view: CourtView
  teamId: ID | null
  /** Piezas presentes en la pizarra. */
  entities: Entity[]
  /** Al menos 1. */
  frames: Frame[]
  settings: BoardSettings
  /** epoch ms */
  createdAt: number
  updatedAt: number
  schemaVersion: number
}

export interface Player {
  id: ID
  name: string
  /** 0 a 99. */
  number: number
  position: PositionRole
}

export interface Team {
  id: ID
  name: string
  color: string
  players: Player[]
  updatedAt: number
}

export interface Folder {
  id: ID
  name: string
  parentId: ID | null
  order: number
}

/** Copia de seguridad completa de la biblioteca. */
export interface BackupFile {
  app: 'voleyboard'
  formatVersion: number
  /** epoch ms */
  exportedAt: number
  folders: Folder[]
  teams: Team[]
  boards: Board[]
}

/** Limites por tablero y por equipo. Constantes ajustables. */
export const LIMITS = {
  playersPerBoard: 20,
  ballsPerBoard: 5,
  framesPerBoard: 50,
  playersPerTeam: 20,
  historySteps: 200,
  folderDepth: 3,
} as const

/** Duracion por fotograma: minimo, por defecto y maximo (ms). */
export const FRAME_DURATION = {
  min: 500,
  default: 1000,
  max: 5000,
} as const

export const SCHEMA_VERSION = 1
export const BACKUP_FORMAT_VERSION = 1

/** Ajustes por defecto de un tablero nuevo. */
export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  playerScale: 1,
  ballScale: 1,
  labelMode: 'number',
  courtTheme: 'blue',
  showGhost: false,
  loop: false,
  speed: 1,
}

/** Paleta por defecto para equipos y piezas sin color. */
export const DEFAULT_TEAM_COLOR = '#e11d48'
export const DEFAULT_BALL_COLOR = '#f59e0b'
