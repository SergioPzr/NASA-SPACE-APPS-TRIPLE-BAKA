import { expect, test } from '@playwright/test';
import { abrirMapa, etiqueta, vigilarErrores } from './util';

const innerSize = (page: import('@playwright/test').Page) => ({ x: page.viewportSize()!.width, y: page.viewportSize()!.height });

test('carga la provincia, ocho distritos y sin errores de consola', async ({ page }) => {
  const errores = vigilarErrores(page);
  await abrirMapa(page);
  await expect(page.locator('button.etiqueta')).toHaveCount(8);
  await expect(page.locator('.contador')).toContainText('0/8');
  await expect(page.locator('.aviso-prueba')).toContainText('Manchas de prueba');
  await expect(page.locator('#map canvas')).toBeVisible();
  expect(errores).toEqual([]);
});

test('recorrido con puntero: distrito, mancha más cercana, ???, apagar y datos completos', async ({ page }) => {
  const errores = vigilarErrores(page);
  await abrirMapa(page);
  await etiqueta(page, 'Wanchaq').click();
  await expect(page.locator('.pista')).toContainText('cualquier punto', { timeout: 15_000 });

  await page.mouse.click(innerSize(page).x / 2, innerSize(page).y / 2);

  const popup = page.getByRole('dialog');
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('Wanchaq');
  await expect(popup.locator('.valor.oculto')).toHaveCount(4);
  await expect(popup.locator('.valor.oculto').first()).toHaveText('???');

  await popup.getByRole('button', { name: 'Apagar' }).click();
  await expect(popup).toContainText('Zona completa', { timeout: 20_000 });
  await expect(popup.locator('.valor.oculto')).toHaveCount(0);
  await expect(popup).toContainText('NDVI medio 2001–2025');
  await expect(popup.getByText('Las tres formas de medirlo')).toBeVisible();
  await expect(page.locator('.contador')).toContainText('1/8');

  await popup.getByRole('button', { name: 'Volver a la provincia' }).click();
  await expect(page.locator('.pista')).toContainText('Toca un distrito', { timeout: 15_000 });
  await expect(etiqueta(page, 'Wanchaq')).toHaveAccessibleName(/explorada/);
  expect(errores).toEqual([]);
});

test('teclado: Tab/Enter para entrar, elegir, apagar y volver; Esc cierra el popup', async ({ page, isMobile }) => {
  test.skip(isMobile === true, 'flujo de teclado: solo escritorio');
  const errores = vigilarErrores(page);
  await abrirMapa(page);

  const wanchaq = etiqueta(page, 'Wanchaq');
  await wanchaq.focus();
  await expect(wanchaq).toBeFocused();
  await page.keyboard.press('Enter');
  const elegir = page.locator('.pista').getByRole('button', { name: 'Elegir una mancha' });
  await expect(elegir).toBeVisible({ timeout: 15_000 });

  await elegir.focus();
  await page.keyboard.press('Enter');
  const popup = page.getByRole('dialog');
  await expect(popup).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Apagar' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(popup).toBeHidden();

  await elegir.focus();
  await page.keyboard.press('Enter');
  await expect(popup).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(popup).toContainText('Zona completa', { timeout: 20_000 });
  await expect(popup.getByRole('button', { name: 'Volver a la provincia' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('.pista')).toContainText('Toca un distrito', { timeout: 15_000 });
  await expect(page.locator('.contador')).toContainText('1/8');
  expect(errores).toEqual([]);
});

test('el foco por teclado es visible (contorno dorado de 3 px)', async ({ page }) => {
  await abrirMapa(page);
  await etiqueta(page, 'Cusco').focus();
  const contorno = await etiqueta(page, 'Cusco').evaluate((el) => {
    const s = getComputedStyle(el);
    return { w: s.outlineWidth, c: s.outlineColor, estilo: s.outlineStyle };
  });
  expect(contorno.w).toBe('3px');
  expect(contorno.estilo).toBe('solid');
  expect(contorno.c).toBe('rgb(217, 164, 65)');
});

test('modo ligero: se recuerda y reduced-motion lo activa por defecto', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await abrirMapa(page);
  const ligero = page.getByLabel('Modo ligero');
  await expect(ligero).toBeChecked();
  await ligero.uncheck();
  await page.reload();
  await expect(page.locator('.pista')).toContainText('Toca un distrito', { timeout: 30_000 });
  await expect(page.getByLabel('Modo ligero')).not.toBeChecked();
  await ctx.close();
});

test('el progreso sobrevive a recargar la página', async ({ page }) => {
  await abrirMapa(page);
  await etiqueta(page, 'Wanchaq').click();
  await expect(page.locator('.pista')).toContainText('cualquier punto', { timeout: 15_000 });
  await page.locator('.pista').getByRole('button', { name: 'Elegir una mancha' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Apagar' }).click();
  await expect(page.getByRole('dialog')).toContainText('Zona completa', { timeout: 20_000 });
  await page.goto('/mapa?e2e=1');
  await expect(page.locator('.pista')).toContainText('Toca un distrito', { timeout: 30_000 });
  await expect(page.locator('.contador')).toContainText('1/8');
});

test('móvil: el popup es una hoja inferior a casi todo el ancho', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'solo móvil');
  await abrirMapa(page);
  await etiqueta(page, 'Cusco').tap();
  await expect(page.locator('.pista')).toContainText('cualquier punto', { timeout: 20_000 });
  await page.locator('.pista').getByRole('button', { name: 'Elegir una mancha' }).tap();
  const popup = page.getByRole('dialog');
  await expect(popup).toBeVisible();
  const caja = await popup.boundingBox();
  const vp = page.viewportSize()!;
  expect(caja!.width).toBeGreaterThan(vp.width - 40);
  expect(caja!.y + caja!.height).toBeGreaterThan(vp.height - 30);
  expect(caja!.y + caja!.height).toBeLessThanOrEqual(vp.height);
});
