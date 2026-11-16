# WIÑAPAY

NASA Space Apps 2026 · «El territorio cambia. Hagámoslo visible.»
App web (PWA, funciona sin conexión) sobre la evolución del verdor (NDVI, MOD13Q1) en la provincia de Cusco. Los incendios son una máscara espacial, no una segunda variable.

## Uso
    npm install
    npm run dev          # desarrollo (http://localhost:3000)
    npm run build        # build de producción
    npm start            # sirve el build (el service worker solo se registra en producción)
    npm run test:unit    # pruebas unitarias (node:test)
    npm test             # Playwright: escritorio, móvil, Firefox, WebKit y "avión real" (hace el build)
    python -m pytest tests/python   # pruebas de build_manchas.py con datos sintéticos

## Estructura
| Ruta | Qué es |
|---|---|
| `src/app/` | Páginas (`/` portada, `/mapa`, `/resumen`, `/testimonios`, `/acerca`), `manifest.ts` y Route Handlers `/api/*` |
| `src/lib/mapa.ts` | Controlador del mapa (MapLibre v5 + GSAP): cámara, capas, juego de apagar manchas |
| `src/components/` | UI en React: popup (Radix Dialog), panel final, resumen, testimonios |
| `src/lib/evidencia.ts` | Regla de evidencia (3 agregaciones + corrección BH) |
| `src/lib/repo.ts` | Acceso a datos: Supabase si hay variables de entorno, si no `src/data/*.json` |
| `public/sw.js` | Service worker (shell, datos y API; funciona sin red) |
| `supabase/schema.sql` | Esquema Postgres + PostGIS con RLS; `seed.sql` se genera con `scripts/make_seed_sql.py` |
| `scripts/` | Pipeline de datos en Python |

## API
`GET /api/distritos` · `GET /api/manchas` · `GET /api/curvas` · `GET /api/serie/[id]` (`id` = código INEI, `provincia` o `todos`) · `GET|POST /api/testimonios` · `GET|POST /api/iniciativas`.
Los POST validan, rechazan correos/teléfonos en texto público, exigen consentimiento, tienen un límite por IP y guardan todo como `pendiente`: nada se publica sin moderación.

## Modo local y Supabase
Sin variables de entorno la app lee `src/data/*.json` y guarda testimonios en `.data/*.json` (solo desarrollo/demo; en Vercel el disco es de solo lectura). Para usar Supabase: ejecuta `supabase/schema.sql`, carga `supabase/seed.sql`, copia `.env.example` a `.env.local` y completa `SUPABASE_URL` y `SUPABASE_ANON_KEY` (solo la clave anon; la seguridad la dan las políticas RLS). Moderar = cambiar `estado` a `aprobado` desde el panel de Supabase. **Esta ruta no se ha probado contra un proyecto real.**

## Datos (`src/data`)
| Archivo | Origen | Estado |
|---|---|---|
| `distritos.json` | INEI, 8 distritos, simplificado | Real |
| `curvas.json` | NASADEM, curvas cada 100 m | Real |
| `resultados.json` | MOD13Q1 v061 2001–2025: media anual, máximo anual y estación seca (may–sep), cada una con Mann-Kendall + Sen | Real |
| `manchas.json` | Manchas sintéticas, `es_de_prueba: true` | **De prueba** hasta tener MCD64A1 |

Regenerar NDVI, distritos y curvas (necesita numpy, netCDF4, matplotlib, pymannkendall):

    python -I scripts/build_data.py <carpeta_requests> data-src/cusco_distritos_raw.geojson src/data
    # añadir --manchas-prueba para regenerar también las manchas sintéticas

### Manchas reales (MCD64A1)
Cuando llegue el `.nc` de MCD64A1 (capa `Burn_Date`, AppEEARS) — necesita además scipy, rasterio y shapely:

    python -I scripts/build_manchas.py <MCD64A1.nc> src/data/distritos.json src/data/manchas.json [--min-ha 25] [--max-por-distrito 6] [--desde 2001] [--hasta 2025]

Une todas las fechas, agrupa píxeles vecinos en manchas, asigna cada una al distrito que contiene su punto representativo y conserva las mayores de cada distrito. Escribe `es_de_prueba: false`, con lo que el aviso de datos de prueba desaparece solo. Un distrito sin manchas se muestra como explorado desde el inicio, con el texto «No hay registros de incendio».
Después, para Supabase: `python -I scripts/make_seed_sql.py src/data supabase/seed.sql`.

## Notas
- MapLibre se mantiene en la serie 5.x. Sin mapa base: solo GeoJSON propio.
- El progreso del juego se guarda en `localStorage` (`winapay-progreso-v1`); las preferencias de modo ligero también.
- Las manchas «apagadas» son una metáfora de exploración, no combate real del fuego.
- Decisiones y estado por fase: ver `NOTAS.md`.
