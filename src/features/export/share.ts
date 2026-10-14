interface ShareNavigator {
  canShare?: (data: { files?: File[] }) => boolean
  share?: (data: { files?: File[]; title?: string }) => Promise<void>
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Comparte con la Web Share API si el navegador lo permite y, si no, descarga.
 */
export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const nav = navigator as Navigator & ShareNavigator
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename })
      return
    } catch {
      // El usuario cancelo o fallo: se descarga como respaldo.
    }
  }
  download(blob, filename)
}
