import type Konva from 'konva'

/** Genera una miniatura PNG de 320 px de ancho a partir del escenario. */
export async function stageToThumbBlob(
  stage: Konva.Stage | null,
  width = 320,
): Promise<Blob | null> {
  if (!stage) return null
  const stageWidth = stage.width()
  if (!stageWidth) return null
  const pixelRatio = width / stageWidth
  return new Promise<Blob | null>((resolve) => {
    stage.toBlob({ pixelRatio, mimeType: 'image/png', callback: (value) => resolve(value) })
  })
}
