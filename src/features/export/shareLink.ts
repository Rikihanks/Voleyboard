import { migrateBoard } from '@/persistence/migrations'
import type { Board } from '@/domain/types'

/** Mas alla de esto, las apps de mensajeria suelen romper la URL. */
export const MAX_SHARE_URL_LENGTH = 2000

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
  if (typeof CompressionStream === 'undefined') {
    throw new Error('CompressionStream no disponible')
  }
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

/** Serializa y comprime una tactica para el fragmento # de la URL. */
export async function encodeBoard(board: Board): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(board))
  return toBase64Url(await deflateRaw(json))
}

/** Reconstruye una tactica desde el fragmento. Devuelve null si no es valido. */
export async function decodeBoard(payload: string): Promise<Board | null> {
  try {
    const json = await inflateRaw(fromBase64Url(payload))
    const raw = JSON.parse(new TextDecoder().decode(json))
    const board = migrateBoard(raw)
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
