# WIÑAPAY — Resumen maestro del proyecto
> NASA Space Apps Challenge 2026 · Cusco, Perú
> Reto: "Be an Earth Systems Trend Detective!"
> Eslogan: *El territorio tiene memoria. Hagámosla visible.*

---

## 1. ¿Qué es WIÑAPAY?

Plataforma web interactiva (PWA) que convierte datos satelitales de la NASA en evidencia comprensible sobre los cambios ambientales en la **provincia de Cusco**, conectándolos con el **impacto humano real** a través de historias, testimonios y análisis estadístico verificable.

No es un visor de mapas. Es un expediente territorial vivo.

---

## 2. Problema que resuelve

| Problema | Consecuencia |
|---|---|
| Datos satelitales dispersos en múltiples fuentes | Ningún ciudadano puede acceder fácilmente |
| Interpretación técnica requerida | Organizaciones y comunidades quedan excluidas |
| Cambios ambientales invisibles sin contexto | Sin evidencia, no hay acción ni financiamiento |
| Testimonios aislados sin datos científicos | Poca credibilidad ante financiadores |

---

## 3. Usuario final definido

**Comunidades de la provincia de Cusco** y las **organizaciones que trabajan con ellas** (ONG, fundaciones, programas sociales de empresas), que usan la plataforma para:

- Entender cómo cambia el territorio
- Sustentar proyectos de prevención con evidencia
- Rendir cuentas a financiadores con datos verificables
- Visibilizar testimonios de las personas afectadas

---

## 4. Variable principal

**NDVI** (Índice de Vegetación de Diferencia Normalizada)
- Producto: **MOD13Q1 v061** (MODIS Terra, 250 m, composición 16 días)
- Período: 2001–2025
- Área: Provincia de Cusco, todos sus distritos
- Los incendios (MCD64A1) funcionan como **máscara/filtro espacial**, no como segunda variable

---

## 5. Flujo de experiencia (UX principal)

```
LANDING (impacto + concientización)
  │
  ▼
MAPA INTERACTIVO
  ├── Puntos de zona con datos → clic → chorro de agua → modal impactante (dato simple)
  ├── Repetir N veces (suficiente para concientizar, no tanto para aburrir)
  └── Todos los puntos revelados → animación de transición
  │
  ▼
DASHBOARD DETALLADO (por distrito/zona)
  ├── Gráficos NDVI con tendencia estadística
  ├── Selector de período (innovador, NO slider clásico)
  ├── Datos por distrito filtrable
  └── Acceso directo a Historias/Testimonios
  │
  ▼
HISTORIAS Y TESTIMONIOS
  └── Voces reales de comunidades afectadas
```

---

## 6. Diferencial del proyecto

| Otros proyectos | WIÑAPAY |
|---|---|
| Solo muestran datos | Conectan datos + historia + acción |
| Lenguaje técnico | Lenguaje ciudadano verificable |
| Estáticos | Interactivos y dinámicos por período |
| Sin contexto humano | Testimonios moderados con consentimiento |

---

## 7. Datos NASA disponibles (en `/Data`)

| Archivo | Producto | Uso |
|---|---|---|
| `MOD13Q1.061_250m_aid0001_ndvi.nc` | NDVI 250m 16-días | Variable principal ✅ |
| `MOD13Q1.061_250m_aid0001.nc` | EVI + QA flags | Control de calidad ✅ |
| `MCD64A1.061_500m_aid0001.nc` | Área quemada 500m | Máscara espacial |
| `MCD12Q1.061_500m_aid0001.nc` | Land Cover | Contexto opcional |
| `MOD11A2.061_1km_aid0001.nc` | LST temperatura | Contexto opcional |
| `NASADEM_NC.001_30m_aid0001.nc` | Elevación DEM | Curvas de nivel ✅ |
| `giovanni_imerg_monthly.csv` | GPM precipitación | ⚠️ Tiene randomError, descartar |
| `cusco_province.shp` | Shapefile provincial | Límites geográficos ✅ |

---

## 8. Stack tecnológico (resumen)

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript |
| Mapas | MapLibre GL v5.x (sin mapa base, solo GeoJSON) |
| Animación institucional | GSAP + ScrollTrigger |
| Animación ciudadana | CSS transform/opacity puro |
| Popups/diálogos | Radix UI |
| Offline | Service Worker (Serwist) + IndexedDB |
| Backend | Supabase (PostgreSQL + PostGIS, Auth, RLS, Storage) |
| API | Route Handlers de Next.js |
| Pipeline datos | Python 3: pandas, xarray, scipy, pymannkendall |
| Hosting | Vercel / Netlify / Cloudflare Pages |
| CI | GitHub Actions |

---

## 9. Paleta de colores (tokens CSS)

| Token | Hex | Uso |
|---|---|---|
| `--bosque` | `#173e32` | Fondo nav, fondo mapa, bandas oscuras |
| `--profundo` | `#244d3c` | Distritos base, degradados |
| `--salvia` | `#a8b59a` | NDVI alto, texto suave sobre bosque |
| `--crema` | `#f4f0e3` | Fondo páginas, texto sobre bosque |
| `--arena` | `#e5d8bd` | Franjas, avisos, separadores |
| `--terracota` | `#b9542d` | Manchas de fuego, alertas, interacción |
| `--dorado` | `#d9a441` | Acento, botones, foco, NDVI bajo |
| `--tinta` | `#252a26` | Texto principal |
| `--apagado` | `#5d645a` | Texto secundario |
| `--blanco` | `#fffdf7` | Superficies claras |

---

## 10. Tipografía

- **Títulos / marca**: DM Serif Display
- **Texto / UI**: DM Sans
- Ambas via `next/font/google` (auto-alojadas, funcionan offline)

---

## 11. Reglas irrenunciables

1. **Una sola variable**: NDVI. No inventar una segunda.
2. **Lenguaje honesto**: si no hay significancia estadística → "aún no hay evidencia suficiente", NUNCA "no hay cambio".
3. **Datos de prueba siempre marcados** con `es_de_prueba: true` y aviso visible en pantalla.
4. **Sin datos personales públicos** en testimonios. Consentimiento explícito.
5. **Sin testimonios generados por IA**.
6. **Ninguna función crítica depende de una animación** (accesibilidad).
7. **`prefers-reduced-motion`** siempre respetado.
8. **Resultados numéricos** siempre rastreables hasta su fuente NASA.

---

## 12. Estado del prototipo (Prototipo 1)

Ubicación: `Prototipo 1/wiñapay-map/`

Lo que ya existe:
- Estructura Next.js (App Router) + TypeScript
- Distritos INEI, curvas NASADEM 100m
- NDVI 2001–2025 con tres agregaciones (media, máximo, estación seca)
- Mann-Kendall + Sen + corrección BH (`src/lib/evidencia.ts`)
- APIs: `/api/distritos`, `/api/manchas`, `/api/serie/:id`, `/api/testimonios`
- Manchas de prueba (`es_de_prueba: true`) — falta MCD64A1 real

Lo que falta:
- Landing impactante con la experiencia de concientización
- Rediseño con la paleta y tipografía final
- Dashboard detallado con selector de período innovador
- Sección de historias/testimonios completa
- PWA offline completo
- Datos reales de manchas (MCD64A1)

---

## 13. Responsabilidades del equipo

| Área | Responsable |
|---|---|
| Arquitectura + lógica + integración | Este plan (Gemini/AGY) |
| Pipeline de datos | Este plan (Gemini/AGY) |
| Diseño visual + animaciones | Compañero de equipo (Claude Code) |
| Revisión final e integración diseño | Plan de integración (ver `/Plan`) |
