import type Konva from 'konva'

function dateStamp(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'voleyboard'
}

/** Nombre de archivo estable: titulo-fecha.ext. */
export function buildFilename(title: string, extension: string): string {
  return `${slugify(title)}-${dateStamp()}.${extension}`
}

function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/** Exporta el escenario Konva a PNG a 2x y lo descarga. */
export async function exportStagePng(stage: Konva.Stage | null, title: string): Promise<void> {
  if (!stage) return
  const filename = buildFilename(title, 'png')
  const blob = await new Promise<Blob | null>((resolve) => {
    stage.toBlob({ pixelRatio: 2, mimeType: 'image/png', callback: (value) => resolve(value) })
  })
  if (!blob) return
  const url = URL.createObjectURL(blob)
  try {
    triggerDownload(url, filename)
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
