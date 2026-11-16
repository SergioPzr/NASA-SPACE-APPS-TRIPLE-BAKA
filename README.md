# WIÑAPAY 🌿
> *El territorio cambia. Hagámoslo visible.*

Plataforma web interactiva que convierte datos satelitales de la NASA en información comprensible sobre cómo cambió la vegetación de la provincia de **Cusco, Perú**.

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
├── README.md                ← Este archivo
├── Data/                    ← Datos crudos de la NASA (NetCDF, Shapefile) para regenerar los datos
│   ├── MOD13Q1.061_250m_aid0001_ndvi.nc   ← Vegetación (NDVI)
│   ├── MCD64A1.061_500m_aid0001.nc        ← Áreas quemadas
│   ├── NASADEM_NC.001_30m_aid0001.nc      ← Relieve
│   ├── cusco_province.shp                 ← Límites de la provincia
│   └── ...
│
└── Prototipo 1/wiñapay-map/ ← Aplicación (Next.js + TypeScript)
    ├── src/app/             ← Páginas: portada, mapa, resumen, testimonios, cómo ayudar, acerca
    ├── src/components/      ← Componentes React
    ├── src/data/            ← Datos procesados (JSON)
    ├── src/lib/             ← Lógica: estadística, acceso a datos, mapa
    ├── public/              ← Imágenes, iconos y service worker (modo sin conexión)
    ├── scripts/             ← Pipeline Python que genera src/data desde Data/
    ├── supabase/            ← Esquema opcional de base de datos
    └── tests/               ← Pruebas
```

## Variable principal

**Vegetación (NDVI)** · MODIS MOD13Q1 v061, 250 m · 2001–2025 · Provincia de Cusco

## Stack

Next.js · TypeScript · MapLibre GL v5 · GSAP · Supabase (opcional) · Pipeline en Python
