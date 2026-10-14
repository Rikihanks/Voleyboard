import { produce } from 'immer'
import { nanoid } from 'nanoid'
import { create } from 'zustand'

import { clampToPieceRange, ZONE_DEFAULTS, benchPosition } from '@/domain/court'
import { clampFrameDuration } from '@/domain/animation'
import type { RotationTemplate } from '@/domain/rotations'
import {
  LIMITS,
  type Board,
  type BoardSettings,
  type CourtView,
  type ID,
  type Stroke,
  type Team,
  type Vec,
  type Zone,
} from '@/domain/types'
import {
  createBallEntity,
  createEmptyBoard,
  createPlayerEntity,
  defaultBallPosition,
  defaultPlayerPosition,
} from './boardFactory'
export type Tool = 'select' | 'pencil' | 'line' | 'eraser' | 'text'

interface BoardStore {
  board: Board
  past: Board[]
  future: Board[]
  selection: ID[]
  tool: Tool
  activeFrameIndex: number
  /** Instantanea guardada al empezar una interaccion (arrastre, trazo). */
  interactionSnapshot: Board | null
  /** Peticion de editar la etiqueta de una pieza (doble toque). */
  labelEditRequest: ID | null
  /** Trazo de linea seleccionado para ajustar sus puntos. */
  selectedStrokeId: ID | null

  setTool: (tool: Tool) => void
  select: (ids: ID[]) => void
  toggleSelect: (id: ID) => void
  clearSelection: () => void
  selectStroke: (id: ID | null) => void
  updateStrokePoints: (id: ID, points: Vec[]) => void
  requestLabelEdit: (id: ID) => void
  clearLabelEdit: () => void
  setActiveFrameIndex: (index: number) => void
  addFrame: (copyStrokes: boolean) => void
  duplicateFrame: (index: number, copyStrokes: boolean) => void
  deleteFrame: (index: number) => void
  moveFrame: (from: number, to: number) => void
  setFrameDuration: (index: number, durationMs: number) => void

  beginInteraction: () => void
  endInteraction: () => void
  undo: () => void
  redo: () => void

  addPlayer: () => ID | null
  addBall: () => ID | null
  removeEntity: (id: ID) => void
  removeSelected: () => void
  moveEntity: (id: ID, pos: Vec) => void
  nudgeSelection: (delta: Vec) => void
  setEntityLabel: (id: ID, label: string) => void
  setEntityColor: (id: ID, color: string) => void
  setEntityZone: (id: ID, zone: Zone | undefined) => void
  setBoardTitle: (title: string) => void
  setTeamId: (teamId: ID | null) => void
  swapPositions: (a: ID, b: ID) => void
  addTeamToBoard: (team: Team) => void
  applyRotation: (template: RotationTemplate) => void

  setView: (view: CourtView) => void
  updateSettings: (patch: Partial<BoardSettings>) => void
  clearBoard: () => void

  addStroke: (stroke: Stroke) => void
  removeStroke: (strokeId: ID) => void

  loadBoard: (board: Board) => void
}

function capPast(past: Board[], limit: number = LIMITS.historySteps): Board[] {
  return past.length > limit ? past.slice(past.length - limit) : past
}

function boardsEqual(a: Board, b: Board): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export const useBoardStore = create<BoardStore>()((set, get) => {
  const pushSnapshot = (snapshot: Board): boolean => {
    if (boardsEqual(snapshot, get().board)) return false
    set((s) => ({
      past: capPast([...s.past, snapshot]),
      future: [],
      board: { ...s.board, updatedAt: Date.now() },
    }))
    return true
  }

  const mutate = (recipe: (draft: Board) => void): void => {
    set((s) => ({ board: produce(s.board, recipe) }))
  }

  const commit = (recipe: (draft: Board) => void): void => {
    const before = structuredClone(get().board)
    mutate(recipe)
    pushSnapshot(before)
  }

  const activeFrame = (board: Board) =>
    board.frames[Math.min(get().activeFrameIndex, board.frames.length - 1)]

  return {
    board: createEmptyBoard(),
    past: [],
    future: [],
    selection: [],
    tool: 'select',
    activeFrameIndex: 0,
    interactionSnapshot: null,
    labelEditRequest: null,
    selectedStrokeId: null,

    setTool: (tool) => set({ tool, selection: [], selectedStrokeId: null }),
    select: (ids) => set({ selection: ids, selectedStrokeId: null }),
    toggleSelect: (id) =>
      set((s) => ({
        selection: s.selection.includes(id)
          ? s.selection.filter((x) => x !== id)
          : [...s.selection, id],
        selectedStrokeId: null,
      })),
    clearSelection: () => set({ selection: [], selectedStrokeId: null }),
    selectStroke: (id) => set({ selectedStrokeId: id, selection: [] }),
    updateStrokePoints: (id, points) =>
      mutate((b) => {
        const frame = activeFrame(b)
        const stroke = frame?.strokes.find((s) => s.id === id)
        if (stroke) stroke.points = points
      }),
    requestLabelEdit: (id) => set({ labelEditRequest: id, selection: [id] }),
    clearLabelEdit: () => set({ labelEditRequest: null }),
    setActiveFrameIndex: (index) =>
      set((s) => ({ activeFrameIndex: Math.min(Math.max(0, index), s.board.frames.length - 1) })),

    addFrame: (copyStrokes) => {
      const board = get().board
      const index = Math.min(get().activeFrameIndex, board.frames.length - 1)
      const source = board.frames[index]
      if (!source) return
      const frame = {
        id: nanoid(),
        positions: structuredClone(source.positions),
        strokes: copyStrokes ? structuredClone(source.strokes) : [],
        durationMs: source.durationMs,
      }
      commit((b) => {
        b.frames.splice(index + 1, 0, frame)
      })
      set((s) => ({ activeFrameIndex: Math.min(index + 1, s.board.frames.length - 1) }))
    },

    duplicateFrame: (index, copyStrokes) => {
      const source = get().board.frames[index]
      if (!source) return
      const frame = {
        id: nanoid(),
        positions: structuredClone(source.positions),
        strokes: copyStrokes ? structuredClone(source.strokes) : [],
        durationMs: source.durationMs,
      }
      commit((b) => {
        b.frames.splice(index + 1, 0, frame)
      })
      set((s) => ({ activeFrameIndex: Math.min(index + 1, s.board.frames.length - 1) }))
    },

    deleteFrame: (index) => {
      if (get().board.frames.length <= 1) return
      commit((b) => {
        if (b.frames.length <= 1) return
        b.frames.splice(index, 1)
      })
      set((s) => ({ activeFrameIndex: Math.min(s.activeFrameIndex, s.board.frames.length - 1) }))
    },

    moveFrame: (from, to) =>
      commit((b) => {
        if (from === to || from < 0 || to < 0) return
        if (from >= b.frames.length || to >= b.frames.length) return
        const [frame] = b.frames.splice(from, 1)
        if (frame) b.frames.splice(to, 0, frame)
      }),

    setFrameDuration: (index, durationMs) =>
      commit((b) => {
        const frame = b.frames[index]
        if (frame) frame.durationMs = clampFrameDuration(durationMs)
      }),

    beginInteraction: () => set({ interactionSnapshot: structuredClone(get().board) }),
    endInteraction: () => {
      const snapshot = get().interactionSnapshot
      set({ interactionSnapshot: null })
      if (snapshot) pushSnapshot(snapshot)
    },

    undo: () =>
      set((s) => {
        if (s.past.length === 0) return s
        const previous = s.past[s.past.length - 1] as Board
        const selection = s.selection.filter((id) => previous.entities.some((e) => e.id === id))
        return {
          past: s.past.slice(0, -1),
          future: [s.board, ...s.future],
          board: previous,
          selection,
        }
      }),

    redo: () =>
      set((s) => {
        if (s.future.length === 0) return s
        const next = s.future[0] as Board
        const selection = s.selection.filter((id) => next.entities.some((e) => e.id === id))
        return {
          past: capPast([...s.past, s.board]),
          future: s.future.slice(1),
          board: next,
          selection,
        }
      }),

    addPlayer: () => {
      const id = nanoid()
      let added = false
      commit((b) => {
        const count = b.entities.filter((e) => e.kind === 'player').length
        if (count >= LIMITS.playersPerBoard) return
        added = true
        b.entities.push(createPlayerEntity(id, String(count + 1)))
        const pos = defaultPlayerPosition(count)
        for (const frame of b.frames) frame.positions[id] = pos
      })
      if (!added) return null
      set({ selection: [id], tool: 'select' })
      return id
    },

    addBall: () => {
      const id = nanoid()
      let added = false
      commit((b) => {
        const count = b.entities.filter((e) => e.kind === 'ball').length
        if (count >= LIMITS.ballsPerBoard) return
        added = true
        b.entities.push(createBallEntity(id))
        const pos = defaultBallPosition()
        for (const frame of b.frames) frame.positions[id] = pos
      })
      if (!added) return null
      set({ selection: [id], tool: 'select' })
      return id
    },

    removeEntity: (id) =>
      commit((b) => {
        b.entities = b.entities.filter((e) => e.id !== id)
        for (const frame of b.frames) delete frame.positions[id]
      }),

    removeSelected: () =>
      commit((b) => {
        const ids = new Set(get().selection)
        if (ids.size === 0) return
        b.entities = b.entities.filter((e) => !ids.has(e.id))
        for (const frame of b.frames) for (const id of ids) delete frame.positions[id]
      }),

    moveEntity: (id, pos) => {
      const clamped = clampToPieceRange(pos)
      mutate((b) => {
        const frame = activeFrame(b)
        if (frame && frame.positions[id]) frame.positions[id] = clamped
      })
    },

    nudgeSelection: (delta) =>
      commit((b) => {
        const frame = activeFrame(b)
        if (!frame) return
        for (const id of get().selection) {
          const current = frame.positions[id]
          if (!current) continue
          frame.positions[id] = clampToPieceRange({
            x: current.x + delta.x,
            y: current.y + delta.y,
          })
        }
      }),

    setEntityLabel: (id, label) =>
      commit((b) => {
        const entity = b.entities.find((e) => e.id === id)
        if (entity) entity.label = label
      }),

    setEntityColor: (id, color) =>
      commit((b) => {
        const entity = b.entities.find((e) => e.id === id)
        if (entity) entity.color = color
      }),

    setEntityZone: (id, zone) =>
      commit((b) => {
        const entity = b.entities.find((e) => e.id === id)
        if (entity) entity.zone = zone
      }),

    setBoardTitle: (title) =>
      commit((b) => {
        b.title = title
      }),

    setTeamId: (teamId) =>
      commit((b) => {
        b.teamId = teamId
      }),

    swapPositions: (a, b) =>
      commit((board) => {
        const frame = activeFrame(board)
        if (!frame) return
        const posA = frame.positions[a]
        const posB = frame.positions[b]
        if (!posA || !posB) return
        frame.positions[a] = posB
        frame.positions[b] = posA
      }),

    addTeamToBoard: (team) =>
      commit((board) => {
        board.teamId = team.id
        const zones: Zone[] = [1, 2, 3, 4, 5, 6]
        let count = board.entities.filter((e) => e.kind === 'player').length
        const place = (playerId: ID, label: string, position: Vec, zone?: Zone) => {
          if (count >= LIMITS.playersPerBoard) return
          count += 1
          const id = nanoid()
          board.entities.push({
            id,
            kind: 'player',
            playerId,
            label,
            color: team.color,
            ...(zone ? { zone } : {}),
          })
          for (const frame of board.frames) frame.positions[id] = { ...position }
        }
        team.players.slice(0, 6).forEach((player, index) => {
          const zone = zones[index] as Zone
          place(player.id, String(player.number), ZONE_DEFAULTS[zone], zone)
        })
        let benchIndex = 0
        team.players.slice(6).forEach((player) => {
          place(player.id, String(player.number), benchPosition(benchIndex))
          benchIndex += 1
        })
      }),

    applyRotation: (template) =>
      commit((b) => {
        const frame = activeFrame(b)
        if (!frame) return
        const playerIds = b.entities.filter((e) => e.kind === 'player').map((e) => e.id)
        while (playerIds.length < template.slots.length) {
          const id = nanoid()
          b.entities.push(createPlayerEntity(id, String(playerIds.length + 1)))
          for (const f of b.frames) f.positions[id] = { x: 4.5, y: 14 }
          playerIds.push(id)
        }
        template.slots.forEach((slot, index) => {
          const id = playerIds[index]
          if (!id) return
          const entity = b.entities.find((e) => e.id === id)
          if (!entity) return
          entity.zone = slot.zone
          entity.role = slot.role
          frame.positions[id] = { ...slot.pos }
        })
      }),

    setView: (view) =>
      commit((b) => {
        b.view = view
      }),

    updateSettings: (patch) =>
      commit((b) => {
        Object.assign(b.settings, patch)
      }),

    clearBoard: () =>
      commit((b) => {
        b.entities = []
        for (const frame of b.frames) {
          frame.positions = {}
          frame.strokes = []
        }
      }),

    addStroke: (stroke) =>
      commit((b) => {
        activeFrame(b)?.strokes.push(stroke)
      }),

    removeStroke: (strokeId) =>
      commit((b) => {
        for (const frame of b.frames) frame.strokes = frame.strokes.filter((s) => s.id !== strokeId)
      }),

    loadBoard: (board) =>
      set({
        board,
        past: [],
        future: [],
        selection: [],
        activeFrameIndex: 0,
        interactionSnapshot: null,
        labelEditRequest: null,
        selectedStrokeId: null,
      }),
  }
})
