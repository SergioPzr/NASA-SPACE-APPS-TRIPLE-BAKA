import { expect, type Page } from '@playwright/test';

/** Recoge errores de consola y de página para exigir que no haya ninguno. */
export function vigilarErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(String(e)));
  return errores;
}

/** Abre el mapa con el gancho de pruebas y espera a que termine la introducción. */
export async function abrirMapa(page: Page, ruta = '/mapa?e2e=1') {
  await page.goto(ruta);
  await expect(page.locator('.pista')).toContainText('Toca un distrito', { timeout: 30_000 });
}

export const etiqueta = (page: Page, nombre: string) => page.getByRole('button', { name: new RegExp(`^${nombre}:`) });

export async function reiniciarProgreso(page: Page) {
  await page.evaluate(() => localStorage.clear());
}
