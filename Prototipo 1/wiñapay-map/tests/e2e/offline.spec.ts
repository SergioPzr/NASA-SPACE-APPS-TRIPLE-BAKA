import { expect, test } from '@playwright/test';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const PUERTO = 3300;
const BASE = `http://localhost:${PUERTO}`;
const DATOS = '.data-test-offline';

/**
 * "Modo avión" real: se apaga el servidor (no solo se emula) y la app debe seguir abriendo,
 * navegando y aceptando testimonios en cola; al volver el servidor, la cola se envía.
 */
let servidor: ChildProcess | null = null;

async function levantar() {
  servidor = spawn('npx', ['next', 'start', '-p', String(PUERTO)], {
    shell: true, stdio: 'ignore', env: { ...process.env, WINAPAY_DATA_DIR: DATOS, WINAPAY_LIMITE_ENVIOS: '1000' },
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 60_000) {
    try { if ((await fetch(`${BASE}/api/distritos`)).ok) return; } catch { /* aún no responde */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('el servidor no arrancó');
}

async function apagar() {
  if (servidor?.pid) {
    try { execFileSync('taskkill', ['/PID', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* ya terminó */ }
  }
  servidor = null;
  for (let i = 0; i < 40; i++) {
    try { await fetch(`${BASE}/api/distritos`); } catch { return; }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('el servidor sigue respondiendo');
}

test.afterAll(async () => { await apagar(); rmSync(DATOS, { recursive: true, force: true }); });

test('sin servidor: abre el mapa, navega y deja testimonios en cola; al volver la red se envían', async ({ browser }) => {
  test.setTimeout(240_000);
  rmSync(DATOS, { recursive: true, force: true });
  await levantar();
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));

  // Primera visita con red: se instala el service worker y se guarda todo.
  await page.goto('/mapa');
  await expect(page.locator('.pista')).toContainText('Toca un distrito', { timeout: 30_000 });
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  for (const r of ['/resumen', '/testimonios', '/acerca', '/']) {
    await page.goto(r);
    await page.waitForLoadState('networkidle');
  }
  await page.goto('/testimonios');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    const c = await caches.open('winapay-v1-datos');
    return (await c.keys()).length;
  }), { timeout: 20_000 }).toBeGreaterThanOrEqual(4);

  // Avión: servidor apagado.
  await apagar();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hagámoslo visible');
  await page.getByRole('link', { name: /Explorar el mapa/ }).click();
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.locator('.pista')).toContainText('Toca un distrito', { timeout: 30_000 });
  await expect(page.locator('button.etiqueta')).toHaveCount(8);
  await expect(page.locator('#map canvas')).toBeVisible();

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Resumen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resumen de la provincia de Cusco');
  await expect(page.locator('table.tabla tbody tr')).toHaveCount(9);

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Testimonios' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Testimonios e iniciativas');
  const form = page.locator('form').first();
  const texto = 'Escribo sin conexión: el monte de mi comunidad rebrotó después de la quema.';
  await form.getByLabel('Tu testimonio').fill(texto);
  await form.getByLabel(/Acepto/).check();
  await form.getByRole('button', { name: 'Enviar' }).click();
  await expect(form.getByRole('status')).toContainText('Sin conexión');
  await expect(page.getByText(/1 envío en cola/)).toBeVisible();

  // Vuelve el servidor y la red: la cola se envía sola.
  await levantar();
  await page.evaluate(() => dispatchEvent(new Event('online')));
  await expect(page.getByText(/en cola/)).toHaveCount(0, { timeout: 20_000 });
  const archivo = path.join(process.cwd(), DATOS, 'testimonios.json');
  await expect.poll(() => existsSync(archivo)).toBe(true);
  const guardados = JSON.parse(readFileSync(archivo, 'utf8'));
  expect(guardados).toHaveLength(1);
  expect(guardados[0]).toMatchObject({ texto, estado: 'pendiente', consentimiento: true });
  expect(errores).toEqual([]);
  await ctx.close();
});
