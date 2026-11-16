import { expect, test } from '@playwright/test';
import { etiqueta, vigilarErrores } from './util';

test('portada: se muestra sin errores y lleva al mapa', async ({ page }) => {
  const errores = vigilarErrores(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('El territorio cambia');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hagámoslo visible');
  await expect(page.getByText('aún no hay evidencia suficiente')).toBeVisible();
  await expect(page.getByText(/manchas de fuego del mapa son de prueba/)).toBeVisible();

  await page.getByRole('link', { name: /Explorar el mapa/ }).click();
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.locator('.pista')).toContainText('Toca un distrito', { timeout: 30_000 });
  await expect(etiqueta(page, 'Wanchaq')).toBeVisible();
  expect(errores).toEqual([]);
});

test('portada: los accesos llevan a resumen y testimonios, y se llega con teclado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /VER EL RESUMEN/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/resumen$/);
  await page.goBack();
  await page.getByRole('link', { name: /PARTICIPAR/ }).click();
  await expect(page).toHaveURL(/\/testimonios$/);
});

test('portada: no desborda horizontalmente', async ({ page }) => {
  await page.goto('/');
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
