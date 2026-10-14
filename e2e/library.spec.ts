import { expect, test } from '@playwright/test'

test('biblioteca y equipos: crear, listar y persistir', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  const nav = (name: string) =>
    page.getByRole('navigation', { name: 'VoleyBoard' }).getByRole('button', { name })

  await page.goto('/')
  await expect(page.getByRole('toolbar')).toBeVisible()

  // Nueva tactica -> pizarra.
  await nav('Biblioteca').click()
  await expect(page.getByRole('heading', { name: 'Biblioteca' })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva táctica' }).click()

  const titleInput = page.getByLabel('Título')
  await expect(titleInput).toBeVisible()
  await expect(titleInput).toHaveValue('Sin título')
  await titleInput.fill('Saque y recepcion')
  await expect(titleInput).toHaveValue('Saque y recepcion')

  // Espera al autoguardado y comprueba que aparece en la biblioteca.
  await page.waitForTimeout(800)
  await nav('Biblioteca').click()
  await expect(page.getByText('Saque y recepcion')).toBeVisible()

  // Equipos: crear con un jugador.
  await nav('Equipos').click()
  await expect(page.getByRole('heading', { name: 'Equipos' })).toBeVisible()
  await page.getByRole('button', { name: 'Nuevo equipo' }).click()
  await page.locator('.dialog input[type="text"]').first().fill('Equipo A')
  await page.getByRole('button', { name: 'Añadir jugador' }).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Equipo A')).toBeVisible()

  // Persistencia tras recargar.
  await page.reload()
  await nav('Biblioteca').click()
  await expect(page.getByText('Saque y recepcion')).toBeVisible()
  await nav('Equipos').click()
  await expect(page.getByText('Equipo A')).toBeVisible()

  expect(errors).toEqual([])
})
