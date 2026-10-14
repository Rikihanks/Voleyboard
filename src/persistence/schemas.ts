import { z } from 'zod'

/** Esquemas Zod del modelo de datos. Validan los JSON importados antes de
 *  tocar la base de datos. Los tipos de domain/types.ts siguen siendo la
 *  fuente de verdad del formato. */

export const vecSchema = z.object({ x: z.number(), y: z.number() })

export const zoneSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])

export const entitySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['player', 'ball']),
  playerId: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
  zone: zoneSchema.optional(),
  role: z.enum(['S', 'OH', 'MB', 'OPP', 'L', 'DS', 'OTHER']).optional(),
})

export const strokeStyleSchema = z.object({
  dash: z.enum(['solid', 'dashed', 'dotted', 'dashdot']),
  shape: z.enum(['straight', 'curve']),
  head: z.enum(['none', 'arrow']),
  color: z.string(),
  width: z.number(),
})

export const strokeSchema = z.object({
  id: z.string().min(1),
  tool: z.enum(['pencil', 'line', 'text']),
  points: z.array(vecSchema),
  style: strokeStyleSchema,
  text: z.string().optional(),
})

export const frameSchema = z.object({
  id: z.string().min(1),
  positions: z.record(z.string(), vecSchema),
  strokes: z.array(strokeSchema),
  durationMs: z.number(),
})

export const boardSettingsSchema = z.object({
  playerScale: z.number(),
  ballScale: z.number(),
  labelMode: z.enum(['number', 'name', 'position', 'none']),
  courtTheme: z.enum(['blue', 'green', 'wood', 'neutral']),
  showGhost: z.boolean(),
  loop: z.boolean(),
  speed: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
})

export const boardSchema = z.object({
  id: z.string().min(1),
  folderId: z.string().nullable(),
  title: z.string(),
  view: z.enum(['full', 'half', 'blank']),
  teamId: z.string().nullable(),
  entities: z.array(entitySchema),
  frames: z.array(frameSchema).min(1),
  settings: boardSettingsSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  schemaVersion: z.number(),
})

export const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  number: z.number(),
  position: z.enum(['S', 'OH', 'MB', 'OPP', 'L', 'DS', 'OTHER']),
})

export const teamSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  color: z.string(),
  players: z.array(playerSchema),
  updatedAt: z.number(),
})

export const folderSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  parentId: z.string().nullable(),
  order: z.number(),
})

export const backupFileSchema = z.object({
  app: z.literal('voleyboard'),
  formatVersion: z.number(),
  exportedAt: z.number(),
  folders: z.array(folderSchema),
  teams: z.array(teamSchema),
  boards: z.array(boardSchema),
})
