# WIÑAPAY — Contrato de datos y arquitectura de información
> Documento de referencia para todos los agentes y desarrolladores
> Cualquier cambio en esta estructura debe comunicarse a TODO el equipo

---

## 1. Contrato JSON principal (entre pipeline ↔ frontend)

Este es el contrato que el pipeline Python genera y el frontend consume. **No modificar sin actualizar todos los consumidores.**

```json
{
  "region": {
    "id": "string — ubigeo INEI del distrito",
    "nombre": "string — nombre oficial del distrito",
    "provincia": "Cusco",
    "departamento": "Cusco",
    "geometria": "GeoJSON Feature (Polygon)"
  },
  "variable": {
    "id": "ndvi",
    "nombre": "NDVI — Índice de Vegetación de Diferencia Normalizada",
    "unidad": "adimensional (-1 a 1)",
    "definicion_simple": "Mide qué tan verde y viva está la vegetación. Más cerca de 1 = más verde. Más cerca de -1 = sin vegetación.",
    "dataset": "MOD13Q1 v061",
    "fuente_url": "https://doi.org/10.5067/MODIS/MOD13Q1.061"
  },
  "serie": [
    { "t": "2001-01", "v": 0.42, "calidad": "buena" },
    { "t": "2001-02", "v": 0.38, "calidad": "buena" }
  ],
  "metodo": {
    "agregacion": "anual | mensual | estacion_seca",
    "sin_estacionalidad": true,
    "prueba": "mann-kendall",
    "nivel": 0.95,
    "correccion": "benjamini-hochberg"
  },
  "resultado": {
    "pendiente_por_anio": -0.003,
    "ic95": [-0.005, -0.001],
    "p": 0.023,
    "tau": -0.31,
    "n": 24,
    "significativo": true,
    "direccion": "baja",
    "frase_ciudadana": "La vegetación en este distrito viene perdiendo verdor a un ritmo de 0.3 % por año desde 2001, con evidencia estadística suficiente (95 %)."
  },
  "manchas": [
    {
      "id": "string",
      "distrito_id": "string",
      "area_ha": 0.0,
      "fecha_inicio": "YYYY-MM-DD",
      "fecha_fin": "YYYY-MM-DD",
      "geometria": "GeoJSON Feature (Polygon)",
      "es_de_prueba": false
    }
  ],
  "calidad": {
    "es_de_prueba": false,
    "pixeles_validos_pct": 0.87,
    "limitaciones": ["Nubes frecuentes en temporada lluviosa reducen pixeles disponibles"]
  },
  "procedencia": {
    "obtenido": "2026-11-14",
    "url": "https://appeears.earthdatacloud.nasa.gov/",
    "procesado": "2026-11-15",
    "script": "scripts/build_data.py"
  }
}
```

### Reglas del contrato

1. `resultado.significativo = false` → `frase_ciudadana` siempre dice "aún no hay evidencia suficiente para afirmar una tendencia", NUNCA "no hay cambio".
2. `es_de_prueba: true` en cualquier nivel → aviso visible obligatorio en la UI.
3. `direccion` solo puede ser: `"sube"`, `"baja"`, `"sin_cambio"`.
4. La `frase_ciudadana` la genera el **servidor**, no el frontend, para garantizar consistencia.
5. Los valores de `ic95` son el intervalo de confianza 95% de la pendiente de Sen.

---

## 2. Estructura de archivos JSON estáticos (modo offline)

```
src/data/
├── distritos.json          ← GeoJSON con todos los distritos de Cusco (INEI)
├── curvas.json             ← Curvas de nivel NASADEM 100m para el mapa
├── manchas.json            ← Polígonos de área quemada (MCD64A1 o prueba)
├── resultados.json         ← Resultados Mann-Kendall por distrito
└── series/
    ├── {ubigeo}_anual.json     ← Serie anual por distrito
    ├── {ubigeo}_mensual.json   ← Serie mensual
    └── {ubigeo}_seca.json      ← Serie estación seca
```

---

## 3. Modelo de base de datos (Supabase/PostgreSQL)

### Tabla: `territorios`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | Identificador único |
| ubigeo | text UNIQUE | Código INEI del distrito |
| nombre | text | Nombre oficial |
| nivel | text | 'provincia' \| 'distrito' |
| geometria | geometry(Polygon, 4326) | PostGIS |
| provincia | text | Nombre de la provincia |

### Tabla: `series`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | - |
| territorio_id | uuid FK | Referencia a territorios |
| variable_id | text | 'ndvi' |
| fecha | date | Fecha de la observación |
| valor | numeric(8,4) | Valor de la variable |
| calidad | text | 'buena' \| 'media' \| 'baja' |
| agregacion | text | 'mensual' \| 'anual' \| 'seca' |

### Tabla: `resultados_tendencia`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | - |
| territorio_id | uuid FK | - |
| variable_id | text | 'ndvi' |
| desde | integer | Año de inicio del análisis |
| hasta | integer | Año fin del análisis |
| metodo | text | 'mann-kendall' |
| pendiente_anual | numeric(8,6) | Pendiente de Sen |
| ic95_inf | numeric(8,6) | Límite inferior IC 95% |
| ic95_sup | numeric(8,6) | Límite superior IC 95% |
| p | numeric(6,4) | Valor p |
| tau | numeric(5,3) | Tau de Kendall |
| n | integer | Número de observaciones |
| significativo | boolean | p < 0.05 con corrección BH |
| direccion | text | 'sube' \| 'baja' \| 'sin_cambio' |
| frase_ciudadana | text | Texto generado en servidor |
| calculado_en | timestamptz | Timestamp del cálculo |

### Tabla: `manchas`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | - |
| territorio_id | uuid FK | Distrito donde se ubica |
| area_ha | numeric(10,2) | Área en hectáreas |
| fecha_inicio | date | Inicio del período quemado |
| fecha_fin | date | Fin del período quemado |
| geometria | geometry(Polygon, 4326) | PostGIS |
| es_de_prueba | boolean | DEFAULT true hasta tener MCD64A1 real |
| fuente | text | 'MCD64A1' \| 'prueba' |

### Tabla: `testimonios`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | - |
| territorio_id | uuid FK | Distrito relacionado |
| texto | text | Contenido del testimonio |
| periodo_observado | text | Período al que se refiere |
| tema | text | Tema principal |
| consentimiento_publicar | boolean | Obligatorio true para publicar |
| consentimiento_anonimo | boolean | Si se publica sin nombre |
| estado | text | 'pendiente' \| 'aprobado' \| 'rechazado' |
| creado_en | timestamptz | - |
| moderado_por | uuid FK → perfiles | - |

### Tabla: `organizaciones`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | - |
| nombre | text | - |
| tipo | text | 'ong' \| 'fundacion' \| 'empresa' \| 'estatal' |
| contacto | jsonb | Email, web, redes |
| territorios_ids | uuid[] | Distritos donde trabajan |
| descripcion | text | - |
| fuente_url | text | URL de verificación |

---

## 4. Endpoints de la API

| Ruta | Método | Parámetros | Respuesta | Acceso |
|---|---|---|---|---|
| `/api/distritos` | GET | - | GeoJSON FeatureCollection | Público |
| `/api/manchas` | GET | `distrito_id?` | GeoJSON FeatureCollection | Público |
| `/api/serie/:ubigeo` | GET | `agregacion`, `desde`, `hasta` | Contrato JSON completo | Público |
| `/api/tendencia` | GET | `ubigeo`, `desde`, `hasta` | Resultado tendencia | Público |
| `/api/testimonios` | GET | `territorio_id?` | Array testimonios aprobados | Público |
| `/api/testimonios` | POST | Body: texto, territorio_id, etc. | 201 Created | Público + captcha |
| `/api/testimonios/:id` | PATCH | Body: estado | 200 OK | Moderador |
| `/api/organizaciones` | GET | `territorio_id?` | Array organizaciones | Público |
| `/api/resumen-provincia` | GET | `desde?`, `hasta?` | Resumen agregado | Público |

---

## 5. Estructura de rutas Next.js

```
src/app/
├── page.tsx                    ← Landing (concientización)
├── mapa/page.tsx               ← Mapa interactivo con puntos
├── dashboard/page.tsx          ← Vista detallada por distrito
├── historias/page.tsx          ← Historias y testimonios
├── metodologia/page.tsx        ← Transparencia de fuentes
├── api/
│   ├── distritos/route.ts
│   ├── manchas/route.ts
│   ├── serie/[ubigeo]/route.ts
│   ├── tendencia/route.ts
│   ├── testimonios/route.ts
│   ├── organizaciones/route.ts
│   └── resumen-provincia/route.ts
└── layout.tsx                  ← Navbar permanente, fonts, SW
```

---

## 6. Flujo de datos completo

```
[NASA AppEEARS]
      │ MOD13Q1_ndvi.nc, MCD64A1.nc, NASADEM.nc
      ▼
[Python Pipeline — scripts/build_data.py]
      │ Filtro QA → Agregación → Mann-Kendall → Sen → BH
      ▼
[JSON estáticos — src/data/]  ←── [Supabase PostgreSQL]
      │                                     │
      ▼                                     ▼
[Service Worker + IndexedDB]    [API Routes Next.js]
      │                                     │
      └─────────────────────────────────────┘
                        │
                        ▼
              [Cliente React / MapLibre]
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
         [Mapa interactivo]  [Dashboard detallado]
              │                   │
              ▼                   ▼
         [Modal impactante]  [Gráficas + Historias]
```
