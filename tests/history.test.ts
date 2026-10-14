import { describe, expect, it } from 'vitest'

import {
  canRedo,
  canUndo,
  createHistory,
  push,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from '../src/domain/history'

describe('history', () => {
  it('empieza sin pasos', () => {
    const h = createHistory(0)
    expect(h.present).toBe(0)
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
  })

  it('deshace y rehace una secuencia', () => {
    let h = createHistory(0)
    h = push(h, 1)
    h = push(h, 2)
    h = push(h, 3)
    expect(h.present).toBe(3)
    expect(undoDepth(h)).toBe(3)

    h = undo(h)
    expect(h.present).toBe(2)
    h = undo(h)
    expect(h.present).toBe(1)
    h = undo(h)
    expect(h.present).toBe(0)
    expect(canUndo(h)).toBe(false)

    h = redo(h)
    expect(h.present).toBe(1)
    h = redo(h)
    expect(h.present).toBe(2)
    expect(redoDepth(h)).toBe(1)
  })

  it('descartar el futuro al registrar un estado nuevo', () => {
    let h = createHistory(0)
    h = push(h, 1)
    h = push(h, 2)
    h = undo(h)
    expect(canRedo(h)).toBe(true)
    h = push(h, 99)
    expect(canRedo(h)).toBe(false)
    expect(h.present).toBe(99)
  })

  it('revierte 100 acciones seguidas', () => {
    let h = createHistory(0)
    for (let i = 1; i <= 100; i += 1) h = push(h, i)
    expect(h.present).toBe(100)
    for (let i = 0; i < 100; i += 1) h = undo(h)
    expect(h.present).toBe(0)
    expect(canUndo(h)).toBe(false)
    for (let i = 0; i < 100; i += 1) h = redo(h)
    expect(h.present).toBe(100)
  })

  it('limita la profundidad a 200 pasos', () => {
    let h = createHistory(0)
    for (let i = 1; i <= 250; i += 1) h = push(h, i)
    expect(undoDepth(h)).toBe(200)
    // El estado mas antiguo alcanzable es 50 (se descarto 0..49).
    for (let i = 0; i < 200; i += 1) h = undo(h)
    expect(h.present).toBe(50)
    expect(canUndo(h)).toBe(false)
  })

  it('undo y redo sin pasos disponibles son no-op', () => {
    const h = createHistory('a')
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })
})
