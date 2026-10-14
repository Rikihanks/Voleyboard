import { expect, test } from '@playwright/test'

test('pizarra basica: anadir, arrastrar, dibujar, deshacer y exportar', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('toolbar')).toBeVisible()
  await expect(page.locator('.board-canvas canvas').first()).toBeVisible()

  const counter = page.locator('.toolbar-count')

  await page.getByRole('button', { name: 'Añadir jugador' }).click()
  await expect(counter).toContainText('1/20')
  await page.getByRole('button', { name: 'Añadir balón' }).click()
  await expect(counter).toContainText('1/5')

  const canvas = page.locator('.board-canvas canvas').first()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()

  if (box) {
    // Arrastra el jugador (por defecto en 1.5, 10) en la vista completa.
    const scale = Math.min(box.width / 13, box.height / 22)
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const px = cx + (1.5 - 4.5) * scale
    const py = cy + (10 - 11) * scale
    await page.mouse.move(px, py)
    await page.mouse.down()
    await page.mouse.move(px + 120, py + 20, { steps: 8 })
    await page.mouse.up()
  }

  // Dibujo con el lapiz sobre el lienzo.
  await page.getByRole('button', { name: 'Lápiz' }).click()
  if (box) {
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.move(cx - 80, cy - 40)
    await page.mouse.down()
    for (let i = 0; i <= 8; i += 1) {
      await page.mouse.move(cx - 80 + i * 12, cy - 40 + Math.sin(i) * 20)
    }
    await page.mouse.up()
  }

  // Tras dibujar, deshacer y rehacer estan disponibles.
  const undo = page.getByRole('button', { name: 'Deshacer' })
  const redo = page.getByRole('button', { name: 'Rehacer' })
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(redo).toBeEnabled()
  await redo.click()

  // Cambio de vista sin perder datos.
  await page.getByRole('button', { name: 'Media pista' }).click()
  await expect(page.getByRole('button', { name: 'Media pista' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Exportacion a PNG.
  const pngDownload = (await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar PNG' }).click(),
  ]).then(([value]) => value)) as import('@playwright/test').Download
  expect(pngDownload.suggestedFilename()).toMatch(/-\d{8}\.png$/)

  // Exportacion a PDF.
  const pdfDownload = (await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar PDF' }).click(),
  ]).then(([value]) => value)) as import('@playwright/test').Download
  expect(pdfDownload.suggestedFilename()).toMatch(/-\d{8}\.pdf$/)

  expect(errors).toEqual([])
})
