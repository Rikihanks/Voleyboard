import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('layout compacto en movil', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('toolbar')).toBeVisible()
  const canvas = page.locator('.board-canvas canvas').first()
  await expect(canvas).toBeVisible()

  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (box) expect(box.height).toBeGreaterThan(300)

  // Sin scroll lateral ni en la pagina ni en las barras.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
  for (const selector of ['.toolbar', '.board-topbar']) {
    const extra = await page.evaluate((sel) => {
      const el = document.querySelector(sel)
      return el ? el.scrollWidth - el.clientWidth : 0
    }, selector)
    expect(extra).toBeLessThanOrEqual(1)
  }

  const toolbar = page.getByRole('toolbar')
  const toolbarBox = await toolbar.boundingBox()
  if (toolbarBox) expect(toolbarBox.height).toBeLessThan(80)

  // El menu de fotogramas vive en el panel inferior, no en una fila apretada.
  await expect(page.locator('.board-footer')).toHaveCount(0)
  await toolbar.getByRole('button', { name: 'Más opciones' }).click()
  const sheet = page.getByRole('dialog', { name: 'Más opciones' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('heading', { name: 'Fotogramas' })).toBeVisible()
  await expect(sheet.getByRole('tab', { name: /1\s*1\.0s/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(sheet).toHaveCount(0)

  // La barra cambia a modo Animacion con 3-4 controles de fotograma.
  await toolbar.getByRole('button', { name: 'Animación' }).click()
  const nextFrame = toolbar.getByRole('button', { name: 'Fotograma siguiente' })
  await expect(nextFrame).toBeDisabled()
  await toolbar.getByRole('button', { name: 'Añadir fotograma' }).click()
  await expect(toolbar.getByRole('button', { name: 'Fotograma anterior' })).toBeEnabled()

  expect(errors).toEqual([])
})
