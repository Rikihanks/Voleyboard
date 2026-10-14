// Generates the PWA PNG icons into public/ using only Node built-ins.
// Run with: npm run icons
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public')

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'latin1')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function roundedRectSdf(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

const BG = [30, 58, 138]
const COURT = [37, 99, 235]
const WHITE = [241, 245, 249]
const BALL = [245, 158, 11]

// Sample a single point in normalized [0,1] space.
function sample(u, v, maskable) {
  const pad = maskable ? 0.2 : 0.11
  const panel = roundedRectSdf(u, v, 0.5, 0.5, 0.5 - pad, 0.5 - pad, 0.09)

  let color = BG
  let coverage = 1

  // Court panel.
  if (panel < 0) color = COURT

  // Panel outline (court boundary line).
  if (Math.abs(panel) < 0.012) color = WHITE

  // Net band across the panel.
  if (panel < 0.004 && Math.abs(v - 0.74) < 0.014) color = WHITE
  // Net mesh verticals.
  if (panel < 0.004 && v > 0.62 && v < 0.86) {
    const mesh = Math.abs(((u - 0.5 + 10) % 0.16) - 0.08)
    if (mesh > 0.075 && mesh < 0.082) color = mix(color, WHITE, 0.55)
  }

  // Ball.
  const cx = 0.5
  const cy = 0.4
  const radius = maskable ? 0.16 : 0.17
  const dx = u - cx
  const dy = v - cy
  const dist = Math.hypot(dx, dy)
  if (dist < radius) {
    color = BALL
    // Volleyball seams: one vertical, two bulging arcs.
    const ly = dy / radius
    const arc = 0.085 * Math.cos(Math.max(-1, Math.min(1, ly)) * (Math.PI / 2))
    if (Math.abs(dx) < 0.011) color = WHITE
    if (Math.abs(dx - arc) < 0.011) color = WHITE
    if (Math.abs(dx + arc) < 0.011) color = WHITE
    if (dist > radius - 0.02) color = mix(color, WHITE, 0.85)
  }

  return { color, coverage }
}

function render(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4)
  const ss = 3
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const u = (x + (sx + 0.5) / ss) / size
          const v = (y + (sy + 0.5) / ss) / size
          const { color } = sample(u, v, maskable)
          r += color[0]
          g += color[1]
          b += color[2]
        }
      }
      const n = ss * ss
      const i = (y * size + x) * 4
      rgba[i] = Math.round(r / n)
      rgba[i + 1] = Math.round(g / n)
      rgba[i + 2] = Math.round(b / n)
      rgba[i + 3] = 255
    }
  }
  return encodePng(size, size, rgba)
}

mkdirSync(outDir, { recursive: true })
const outputs = [
  ['pwa-192x192.png', render(192, false)],
  ['pwa-512x512.png', render(512, false)],
  ['maskable-512x512.png', render(512, true)],
  ['apple-touch-icon.png', render(180, false)],
]
for (const [name, data] of outputs) {
  writeFileSync(resolve(outDir, name), data)
  console.log(`wrote public/${name} (${data.length} bytes)`)
}
