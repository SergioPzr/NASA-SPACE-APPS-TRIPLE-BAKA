// Genera los iconos PNG de la PWA desde public/icon.svg (usa Chromium de Playwright).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
const sirve = async (lado, relleno, nombre) => {
  await pagina.setViewportSize({ width: lado, height: lado });
  const margen = Math.round((lado * relleno) / 2);
  await pagina.setContent(`<body style="margin:0;background:#153119"><div style="padding:${margen}px">${svg.replace('<svg ', `<svg width="${lado - 2 * margen}" height="${lado - 2 * margen}" `)}</div></body>`);
  await pagina.screenshot({ path: fileURLToPath(new URL(`../public/${nombre}`, import.meta.url)), omitBackground: false });
};
await sirve(192, 0, 'icon-192.png');
await sirve(512, 0, 'icon-512.png');
await sirve(512, 0.2, 'icon-maskable-512.png');
await navegador.close();
