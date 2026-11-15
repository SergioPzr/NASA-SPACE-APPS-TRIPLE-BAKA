# WIÑAPAY — Orden de implementación
> Documento de referencia rápida para cualquier agente o desarrollador que retome el proyecto
> Leer esto PRIMERO antes de abrir cualquier Plan

---

## Regla clave: no es puramente secuencial

**Plan B y Plan A pueden correr en paralelo** porque el frontend tiene fallback automático a los JSONs existentes en `src/data/`. No necesitas los datos reales para construir la lógica — trabajas con los de prueba y luego los reemplazas.

---

## Mapa de dependencias

```
╔══════════════════════════════════════════════════════════════╗
║  FASE 1 — Paralelo (pueden hacerse al mismo tiempo)         ║
║                                                              ║
║  ┌─────────────────────────┐  ┌──────────────────────────┐  ║
║  │   PLAN B: Pasos 0–9     │  │  PLAN A: Fases 0–3       │  ║
║  │   Pipeline de datos     │  │  Setup + APIs base       │  ║
║  │   (Python)              │  │  (Next.js + TS)          │  ║
║  │                         │  │                          │  ║
║  │  Prerequisito:          │  │  Prerequisito:           │  ║
║  │  · Archivos .nc en /Data│  │  · npm install OK        │  ║
║  │  · Python + deps        │  │  · .env.local creado     │  ║
║  └────────────┬────────────┘  └────────────┬─────────────┘  ║
╚═══════════════╪════════════════════════════╪════════════════╝
                │                            │
                ▼                            ▼
╔══════════════════════════════════════════════════════════════╗
║  FASE 2 — Plan A: Fases 4–7 + Plan B: Paso 10 (paralelo)   ║
║                                                              ║
║  ┌─────────────────────────┐  ┌──────────────────────────┐  ║
║  │  PLAN A: Fases 4–7      │  │  PLAN B: Paso 10         │  ║
║  │  Mapa de concientización│  │  Testimonios desde       │  ║
║  │  Dashboard              │  │  fuentes públicas        │  ║
║  │  Offline / SW           │  │  (investigación manual)  │  ║
║  │                         │  │                          │  ║
║  │  Prerequisito:          │  │  Prerequisito:           │  ║
║  │  · Fase 0–3 completas   │  │  · Nada técnico          │  ║
║  │  · JSONs de Plan B      │  │  · Solo tiempo de búsq.  │  ║
║  └────────────┬────────────┘  └────────────┬─────────────┘  ║
╚═══════════════╪════════════════════════════╪════════════════╝
                │                            │
                └────────────┬───────────────┘
                             ▼
╔══════════════════════════════════════════════════════════════╗
║  FASE 3 — Diseño visual (Claude Code)                       ║
║                                                              ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │  CLAUDE.md (raíz) → guía completa del diseñador     │    ║
║  │  Informacion/02_ESPECIFICACION_UX.md → flujo UX     │    ║
║  │  Plan/PLAN_C_integracion.md → qué puede/no tocar    │    ║
║  │                                                     │    ║
║  │  Prerequisito: Plan A Fases 0–6 completas           │    ║
║  │  (el diseñador necesita la lógica funcionando        │    ║
║  │  para saber qué animar y cuándo)                    │    ║
║  └────────────────────────┬────────────────────────────┘    ║
╚════════════════════════════╪═════════════════════════════════╝
                             ▼
╔══════════════════════════════════════════════════════════════╗
║  FASE 4 — Plan C: Integración + Verificación final          ║
║                                                              ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │  Checklist de integración (sección 3 de Plan C)     │    ║
║  │  Pruebas: desktop, móvil, Chrome/Firefox/Safari     │    ║
║  │  Modo avión, testimonios offline                    │    ║
║  │  Despliegue a URL pública (Vercel/Netlify)          │    ║
║  │                                                     │    ║
║  │  Prerequisito: Todo lo anterior completo            │    ║
║  └─────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Checklist de prerequisitos antes de empezar

```bash
# Verificar que el prototipo arranca
cd "Prototipo 1/wiñapay-map"
npm install
npm run dev        # Debe abrir en localhost:3000

# Verificar que el build no está roto
npm run build

# Verificar Python para el pipeline
python --version   # 3.10+
pip install pandas numpy xarray netCDF4 scipy pymannkendall rasterio shapely geopandas statsmodels
```

Y crear `.env.local` a partir de `.env.example` (Supabase puede quedar vacío por ahora — el sistema usa JSONs locales como fallback).

---

## Tabla de decisiones importantes ya tomadas

| Decisión | Valor | Respaldo |
|---|---|---|
| Variable principal | NDVI (MOD13Q1 v061, 250m) | Instrucción del asesor |
| Número de puntos en el mapa | **5** | Goal Gradient + Endowed Progress + Miller adaptado |
| Selector de período | **Constelación orbital** | Estética NASA + innovación |
| Período de análisis | 2001–2025 | Datos disponibles |
| Rango mínimo seleccionable | 5 años | Mann-Kendall necesita n ≥ 10 observaciones |
| Manchas de prueba | Mantener con `es_de_prueba: true` | Hasta tener MCD64A1 procesado |
| GPM IMERG | **Descartado** | randomError en columnas |
| LST (MOD11A2) | **Descartado** | "No usar", fuera de variable única |
| Tipografía | DM Serif Display + DM Sans | Decisión de marca |
| Animación institucional | GSAP + ScrollTrigger | Solo en pantallas institucionales |
| Animación ciudadana | CSS puro | Flujo de testimonios |
| Significancia estadística | Mann-Kendall + BH (FDR 5%) | Estándar para n series simultáneas |

---

## Qué hace cada plan — resumen de una línea

| Plan | Qué hace | Stack |
|---|---|---|
| **Plan B** | Convierte los `.nc` de NASA en JSONs con tendencias y testimonios | Python |
| **Plan A** | Construye la lógica: APIs, mapa, dashboard, offline | Next.js + TS |
| **Plan C** | Verifica que diseño + datos + lógica funcionan juntos | Checklist |
| **CLAUDE.md** | Guía al diseñador para el diseño visual | Claude Code |

---

## Si retomas con un token limitado — por dónde empezar

```
1. Lee este archivo (00 segundos de contexto)
2. Mira el Checklist de integración en Plan/PLAN_C_integracion.md sección 3
   → Los ✅ ya están hechos, los [ ] son lo que falta
3. Continúa desde el primer [ ] sin tildar
```
