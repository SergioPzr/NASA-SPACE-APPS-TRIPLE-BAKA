# NOTAS — WIÑAPAY (domingo 15 nov, entrega 16:00)

Registro de decisiones y estado por fase. Lo no resuelto queda en "Pendiente".

## Fase 1 — Paleta y base · HECHO
- Paleta del CLAUDE.md como variables CSS en `:root` (`--bosque`, `--oliva`, `--amarillo`, `--ambar`, `--fuego`).
- Eliminado el tema anterior (`#0d1511`) y todos los verdes viejos. `colorExplorada` interpola `#d0c950` (NDVI bajo) → `#4f6f1d` (NDVI alto) en el rango 0.20–0.50 (antes 0.38–0.50: Wanchaq, 0.19, quedaba fuera de escala).
- Colores derivados (tonos de la paleta, no listados en el CLAUDE.md): texto crema `#f4f1dc`, texto suave `#c3c9a8`, carta `#f7f3de`, tinta suave `#4a5a3f`, distrito sin explorar `#1f4023`, hover `#2d5a31`. El agua del chorro queda azul claro (`#bfe6ff`): es semántico, no una segunda variable.
- Contraste medido (WCAG): texto/fondo 12.4:1, suave/fondo 8.2:1, ámbar/fondo 7.5:1, texto/fuego (botón Apagar) 5.1:1, tinta/carta 12.7:1, tinta suave/carta 6.7:1, fuego/carta 5.0:1. Mínimo 4.5:1 cumplido en todo el texto. No se usa `#d0c950` sobre `#e5b655`.
- Foco visible: `:focus-visible` con contorno de 3 px ámbar (fuego sobre las tarjetas claras).

## Hallazgo importante — datos reales y agregaciones (Fase 4, adelantada)
- El MOD13Q1 crudo estaba en `~/Downloads/requests.zip`. Lo extraje en una carpeta aparte, regeneré `resultados.json` con `scripts/build_data.py` y la **media anual reproduce exactamente** los números anteriores (mismos p y pendientes). `distritos.json` es idéntico en contenido y `curvas.json` idéntico byte a byte.
- Ahora se guardan **tres agregaciones** por distrito y provincia: media anual, máximo anual y estación seca (may–sep). Las tres se reportan juntas.
- **La elección de agregación cambia la conclusión.** Ejemplos: Ccorca p=0.118 con la media, pero p=0.001 con el máximo; la provincia p=0.362 con la media y p=0.021 con la estación seca. Por eso no se elige: la regla de evidencia (`src/lib/evidencia.ts`) está fijada de antemano:
  - **Evidencia suficiente** solo si media, máximo y estación seca son significativas con la misma dirección, cada una tras corregir por los 8 distritos (Benjamini–Hochberg).
  - **Señal parcial** si solo algunas lo son (el texto dice "aún no hay evidencia suficiente").
  - **Sin evidencia** en el resto.
- **Decisión que cambia titulares:** antes el mapa decía «Sí» en 5 de 8 distritos (solo con la media). Ahora solo 2 tienen evidencia suficiente (Wanchaq y Poroy, con las tres medidas); Ccorca, Santiago, Cusco y San Sebastián quedan en «señal parcial» y Saylla y San Jerónimo en «aún no». La provincia: señal parcial (solo la estación seca es significativa, p=0.021). Interruptor de la corrección: `USAR_FDR` en `evidencia.ts`. **Revísalo antes del video: cambia lo que se dice en pantalla.**
- Wanchaq tiene solo 25 píxeles de 250 m (distrito urbano): se avisa en pantalla.

## Fase 2 — Estructura · HECHO (Next.js, sin volver a Vite)
- Next.js 16 (App Router) + TypeScript + React 19. Turbopack funciona con la ruta con «ñ». MapLibre se queda en 5.x y GSAP igual.
- `main.js` se convirtió en `src/lib/mapa.ts` (controlador sin DOM de popup) y la UI pasó a React. El mapa se importa dinámicamente en el cliente.
- Páginas: `/` (mapa), `/resumen`, `/testimonios`, `/acerca`. Navegación común con enlace «saltar al contenido».
- Popup con Radix Dialog (no modal): Esc cierra, el foco entra al botón principal, título y descripción accesibles. En ≤640 px es hoja inferior (CSS).
- Cambios de comportamiento respecto al prototipo: las etiquetas de distrito son botones (teclado y toque); el popup con «???» ya no usa desenfoque (era ilegible); si no hay mancha elegida el popup ofrece «Elegir mancha» (sin esto el teclado quedaba atascado); etiquetas con z-index por tamaño y más compactas en móvil (en pantallas pequeñas se solapaban Wanchaq y San Sebastián).
- El prototipo Vite se eliminó (no hay git). Hay una copia en la carpeta temporal de la sesión; si la quieres, pídemela.
- Next generó un `AGENTS.md` solo; lo borré y puse `agentRules: false`.

## Fase 3 — Backend · HECHO (Supabase sin probar contra un proyecto real)
- `supabase/schema.sql`: distritos, manchas, serie_ndvi (una fila por zona y agregación), testimonios, iniciativas, con PostGIS, vistas GeoJSON y RLS. Lectura pública; testimonios/iniciativas solo se insertan como `pendiente` con consentimiento; el contacto privado de iniciativas nunca sale por la API (privilegios por columna). `seed.sql` se genera con `scripts/make_seed_sql.py`.
- Route Handlers: `/api/distritos`, `/api/manchas`, `/api/serie/[id]` (`todos`, `provincia` o código INEI), `/api/testimonios`; añadí `/api/curvas` e `/api/iniciativas`. POST: validación, rechazo de correos/teléfonos, trampa anti-bots, límite de 5 envíos/hora por IP en memoria, tope de 8 KB.
- Sin credenciales: modo local con `src/data/*.json`; testimonios en `.data/` (gitignored). `.env.example` incluido. La app solo usa la clave anon; no hay claves en el código. Supabase se consulta con `fetch` (sin dependencia nueva).
- No inventé testimonios ni iniciativas: las listas están vacías hasta que alguien envíe y se apruebe.
- El límite por IP es en memoria: en serverless no se comparte entre instancias; en producción conviene sumar uno en el borde.

## Fase 4 — Datos · HECHO (manchas reales siguen pendientes)
- `build_data.py` reescrito y reproducible, con las tres agregaciones (ver arriba). Ya no toca `manchas.json` salvo con `--manchas-prueba`.
- `scripts/build_manchas.py` + 7 pruebas pytest con un MCD64A1 sintético. No se probó con un `.nc` real de AppEEARS: la variable se busca por «Burn_Date»; el tope de 6 manchas por distrito y el mínimo de 25 ha son decisiones mías, ajustables por parámetro.
- `manchas.json` sigue con `es_de_prueba: true` y el aviso visible.

## Fase 5 — Offline · HECHO
- Service worker propio (`public/sw.js`, sin Serwist: menos dependencias y Next 16 usa Turbopack): navegación con red primero y plan B en caché; `_next/static` en caché primero; API de datos con revalidación; testimonios con red primero. Tras la primera visita la página manda al SW los recursos cargados para guardarlos.
- IndexedDB: copia de GeoJSON y resultados (respaldo si falla la red) y cola de envíos.
- Cola: sin conexión o con error 5xx, el testimonio/iniciativa queda en IndexedDB y se reenvía al volver la red (evento `online` y al abrir la app).
- Prueba «avión real» (`tests/e2e/offline.spec.ts`): apaga el servidor de verdad, recarga, navega, deja un testimonio en cola, levanta el servidor y comprueba que llegó como `pendiente`.
- Manifest + iconos PNG generados (`scripts/make_icons.mjs`).

## Fase 6 — Experiencia · HECHO
- Se mantiene el flujo completo (intro, zoom, mancha más cercana, ???, chorro, reveal, datos completos, zona coloreada, resumen final). Al volver de otra página la intro se salta.
- Panel final con tabla y enlace a `/resumen`, que exporta CSV (con las tres medidas) y PNG, grafica las tres series por zona y explica cómo leer los resultados.
- `/testimonios` con formularios de testimonio e iniciativa (consentimiento, sin datos personales públicos, cola offline).
- Modo ligero (se recuerda) y `prefers-reduced-motion` activan la versión sin efectos pesados.

## Fase 7 — Calidad · HECHO
- `npm run build` sin errores. `npm run test:unit` 15/15. `pytest` 7/7. Playwright (escritorio, Pixel 7, Firefox, WebKit, avión real): verde en la última corrida completa, salvo un parpadeo en WebKit (envío antes de hidratar) que corregí esperando la carga y que pasó después.
- Teclado probado: Tab/Enter/Esc en el flujo completo. Foco visible comprobado (3 px ámbar).
- Sin errores de consola en mapa ni páginas (solo avisos de rendimiento de WebGL en Chromium sin GPU).

## Fase 8 — Paleta/tipografía de la demo y portada · HECHO
- La paleta y las fuentes salen ahora de `winapay_demo_v3.html` (bosque `#173e32`, profundo, salvia, crema, arena, terracota, dorado; DM Serif Display + DM Sans). Sustituye a la paleta de CLAUDE.md (actualizado). Tokens en `globals.css`; el mapa y el PNG del resumen los leen de ahí.
- Fuentes con `next/font/google` (se descargan en el build y se sirven desde el propio sitio: siguen funcionando sin conexión). No se usa la foto de Unsplash de la demo (recurso externo, rompe el modo offline): el hero lleva líneas de nivel generadas (`Contornos.tsx`).
- Páginas internas (`/resumen`, `/testimonios`, `/acerca`) pasan a fondo crema con tarjetas blancas, como la demo; el mapa sigue en bosque.
- Contraste: `#70766d` (muted de la demo) da 4.2:1 sobre crema, por debajo de AA → `--apagado` `#5d645a` (5.4). Crema sobre terracota da 4.2 → texto blanco (4.7). Terracota como texto → `--terra-texto` `#9c4423`.
- NDVI explorado: dorado (bajo) → salvia (alto). Con ese relleno claro la etiqueta del distrito explorado pasa a texto bosque (`.etiqueta.explorada`).
- **Portada en `/`** (hero, tres pasos, atajos, banda de honestidad, cifras, usuarios, pie) con CTA a **`/mapa`**; el mapa se movió de `/` a `/mapa`. Manifest y service worker siguen arrancando en `/`; `/mapa` entra en la precarga offline.
- La portada no copia las secciones de la demo que la app no tiene (historias, expedientes, iniciativas ficticias, mapa Leaflet con OSM). El aviso de manchas de prueba aparece en la portada mientras `manchas.json` lo declare.
- Pruebas: `landing.spec.ts` nueva; el resto adaptado a `/mapa`. Playwright en verde (escritorio, Pixel 7, Firefox, WebKit, avión real) tras actualizar el color del foco a dorado.

## Pendiente / a revisar
1. **MCD64A1 real** (pedir en AppEEARS). Hasta entonces las manchas y su aviso son de prueba.
2. **Decisión estadística** (ver arriba): cambia titulares respecto al prototipo.
3. Supabase: probar `schema.sql` y `seed.sql` en un proyecto real; decidir hosting (Vercel/Netlify/Cloudflare). El modo local con archivos no sirve en serverless.
4. Safari real y móvil real (solo WebKit de Playwright y emulación de Pixel 7). Instalación de la PWA no probada en un teléfono.
5. Distritos del INEI siguen gruesos.
6. Wanchaq tiene 25 píxeles: su «evidencia suficiente» es poco fiable; se avisa en pantalla.
7. No hay pantalla de moderación: se hace desde Supabase o editando `.data/*.json`.
