/* Service worker de WIÑAPAY: la app abre y se usa sin conexión tras la primera visita. */
const VERSION = 'winapay-v1';
const SHELL = `${VERSION}-shell`;
const ESTATICO = `${VERSION}-estatico`;
const DATOS = `${VERSION}-datos`;
const RUTAS = ['/', '/mapa', '/resumen', '/testimonios', '/acerca', '/icon.svg'];
const ESPERA_RED_MS = 4000;

const guardar = async (nombre, req, res) => {
  if (res && res.ok) await (await caches.open(nombre)).put(req, res.clone());
  return res;
};

const conTimeout = (promesa, ms) =>
  Promise.race([promesa, new Promise((_, mal) => setTimeout(() => mal(new Error('timeout')), ms))]);

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await Promise.all(RUTAS.map((r) => fetch(r).then((res) => res.ok && cache.put(r, res)).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (e) => {
  if (!e.data || e.data.tipo !== 'precargar') return;
  e.waitUntil(
    Promise.all(
      e.data.urls.map(async (u) => {
        const url = new URL(u, self.location.origin);
        if (url.origin !== self.location.origin || url.pathname === '/sw.js') return;
        const nombre = url.pathname.startsWith('/api/') ? DATOS : url.pathname.startsWith('/_next/') || /\.\w{2,5}$/.test(url.pathname) ? ESTATICO : SHELL;
        const cache = await caches.open(nombre);
        if (await cache.match(url)) return;
        try { await guardar(nombre, url, await fetch(url)); } catch { /* se intentará en la próxima visita */ }
      }),
    ),
  );
});

async function redPrimero(req, nombre, fallback) {
  try {
    return await guardar(nombre, req, await conTimeout(fetch(req), ESPERA_RED_MS));
  } catch {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (fallback) return (await caches.match(fallback)) ?? Response.error();
    return Response.error();
  }
}

async function cachePrimero(req, nombre) {
  const hit = await caches.match(req);
  if (hit) return hit;
  return guardar(nombre, req, await fetch(req));
}

async function revalidar(req, nombre) {
  const hit = await caches.match(req);
  const red = fetch(req).then((res) => guardar(nombre, req, res)).catch(() => undefined);
  return hit ?? (await red) ?? Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname === '/sw.js') return;
  if (req.headers.get('RSC') || url.searchParams.has('_rsc')) return;

  if (req.mode === 'navigate') {
    e.respondWith(redPrimero(req, SHELL, '/'));
  } else if (url.pathname.startsWith('/_next/static/') || /^\/icon/.test(url.pathname)) {
    e.respondWith(cachePrimero(req, ESTATICO));
  } else if (url.pathname.startsWith('/api/')) {
    const vivo = url.pathname.startsWith('/api/testimonios') || url.pathname.startsWith('/api/iniciativas');
    e.respondWith(vivo ? redPrimero(req, DATOS) : revalidar(req, DATOS));
  } else {
    e.respondWith(revalidar(req, ESTATICO));
  }
});
