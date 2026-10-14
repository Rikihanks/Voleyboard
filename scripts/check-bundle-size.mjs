// Comprueba el presupuesto de JavaScript inicial (< 250 kB comprimido).
import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BUDGET_BYTES = 250 * 1024
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

/** Mapa basename -> ruta, para tolerar el prefijo base de GitHub Pages. */
function assetIndex(dir) {
  const found = new Map()
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      for (const [name, path] of assetIndex(full)) found.set(name, path)
    } else {
      found.set(entry.name, full)
    }
  }
  return found
}

function collectEntryScripts() {
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const refs = new Set()
  const patterns = [
    /<script[^>]+src="([^"]+)"/g,
    /<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g,
  ]
  for (const pattern of patterns) {
    let match = pattern.exec(html)
    while (match) {
      if (match[1] && match[1].endsWith('.js')) refs.add(basename(match[1]))
      match = pattern.exec(html)
    }
  }
  return [...refs]
}

const assets = assetIndex(dist)
const scripts = collectEntryScripts()
if (scripts.length === 0) {
  console.error('No se encontraron scripts de entrada en dist/index.html')
  process.exit(1)
}

let total = 0
for (const name of scripts) {
  const file = assets.get(name)
  if (!file) {
    console.error(`Falta ${name}; ejecuta "npm run build" antes.`)
    process.exit(1)
  }
  const gzip = gzipSync(readFileSync(file)).length
  total += gzip
  console.log(`${name}: ${(gzip / 1024).toFixed(1)} kB gzip`)
}

// Cuenta solo el JavaScript que carga la pantalla inicial (los features van
// en chunks dinamicos y no cuentan para el presupuesto inicial).
console.log(
  `Total inicial: ${(total / 1024).toFixed(1)} kB gzip (presupuesto ${BUDGET_BYTES / 1024} kB)`,
)
if (total > BUDGET_BYTES) {
  console.error('Presupuesto de JavaScript inicial superado.')
  process.exit(1)
}
