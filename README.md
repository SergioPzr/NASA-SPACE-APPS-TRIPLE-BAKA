# WIÑAPAY 🌿
> *El territorio tiene memoria. Hagámosla visible.*

Plataforma web interactiva que convierte datos satelitales de la NASA en evidencia comprensible sobre los cambios ambientales en la provincia de **Cusco, Perú**.

**NASA Space Apps Challenge 2026** · Reto: *"Be an Earth Systems Trend Detective!"*

---

## Inicio rápido

```bash
cd "Prototipo 1/wiñapay-map"
npm install
npm run dev        # → http://localhost:3000
npm run build      # Verificar que el build no está roto
npm run test:unit  # Pruebas del motor estadístico
```

## Estructura del repositorio

```
/
├── CLAUDE.md                ← Instrucciones para el agente de diseño (Claude Code)
├── GEMINI.md                ← Instrucciones para retomar con Gemini/Antigravity
├── README.md                ← Este archivo
│
├── Informacion/             ← Documentos de contexto permanente
│   ├── 00_RESUMEN_PROYECTO.md
│   ├── 01_ARQUITECTURA_Y_CONTRATOS.md
│   └── 02_ESPECIFICACION_UX.md
│
├── Plan/                    ← Planes de implementación por área
│   ├── PLAN_A_arquitectura_logica.md   ← Lógica y arquitectura (Dev)
│   ├── PLAN_B_datos_pipeline.md        ← Pipeline Python de datos NASA
│   └── PLAN_C_integracion.md           ← Integración lógica + datos + diseño
│
├── Data/                    ← Archivos de datos NASA (NetCDF, Shapefile, CSV)
│   ├── MOD13Q1.061_250m_aid0001_ndvi.nc   ← NDVI principal ✅
│   ├── MCD64A1.061_500m_aid0001.nc        ← Área quemada
│   ├── NASADEM_NC.001_30m_aid0001.nc      ← Elevación DEM ✅
│   ├── cusco_province.shp                 ← Límites provinciales ✅
│   └── ...
│
├── Ideas diseno/            ← Referencias visuales para el diseñador
│
└── Prototipo 1/wiñapay-map/ ← Código fuente principal (Next.js + TypeScript)
    ├── src/app/             ← Rutas Next.js App Router
    ├── src/components/      ← Componentes React
    ├── src/data/            ← JSONs estáticos (datos procesados)
    ├── src/lib/             ← Lógica: Mann-Kendall, formatos, IndexedDB
    └── scripts/             ← Pipeline Python de datos
```

## Variable principal

**NDVI** (MOD13Q1 v061, 250m) · 2001–2025 · Provincia de Cusco

## Stack

Next.js · TypeScript · MapLibre GL v5 · GSAP · Supabase · Python pipeline

## Documentación completa

Ver carpeta [`Informacion/`](./Informacion/) y [`Plan/`](./Plan/).
