import type { CourtView } from '@/domain/types'

export interface PdfImage {
  dataUrl: string
  /** Relacion ancho/alto de la imagen. */
  aspect: number
}

function orientationFor(view: CourtView): 'portrait' | 'landscape' {
  return view === 'half' ? 'landscape' : 'portrait'
}

/** Genera un PDF A4 con una pagina por imagen. jsPDF se carga bajo demanda. */
export async function buildBoardPdf(
  images: PdfImage[],
  view: CourtView,
  title: string,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const orientation = orientationFor(view)
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const header = 14

  images.forEach((image, index) => {
    if (index > 0) pdf.addPage()
    pdf.setFontSize(13)
    pdf.text(title, margin, margin + 2)
    pdf.setFontSize(8)
    pdf.text(new Date().toLocaleDateString(), pageWidth - margin, margin + 2, { align: 'right' })

    const maxWidth = pageWidth - margin * 2
    const maxHeight = pageHeight - header - margin * 2
    let drawWidth = maxWidth
    let drawHeight = drawWidth / image.aspect
    if (drawHeight > maxHeight) {
      drawHeight = maxHeight
      drawWidth = drawHeight * image.aspect
    }
    const x = margin + (maxWidth - drawWidth) / 2
    const y = header + margin
    pdf.addImage(image.dataUrl, 'PNG', x, y, drawWidth, drawHeight)
  })

  return pdf.output('blob')
}
