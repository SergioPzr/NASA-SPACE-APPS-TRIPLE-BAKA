import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { vigilarErrores } from './util';

for (const [ruta, titulo] of [
  ['/resumen', 'Resumen de la provincia de Cusco'],
  ['/testimonios', 'Testimonios e iniciativas'],
  ['/acerca', 'Acerca de WIÑAPAY'],
] as const) {
  test(`${ruta} se muestra sin errores y marca la página activa`, async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.goto(ruta);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo);
    await expect(page.getByRole('navigation', { name: 'Principal' }).locator('[aria-current="page"]')).toBeVisible();
    expect(errores).toEqual([]);
  });
}

test('resumen: tabla con las tres medidas, conclusión honesta y exportaciones', async ({ page }) => {
  await page.goto('/resumen');
  const filas = page.locator('table.tabla tbody tr');
  await expect(filas).toHaveCount(9);
  await expect(page.locator('table.tabla thead')).toContainText('Máximo anual');
  await expect(page.locator('table.tabla thead')).toContainText('Estación seca');
  await expect(page.getByText('Aún no hay evidencia suficiente').first()).toBeVisible();
  await expect(page.locator('table.tabla')).toContainText('solo 25 píxeles');

  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar CSV' }).click()]);
  const crudo = readFileSync(await csv.path()!, 'utf8');
  expect(crudo.charCodeAt(0)).toBe(0xfeff);
  const texto = crudo.slice(1);
  const lineas = texto.trim().split(/\r?\n/);
  expect(lineas).toHaveLength(10);
  expect(lineas[0]).toContain('maximo_anual_p');
  expect(lineas[9]).toContain('Provincia de Cusco');

  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Descargar imagen/ }).click()]);
  const bytes = readFileSync(await png.path()!);
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(bytes.length).toBeGreaterThan(10_000);

  await page.getByLabel('Zona').selectOption({ label: 'Cusco' });
  await expect(page.getByRole('img', { name: /NDVI de Cusco/ })).toBeVisible();
});

test('testimonios: valida campos, exige consentimiento y evita datos personales', async ({ page }) => {
  await page.goto('/testimonios');
  await page.waitForLoadState('networkidle');
  const form = page.locator('form').first();
  await form.getByRole('button', { name: 'Enviar' }).click();
  await expect(form.getByRole('alert').first()).toBeVisible();
  await expect(form.getByLabel('Tu testimonio')).toHaveAttribute('aria-invalid', 'true');

  await form.getByLabel('Tu testimonio').fill('Escríbeme a ana@correo.pe para contarte lo que pasó con el monte.');
  await form.getByLabel(/Acepto/).check();
  await form.getByRole('button', { name: 'Enviar' }).click();
  await expect(form.getByRole('alert')).toContainText('teléfonos ni correos');
});

test('testimonios: un envío válido queda pendiente de moderación y no se publica', async ({ page }) => {
  await page.goto('/testimonios');
  await page.waitForLoadState('networkidle');
  const form = page.locator('form').first();
  await form.getByLabel('Tu testimonio').fill('Hace diez años la ladera de mi comunidad estaba más verde en mayo.');
  await form.getByLabel('Apodo (opcional)').fill('Rosa');
  await form.getByLabel(/Acepto/).check();
  await form.getByRole('button', { name: 'Enviar' }).click();
  await expect(form.getByRole('status')).toContainText('pendiente de revisión');
  const publicos = await (await page.request.get('/api/testimonios')).json();
  expect(JSON.stringify(publicos)).not.toContain('ladera de mi comunidad');
});

test('API: distritos, serie, errores y límites', async ({ request }) => {
  const d = await (await request.get('/api/distritos')).json();
  expect(d.features).toHaveLength(8);
  const m = await request.get('/api/manchas');
  expect(m.ok()).toBeTruthy();
  const s = await (await request.get('/api/serie/080108')).json();
  expect(Object.keys(s.agregaciones)).toEqual(['media_anual', 'maximo_anual', 'estacion_seca']);
  expect((await request.get('/api/serie/provincia')).ok()).toBeTruthy();
  expect((await request.get('/api/serie/12')).status()).toBe(400);
  expect((await request.get('/api/serie/999999')).status()).toBe(404);

  const base = { texto: 'Una descripción lo bastante larga para pasar la validación.', consentimiento: true };
  expect((await request.post('/api/testimonios', { data: { ...base, consentimiento: false } })).status()).toBe(422);
  expect((await request.post('/api/testimonios', { data: 'no es json', headers: { 'Content-Type': 'text/plain' } })).status()).toBe(400);
  expect((await request.post('/api/testimonios', { data: { ...base, texto: 'x'.repeat(9000) } })).status()).toBe(413);
  expect((await request.post('/api/testimonios', { data: { ...base, web: 'http://spam' } })).status()).toBe(202);
  expect((await request.post('/api/testimonios', { data: base })).status()).toBe(201);
  const iniciativa = { titulo: 'Reforestación comunitaria', descripcion: 'Plantamos queñua cada sábado junto a los viveros de la comunidad.', contacto: 'ana@correo.pe', consentimiento: true };
  expect((await request.post('/api/iniciativas', { data: iniciativa })).status()).toBe(201);
  const publicas = await (await request.get('/api/iniciativas')).json();
  expect(JSON.stringify(publicas)).not.toContain('correo.pe');
});
