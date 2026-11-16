# WIÑAPAY — CLAUDE.md

NASA Space Apps 2026 (virtual, 14–15 nov). "El territorio cambia. Hagámoslo visible."
App web funcional, con uso offline. Caso: provincia de Cusco, evolución del verdor (NDVI) en zonas con registro de incendios.

## Reglas del reto (no negociables)
- Solución web, funcional de punta a punta, con modo offline.
- UNA sola variable: **NDVI** (MOD13Q1 v061, 250 m, 16 días). Los incendios son máscara/filtro espacial, no una segunda variable.
- Usuario final definido: comunidades locales, ONG y empresas benéficas.
- Rentable y escalable (el modelo se documenta aparte, no se programa).
- Lenguaje honesto: si no hay significancia, decir "aún no hay evidencia suficiente". Nunca inventar tendencias.

## Estado actual
App migrada a Next.js (App Router) + TypeScript; estado por fase en NOTAS.md y README.md.
- Real: distritos INEI, curvas NASADEM (100 m), NDVI 2001–2025 con tres agregaciones (media, máximo, estación seca), Mann-Kendall + Sen y corrección BH (`src/lib/evidencia.ts`).
- De prueba: `src/data/manchas.json` (`es_de_prueba: true`). Reemplazar con MCD64A1 real (pendiente de pedir).
- Aviso "datos de prueba" visible en pantalla mientras las manchas sean sintéticas.

## Stack tecnológico
**Cliente (PWA)**
- Next.js (App Router) + React + TypeScript
- MapLibre GL **v5.x (fijo; la v6 no empaqueta en archivo único)**, sin mapa base, solo GeoJSON propio
- GSAP (+ScrollTrigger) para animación institucional: cámara, intro, chorro de agua, reveal
- Radix UI para popups/diálogos accesibles; CSS para microinteracciones
- Service Worker (Serwist o next-pwa) + IndexedDB: caché de GeoJSON, resultados y testimonios en cola
- Gráficas: SVG propio (ya hecho en `grafica(id)`)

**Backend**
- Supabase: Postgres + PostGIS, Auth, RLS, Storage
- Route Handlers de Next.js como API (`/api/distritos`, `/api/manchas`, `/api/serie/:id`, `/api/testimonios`)
- Testimonios: moderación previa, consentimiento explícito, sin datos personales públicos

**Datos / pipeline (Python 3, offline, reproducible)**
- pandas, numpy, xarray/netCDF4, scipy, pymannkendall, rasterio, shapely, geopandas
- `scripts/build_data.py`: filtro QA con VI_Quality → media anual por distrito → Mann-Kendall (95 %) + pendiente de Sen → JSON/GeoJSON
- Pendiente: agrupar MCD64A1 (Burn_Date) en manchas (polígonos con `id`, `distrito`, `area_ha`) y calcular NDVI zona quemada vs no quemada
- GitHub Actions para regenerar datos; Vercel/Netlify/Cloudflare para hosting (decisión pendiente)

## Fuentes
| Fuente | Uso | Estado |
|---|---|---|
| MOD13Q1 v061 (`..._ndvi.nc`) | NDVI, variable única | Listo |
| MCD64A1 v061 | Manchas de área quemada | **Falta pedirla (AppEEARS)** |
| MCD12Q1 v061 | Cobertura, contexto opcional | Disponible |
| NASADEM 30 m | Curvas de nivel / relieve | Listo |
| INEI + `cusco_province.shp` | Límites | Distritos gruesos; mejorar |
| MOD11A2 (LST), GPM | **No usar** (fuera de la variable única; GPM trae randomError, inútil) | Descartados |

## Paleta y tipografía (tomadas de `winapay_demo_v3.html`)
| Rol | Token | Hex |
|---|---|---|
| Verde bosque (fondo del mapa, nav, bandas) | `--bosque` | `#173e32` |
| Verde profundo (distritos base, degradados) | `--profundo` | `#244d3c` |
| Salvia (NDVI alto, texto suave sobre bosque) | `--salvia` | `#a8b59a` |
| Crema (fondo de páginas, texto sobre bosque) | `--crema` | `#f4f0e3` |
| Arena (franjas, avisos) | `--arena` | `#e5d8bd` |
| Terracota (manchas/fuego, alerta) | `--terracota` | `#b9542d` |
| Dorado (acento, botones, foco, NDVI bajo) | `--dorado` | `#d9a441` |
| Tinta / apagado / línea / blanco | `--tinta` `--apagado` `--linea` `--blanco` | `#252a26` `#5d645a` `#dedccd` `#fffdf7` |

Tipografía: **DM Serif Display** (títulos, marca «wiñapay.») y **DM Sans** (texto), vía `next/font/google` (autoalojadas en el build, funcionan sin conexión).
Contraste verificado (WCAG AA): crema/bosque 10.4, salvia/bosque 5.5, dorado/bosque 5.3, bosque/dorado 5.3, blanco/terracota 4.7, apagado/crema 5.4. Evitar: crema sobre terracota (4.2), dorado sobre blanco/arena, `#70766d` de la demo sobre crema (4.2; por eso `--apagado` es `#5d645a`), terracota como texto (usar `--terra-texto` `#9c4423`).

## Flujo de la experiencia (mapa)
1. Carga: provincia se dibuja distrito por distrito (GSAP), con curvas y manchas.
2. Clic en distrito: cámara con zoom, pitch 58°, bearing −18°.
3. Clic en cualquier punto: se elige la mancha más cercana; popup con datos incompletos (`???`).
4. "Apagar": chorro de agua, la mancha se apaga, se revela un dato.
5. Todas apagadas: datos completos (NDVI medio, cambio por década, evidencia, frase ciudadana, tendencia en gráfica).
6. Distrito explorado queda coloreado por NDVI. Con los 8 explorados: resumen de la provincia.
- Progreso en `localStorage` (`winapay-progreso-v1`). "Modo ligero" y `prefers-reduced-motion`. Móvil: popup como bottom-sheet.

## Por construir (prioridad)
1. Migrar a Next.js + TS conservando `main.js` como módulo del mapa.
2. Aplicar paleta nueva.
3. Datos reales de manchas (MCD64A1) cuando llegue; mientras tanto, mantener las de prueba marcadas.
4. PWA offline (service worker + IndexedDB) y prueba en modo avión.
5. Testimonios e iniciativas de recuperación (formulario + moderación).
6. Vista final por variable (NDVI) para el usuario, con exportación de resultados.
7. Pruebas: teclado, móvil, Chrome/Firefox/Safari.

## Comandos
- `npm install` · `npm run dev` · `npm run build` · `npm start` · `npm test` (Playwright) · `npm run test:unit`
- Datos: `python -I scripts/build_data.py <carpeta_requests> data-src/cusco_distritos_raw.geojson src/data`; manchas reales: `scripts/build_manchas.py` (ver README)

## Plazos
Video local: domingo 15 nov, 16:00 (según slides, sin confirmar). Proyecto global cierra 23:59.
