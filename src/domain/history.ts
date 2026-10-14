/**
 * Historial de deshacer y rehacer por instantaneas. Modulo puro.
 *
 * El historial vive en memoria (LIMITS.historySteps pasos) y no se persiste.
 * El llamador decide cuando guardar una instantanea: en los limites de cada
 * interaccion (fin de arrastre, fin de trazo, alta o baja de pieza).
 */
import { LIMITS } from './types'

export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

/** Registra un estado nuevo descartando el futuro y limitando la profundidad. */
export function push<T>(
  history: History<T>,
  next: T,
  limit: number = LIMITS.historySteps,
): History<T> {
  const past = [...history.past, history.present]
  const trimmed = past.length > limit ? past.slice(past.length - limit) : past
  return { past: trimmed, present: next, future: [] }
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0
}

export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) return history
  const previous = history.past[history.past.length - 1] as T
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) return history
  const next = history.future[0] as T
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}

/** Numero de pasos disponibles hacia atras. */
export function undoDepth<T>(history: History<T>): number {
  return history.past.length
}

/** Numero de pasos disponibles hacia delante. */
export function redoDepth<T>(history: History<T>): number {
  return history.future.length
}
