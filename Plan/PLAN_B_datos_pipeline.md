# Plan B — Recolección, validación, filtrado y tratamiento de datos
> **Responsable**: Analista de datos / Agente de IA de pipeline
> **Prerequisito**: Leer `Informacion/00_RESUMEN_PROYECTO.md` y `Informacion/01_ARQUITECTURA_Y_CONTRATOS.md`
> **Stack Python**: pandas, numpy, xarray, netCDF4, scipy, pymannkendall, rasterio, shapely, geopandas

---

## Visión general

El pipeline toma los archivos `.nc` (NetCDF) de la NASA disponibles en `/Data`, los procesa, calcula tendencias estadísticas por distrito, y genera:
1. Archivos JSON estáticos para consumo offline del frontend
2. Datos listos para insertar en Supabase

**Variable principal**: NDVI (MOD13Q1 v061, 250m, 16 días)
**Período**: 2001–2025
**Área**: Provincia de Cusco, por distrito

---

## PASO 0 — Inventario de archivos disponibles

```
Data/
├── MOD13Q1.061_250m_aid0001_ndvi.nc    ← NDVI principal (11.6 MB) ✅
├── MOD13Q1.061_250m_aid0001.nc         ← EVI + QA flags (12.7 MB) ✅
├── MCD64A1.061_500m_aid0001.nc         ← Área quemada (365 KB) ✅
├── MCD12Q1.061_500m_aid0001.nc         ← Land Cover (53 KB)
├── MOD11A2.061_1km_aid0001.nc          ← LST temperatura (905 KB)
├── NASADEM_NC.001_30m_aid0001.nc       ← Elevación DEM (603 KB) ✅
├── NASADEM_NUMNC.001_30m_aid0001.nc    ← Número de observaciones DEM
├── giovanni_imerg_monthly.csv          ← GPM precipitación ⚠️ DESCARTAR
├── cusco_province.shp                  ← Límites provinciales ✅
├── cusco_province.dbf / .prj / .shx    ← Componentes del shapefile ✅
├── search1.xml / search2.xml / ...     ← Metadatos de búsqueda (referencia)
└── context.txt                         ← Notas del analista
```

> **GPM IMERG**: el CSV tiene `randomError` en las columnas, lo que indica que son estimaciones con alta incertidumbre. **Descartar** para el análisis principal. No usar para ninguna conclusión estadística.

---

## PASO 1 — Exploración inicial de los datos

### Script: `scripts/01_explorar_datos.py`

```python
"""
Exploración inicial de los archivos NetCDF.
Ejecutar primero para entender la estructura de los datos.
Salida: scripts/output/01_exploracion.txt
"""
import xarray as xr
import numpy as np

# Explorar NDVI
ds_ndvi = xr.open_dataset('Data/MOD13Q1.061_250m_aid0001_ndvi.nc')
print("=== NDVI ===")
print(ds_ndvi)
print("Variables:", list(ds_ndvi.data_vars))
print("Coordenadas:", list(ds_ndvi.coords))
print("Tiempo:", ds_ndvi.time.values[[0, -1]])  # primer y último registro
print("Rango de valores:", float(ds_ndvi['_250m_16_days_NDVI'].min()), 
      float(ds_ndvi['_250m_16_days_NDVI'].max()))

# Explorar QA flags
ds_qa = xr.open_dataset('Data/MOD13Q1.061_250m_aid0001.nc')
print("\n=== QA FLAGS ===")
print(list(ds_qa.data_vars))

# Explorar área quemada
ds_fuego = xr.open_dataset('Data/MCD64A1.061_500m_aid0001.nc')
print("\n=== ÁREA QUEMADA ===")
print(ds_fuego)

# Verificar proyección
print("\nProyección NDVI:", ds_ndvi.attrs.get('crs', 'No especificada'))
```

### Variables a identificar en cada archivo:

**MOD13Q1_ndvi.nc**:
- Variable NDVI: nombre exacto de la variable (probablemente `_250m_16_days_NDVI`)
- Factor de escala: el NDVI de MODIS se multiplica por 10000, dividir entre 10000
- Valor de relleno: típicamente -3000 → tratar como NaN
- Rango válido: [-2000, 10000] en datos crudos → [-0.2, 1.0] tras escala

**MOD13Q1.nc (QA)**:
- Variable VI Quality: `_250m_16_days_VI_Quality`
- Bits 0-1: 00 = producido con buena calidad, 01 = producido pero necesita verificación
- Píxeles con calidad 10 o 11 (binario) → descartar

**MCD64A1.nc (fuego)**:
- Variable principal: probablemente `Burn_Date`
- Valor 0 = no quemado, > 0 = día del año en que se quemó
- Variable QA: `QA` o `Burn_Date_Uncertainty`

---

## PASO 2 — Control de calidad del NDVI

### Script: `scripts/02_procesar_ndvi.py`

```python
"""
Aplica filtro de calidad al NDVI y genera series limpias por distrito.
"""
import xarray as xr
import numpy as np
import geopandas as gpd
from shapely.geometry import mapping
import json

# --- 2.1 Cargar datos ---
ds_ndvi = xr.open_dataset('Data/MOD13Q1.061_250m_aid0001_ndvi.nc')
ds_qa = xr.open_dataset('Data/MOD13Q1.061_250m_aid0001.nc')

# --- 2.2 Escalar NDVI ---
# El NDVI de MODIS viene multiplicado por 10000
ndvi_raw = ds_ndvi['_250m_16_days_NDVI']  # Ajustar nombre de variable si difiere
ndvi = ndvi_raw.where(ndvi_raw != -3000)   # Enmascarar fill values
ndvi = ndvi / 10000.0                      # Escalar a rango real [-1, 1]
ndvi = ndvi.where((ndvi >= -0.2) & (ndvi <= 1.0))  # Rango físicamente válido

# --- 2.3 Aplicar filtro QA ---
# Bits 0-1 del VI_Quality: 00 y 01 son buena calidad, 10 y 11 son malos
vi_quality = ds_qa['_250m_16_days_VI_Quality']  # Ajustar nombre
# Extraer bits 0-1 (usar bitwise AND con 3 = 0b11)
qa_bits = (vi_quality.values & 3).astype(np.uint8)
qa_mask_buena = (qa_bits == 0) | (qa_bits == 1)  # True = buena calidad

# Aplicar máscara al NDVI
ndvi_limpio = ndvi.where(qa_mask_buena)

# --- 2.4 Cargar distritos ---
distritos = gpd.read_file('Data/cusco_province.shp')
# Si el shapefile solo tiene la provincia (no distritos), usar límites INEI
# Ver nota abajo sobre límites

# --- 2.5 Extraer NDVI por distrito ---
# Para cada distrito: calcular media espacial de píxeles válidos dentro del polígono
def extraer_ndvi_distrito(ndvi_da, distrito_geom, min_pixeles=10):
    """
    Extrae la serie temporal de NDVI para un polígono.
    Retorna NaN si hay menos de min_pixeles válidos.
    """
    # Clip espacial al polígono del distrito
    ndvi_clip = ndvi_da.rio.clip([mapping(distrito_geom)], crs=4326, drop=True)
    
    # Media espacial por timestep
    serie = ndvi_clip.mean(dim=['x', 'y'], skipna=True)
    
    # Contar píxeles válidos por timestep
    conteo = ndvi_clip.count(dim=['x', 'y'])
    
    # Enmascarar timesteps con muy pocos píxeles válidos
    serie = serie.where(conteo >= min_pixeles)
    
    return serie.values, ds_ndvi.time.values

# NOTA: Si cusco_province.shp es solo el contorno provincial,
# necesitamos los límites por distrito del INEI.
# Descargar de: https://ide.inei.gob.pe/ o usar los distritos.json del prototipo
# El prototipo ya tiene distritos en src/data/distritos.json — usar eso.
```

### Reglas de control de calidad

| Criterio | Acción |
|---|---|
| Valor fill (-3000 o similar) | → NaN |
| Fuera del rango físico (-0.2 a 1.0) | → NaN |
| QA bits 0-1 = 10 o 11 (mala calidad) | → NaN |
| Timestep con < 10 píxeles válidos | → NaN para ese timestep |
| > 30% de NaN en la serie de un distrito | → Marcar como calidad "baja" |
| > 15% de NaN | → Marcar como calidad "media" |
| ≤ 15% de NaN | → Calidad "buena" |

---

## PASO 3 — Agregación temporal

### Script: `scripts/03_agregar_series.py`

```python
"""
Convierte la serie 16-días a series anuales, mensuales y de estación seca.
"""
import pandas as pd
import numpy as np

def agregar_serie(serie_16dias: pd.Series) -> dict:
    """
    Recibe una Serie de pandas con índice DatetimeIndex (16 días).
    Retorna un dict con tres agregaciones.
    """
    
    # --- Anual: media de todos los valores del año ---
    serie_anual = serie_16dias.resample('Y').mean()
    serie_anual.index = serie_anual.index.year
    
    # --- Mensual: media de las composiciones que caen en cada mes ---
    serie_mensual = serie_16dias.resample('MS').mean()
    
    # --- Estación seca (junio-agosto en Cusco): solo meses 6, 7, 8 ---
    seca_mask = serie_16dias.index.month.isin([6, 7, 8])
    serie_seca = serie_16dias[seca_mask].resample('Y').mean()
    serie_seca.index = serie_seca.index.year
    
    return {
        'anual': [
            {'t': str(year), 'v': round(float(val), 4)} 
            for year, val in serie_anual.items() 
            if not np.isnan(val)
        ],
        'mensual': [
            {'t': fecha.strftime('%Y-%m'), 'v': round(float(val), 4)}
            for fecha, val in serie_mensual.items()
            if not np.isnan(val)
        ],
        'seca': [
            {'t': str(year), 'v': round(float(val), 4)}
            for year, val in serie_seca.items()
            if not np.isnan(val)
        ]
    }
```

### ¿Por qué estación seca?
- En Cusco, la temporada húmeda (octubre–marzo) genera nubes que degradan la calidad del NDVI
- La estación seca (junio–agosto) tiene menos nubes → datos más limpios
- Los incendios en Cusco ocurren principalmente en temporada seca
- Comparar NDVI en estación seca elimina la variación estacional natural

---

## PASO 4 — Análisis estadístico de tendencias

### Script: `scripts/04_calcular_tendencias.py`

```python
"""
Calcula Mann-Kendall + pendiente de Sen para cada distrito y agregación.
Aplica corrección Benjamini-Hochberg para comparaciones múltiples.
"""
import numpy as np
import pandas as pd
from pymannkendall import original_test  # pip install pymannkendall
from scipy.stats import theilslopes
from statsmodels.stats.multitest import multipletests

def calcular_tendencia_distrito(serie_valores: list, desde: int, hasta: int) -> dict:
    """
    Calcula Mann-Kendall y pendiente de Sen para una serie filtrada por período.
    
    Args:
        serie_valores: Lista de floats (valores anuales o de estación seca)
        desde: Año de inicio del análisis
        hasta: Año de fin del análisis
    
    Returns:
        Diccionario con resultado de tendencia (formato del contrato JSON)
    """
    valores = np.array(serie_valores)
    
    # Filtrar NaN
    mask_valido = ~np.isnan(valores)
    n = int(mask_valido.sum())
    
    if n < 10:
        # Mínimo 10 observaciones para Mann-Kendall significativo
        return {
            'pendiente_por_anio': None,
            'ic95': [None, None],
            'p': None,
            'tau': None,
            'n': n,
            'significativo': False,
            'direccion': 'sin_cambio',
            'error': 'insuficientes_datos'
        }
    
    valores_validos = valores[mask_valido]
    
    # --- Mann-Kendall ---
    mk_result = original_test(valores_validos)
    tau = float(mk_result.Tau)
    p_valor = float(mk_result.p)
    
    # --- Pendiente de Sen (mediana de las pendientes de Theil) ---
    # Crear índice de tiempo (0, 1, 2, ...)
    tiempo = np.arange(len(valores_validos))
    theil_result = theilslopes(valores_validos, tiempo, alpha=0.05)
    pendiente = float(theil_result.slope)
    ic_inf = float(theil_result.low_slope)
    ic_sup = float(theil_result.high_slope)
    
    # --- Dirección ---
    if p_valor < 0.05:
        direccion = 'baja' if pendiente < 0 else 'sube'
    else:
        direccion = 'sin_cambio'
    
    return {
        'pendiente_por_anio': round(pendiente, 6),
        'ic95': [round(ic_inf, 6), round(ic_sup, 6)],
        'p': round(p_valor, 4),
        'tau': round(tau, 3),
        'n': n,
        'significativo': p_valor < 0.05,  # Se actualiza tras BH
        'direccion': direccion,
        'desde': desde,
        'hasta': hasta
    }


def aplicar_correccion_bh(resultados_por_distrito: dict) -> dict:
    """
    Aplica corrección Benjamini-Hochberg a los p-valores de todos los distritos.
    Modifica 'significativo' en cada resultado.
    """
    # Recopilar todos los p-valores válidos
    ids = []
    p_valores = []
    
    for ubigeo, resultado in resultados_por_distrito.items():
        if resultado.get('p') is not None:
            ids.append(ubigeo)
            p_valores.append(resultado['p'])
    
    if len(p_valores) == 0:
        return resultados_por_distrito
    
    # Aplicar BH (FDR = 0.05)
    _, p_corr, _, _ = multipletests(p_valores, alpha=0.05, method='fdr_bh')
    
    # Actualizar significancia con el p-valor corregido
    for ubigeo, p_ajustado in zip(ids, p_corr):
        resultados_por_distrito[ubigeo]['p_bh'] = round(float(p_ajustado), 4)
        resultados_por_distrito[ubigeo]['significativo'] = p_ajustado < 0.05
        
        # Actualizar dirección si ya no es significativo
        if not resultados_por_distrito[ubigeo]['significativo']:
            resultados_por_distrito[ubigeo]['direccion'] = 'sin_cambio'
    
    return resultados_por_distrito
```

### ¿Por qué Mann-Kendall y no regresión lineal?
- Mann-Kendall es no paramétrico → no asume distribución normal
- Robusto ante datos faltantes (NaN por nubes) y valores atípicos (incendios)
- Estándar en análisis de tendencias de variables ambientales
- La pendiente de Sen (mediana de pendientes de Theil) es el complemento natural

### ¿Por qué Benjamini-Hochberg?
- Se calculan ~13 pruebas simultáneas (una por distrito)
- Sin corrección, aumenta el riesgo de falsos positivos
- BH controla la tasa de descubrimientos falsos (FDR) al 5%

---

## PASO 5 — Procesamiento de manchas de área quemada

### Script: `scripts/05_procesar_manchas.py`

```python
"""
Procesa MCD64A1 para extraer polígonos de área quemada por distrito.
"""
import xarray as xr
import numpy as np
import geopandas as gpd
from rasterio.features import shapes
from shapely.geometry import shape
import json

ds_fuego = xr.open_dataset('Data/MCD64A1.061_500m_aid0001.nc')

# Variable principal: Burn_Date
# Valores: 0 = no quemado, 1-366 = día del año en que se quemó, -1 = no data
burn_date = ds_fuego['Burn_Date']  # Ajustar nombre de variable

# Por cada timestep (mensual):
manchas = []
for tiempo in burn_date.time.values:
    capa = burn_date.sel(time=tiempo)
    
    # Píxeles quemados: valor > 0
    quemados = (capa.values > 0).astype(np.uint8)
    
    if quemados.sum() == 0:
        continue
    
    # Vectorizar: convertir ráster a polígonos
    transform = ...  # Obtener del dataset (affine transform)
    
    for geom, val in shapes(quemados, transform=transform):
        if val > 0:
            poly = shape(geom)
            area_ha = poly.area * (500 * 500) / 10000  # 500m pixel → ha
            
            if area_ha < 1:  # Ignorar manchas muy pequeñas
                continue
            
            manchas.append({
                'id': f"mancha_{tiempo}_{len(manchas)}",
                'fecha': str(tiempo)[:7],  # YYYY-MM
                'area_ha': round(area_ha, 2),
                'geometria': geom,
                'es_de_prueba': False,
                'fuente': 'MCD64A1.061'
            })

# Asignar cada mancha a un distrito (spatial join)
manchas_gdf = gpd.GeoDataFrame(manchas, geometry='geometria', crs=4326)
distritos_gdf = gpd.read_file('src/data/distritos.json')  # Del prototipo
manchas_con_distrito = gpd.sjoin(manchas_gdf, distritos_gdf, how='left', predicate='intersects')

print(f"Total manchas procesadas: {len(manchas_con_distrito)}")
print(f"Área total quemada: {manchas_con_distrito['area_ha'].sum():.1f} ha")
```

> **Si MCD64A1 no tiene datos suficientes**: Mantener las manchas de prueba del prototipo con `es_de_prueba: true`. El banner de advertencia en la UI es OBLIGATORIO mientras esto sea así.

---

## PASO 6 — Generación de JSONs de salida

### Script: `scripts/06_generar_jsons.py`

```python
"""
Genera los archivos JSON estáticos para el frontend.
Ejecutar después de los pasos 2–5.
"""
import json
from pathlib import Path

OUTPUT_DIR = Path('src/data')
OUTPUT_DIR.mkdir(exist_ok=True)

# --- resultados.json ---
# Resultados de tendencia por distrito
resultados_output = {}
for ubigeo, resultado in resultados_por_distrito.items():
    resultados_output[ubigeo] = {
        'nombre': nombre_por_ubigeo[ubigeo],
        'anual': resultado.get('anual'),
        'seca': resultado.get('seca'),
    }

with open(OUTPUT_DIR / 'resultados.json', 'w', encoding='utf-8') as f:
    json.dump({
        'generado': datetime.now().isoformat(),
        'script': 'scripts/06_generar_jsons.py',
        'variable': 'ndvi',
        'dataset': 'MOD13Q1.061',
        'resultados': resultados_output
    }, f, ensure_ascii=False, indent=2)

# --- series/{ubigeo}_anual.json ---
series_dir = OUTPUT_DIR / 'series'
series_dir.mkdir(exist_ok=True)

for ubigeo, serie in series_por_distrito.items():
    for agregacion in ['anual', 'mensual', 'seca']:
        with open(series_dir / f'{ubigeo}_{agregacion}.json', 'w') as f:
            json.dump(serie[agregacion], f)

# --- manchas.json ---
with open(OUTPUT_DIR / 'manchas.json', 'w', encoding='utf-8') as f:
    json.dump({
        'type': 'FeatureCollection',
        'generado': datetime.now().isoformat(),
        'es_de_prueba': any(m.get('es_de_prueba', False) for m in manchas),
        'features': [mancha_a_feature(m) for m in manchas]
    }, f, ensure_ascii=False)

print("✅ JSONs generados exitosamente")
print(f"   - resultados.json: {len(resultados_output)} distritos")
print(f"   - series/: {len(series_por_distrito)} distritos × 3 agregaciones")
print(f"   - manchas.json: {len(manchas)} manchas")
```

---

## PASO 7 — Validación de resultados

### Script: `scripts/07_validar_resultados.py`

```python
"""
Valida que los resultados del pipeline son consistentes con scipy.
Ejecutar como parte del CI (GitHub Actions).
"""
import json
import numpy as np
from scipy.stats import kendalltau, theilslopes

def validar_distrito(ubigeo: str, resultados: dict):
    """
    Re-calcula Mann-Kendall con scipy y compara con los resultados del pipeline.
    """
    with open(f'src/data/series/{ubigeo}_anual.json') as f:
        serie = json.load(f)
    
    valores = np.array([p['v'] for p in serie])
    valores_validos = valores[~np.isnan(valores)]
    
    # Calcular con scipy
    tiempo = np.arange(len(valores_validos))
    tau_scipy, p_scipy = kendalltau(tiempo, valores_validos)
    theil = theilslopes(valores_validos, tiempo)
    
    # Resultado del pipeline
    r = resultados[ubigeo]['anual']
    
    # Comparar (tolerancia del 1%)
    assert abs(r['tau'] - tau_scipy) < 0.01, f"Tau difiere: {r['tau']} vs {tau_scipy}"
    assert abs(r['pendiente_por_anio'] - theil.slope) < 0.0001, "Pendiente difiere"
    
    print(f"✅ {ubigeo}: tau={r['tau']:.3f}, p={r['p']:.4f}, pendiente={r['pendiente_por_anio']:.5f}")
```

---

## PASO 8 — Automatización con GitHub Actions

### Archivo: `.github/workflows/pipeline_datos.yml`

```yaml
name: Pipeline de datos NASA
on:
  workflow_dispatch:  # Manual
  schedule:
    - cron: '0 6 * * 0'  # Domingo 6am UTC (actualización semanal opcional)

jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Instalar dependencias
        run: pip install pandas numpy xarray netCDF4 scipy pymannkendall rasterio shapely geopandas statsmodels
      
      - name: Ejecutar pipeline
        run: |
          python scripts/02_procesar_ndvi.py
          python scripts/03_agregar_series.py
          python scripts/04_calcular_tendencias.py
          python scripts/05_procesar_manchas.py
          python scripts/06_generar_jsons.py
          python scripts/07_validar_resultados.py
      
      - name: Commit de JSONs generados
        run: |
          git config user.name "Pipeline Bot"
          git add src/data/
          git commit -m "chore: actualizar datos pipeline [skip ci]" || echo "Sin cambios"
          git push
```

---

## PASO 9 — Datos de los distritos de Cusco

### Distritos de la provincia de Cusco (13 distritos)

| Ubigeo | Nombre del Distrito |
|---|---|
| 080101 | Cusco |
| 080102 | Ccorca |
| 080103 | Poroy |
| 080104 | San Jerónimo |
| 080105 | San Sebastián |
| 080106 | Santiago |
| 080107 | Saylla |
| 080108 | Wanchaq |
| 080109 | (verificar lista completa INEI) |

> **Nota**: Verificar la lista completa de ubigeos INEI para la provincia de Cusco. El shapefile `cusco_province.shp` tiene el límite provincial. Los límites distritales deben obtenerse del `src/data/distritos.json` del prototipo o de la web del INEI.

---

---

## PASO 10 — Recolección y filtrado de testimonios desde fuentes públicas

### Objetivo
Encontrar testimonios reales de personas de Cusco que describan el impacto de incendios, pérdida de vegetación o cambios ambientales en su territorio. Estos testimonios se cargan como `estado = 'pendiente'` y pasan por moderación antes de publicarse.

> **Regla ética irrenunciable**: Solo fuentes públicas con atribución clara. Sin scraping de redes sociales privadas. Sin datos personales identificables sin consentimiento. Sin testimonios generados por IA.

### Fuentes a revisar (en orden de confiabilidad)

| Fuente | Tipo | URL / Método | Qué buscar |
|---|---|---|---|
| **INDECI** (Instituto Nac. Defensa Civil) | Institucional | indeci.gob.pe → reportes de emergencias | Declaraciones de afectados en informes oficiales |
| **SERNANP** | Institucional | sernanp.gob.pe → noticias | Menciones de comunidades en áreas naturales protegidas de Cusco |
| **El Comercio / La República / Correo Cusco** | Prensa | Hemeroteca digital, búsqueda: "incendio Cusco comunidad" | Citas directas de pobladores en noticias |
| **Mongabay Latam** | Periodismo ambiental | es.mongabay.com | Reportajes con testimonios de comunidades andinas |
| **SPDA Actualidad Ambiental** | Periodismo ambiental | actualidadambiental.pe | Cobertura de incendios en Cusco con voz comunitaria |
| **Google Scholar / Repositorios PUCP, UNSAAC** | Académico | Buscar: "incendio forestal Cusco impacto social" | Transcripciones de entrevistas en tesis y artículos |
| **Repositorio UNSAAC** | Académico | repositorio.unsaac.edu.pe | Tesis sobre incendios en Cusco, pueden incluir entrevistas |
| **SER (Servicios Educativos Rurales)** | ONG | ser.org.pe | Reportes de impacto comunitario |

### Script de apoyo: `scripts/10_recolectar_testimonios.py`

```python
"""
Script semi-manual de recolección de testimonios.
NO hace scraping automático — genera una plantilla estructurada
para que el analista ingrese testimonios encontrados manualmente.

Luego genera testimonios.json listo para insertar en Supabase.
"""
import json
from pathlib import Path
from datetime import datetime

# Plantilla para cada testimonio encontrado manualmente
PLANTILLA_TESTIMONIO = {
    "territorio_id": "",          # ubigeo INEI del distrito (ej: "080102" = Ccorca)
    "texto": "",                   # Cita textual del testimonio, entre comillas
    "periodo_observado": "",       # Período al que se refiere (ej: "2010-2015", "agosto 2016")
    "tema": "",                    # "incendio" | "vegetacion" | "agua" | "clima" | "impacto_economico"
    "fuente": {
        "tipo": "",                # "prensa" | "academico" | "institucional" | "ong"
        "nombre": "",              # Nombre de la publicación o institución
        "url": "",                 # URL del artículo o documento
        "fecha_publicacion": "",   # YYYY-MM-DD
        "autor": ""                # Periodista, investigador o institución
    },
    "persona": {
        "nombre_o_anonimo": "",    # Nombre real (si está en fuente pública) o "Poblador de Ccorca"
        "rol": "",                 # "agricultor" | "autoridad_comunal" | "bombero" | "investigador"
        "anonimizar": True         # true = mostrar solo rol y distrito, no nombre
    },
    "consentimiento_publicar": True,  # True si es fuente pública ya publicada
    "consentimiento_anonimo": True,
    "estado": "pendiente",         # Siempre pendiente — pasa por moderación
    "creado_en": datetime.now().isoformat(),
    "es_de_prueba": False
}

def cargar_testimonios_fuente(ruta_json: str) -> list:
    """
    Carga un archivo JSON con lista de testimonios ya completados.
    Valida la estructura antes de generar el output.
    """
    with open(ruta_json, encoding='utf-8') as f:
        testimonios = json.load(f)
    
    errores = []
    for i, t in enumerate(testimonios):
        if not t.get('texto') or len(t['texto']) < 20:
            errores.append(f"Testimonio {i}: texto vacío o muy corto")
        if not t.get('territorio_id'):
            errores.append(f"Testimonio {i}: falta territorio_id")
        if not t.get('fuente', {}).get('url'):
            errores.append(f"Testimonio {i}: falta URL de fuente (trazabilidad)")
    
    if errores:
        print("⚠️ Errores de validación:")
        for e in errores: print(f"  - {e}")
        return []
    
    return testimonios

def generar_json_salida(testimonios: list, output_path: str = 'src/data/testimonios_semilla.json'):
    """
    Genera el JSON de testimonios listo para inserción en Supabase
    o para usarse como datos semilla offline.
    """
    output = {
        "generado": datetime.now().isoformat(),
        "total": len(testimonios),
        "advertencia": "Todos estos testimonios están en estado 'pendiente'. Requieren moderación humana antes de publicarse.",
        "testimonios": testimonios
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Generado {output_path} con {len(testimonios)} testimonios en estado 'pendiente'")
```

### Criterios de filtrado (qué incluir y qué descartar)

**✅ INCLUIR si**:
- La cita es textual y está entre comillas en la fuente original
- La fuente es verificable (URL pública que no requiere suscripción)
- El testimonio menciona explícitamente: impacto en su vida, cambio observado en la naturaleza, o consecuencias del incendio/sequía
- El lugar mencionado es un distrito de la provincia de Cusco
- El período observado puede estimarse (aunque sea "hace varios años")

**❌ DESCARTAR si**:
- El texto es una paráfrasis del periodista, no una cita directa
- No hay forma de verificar la fuente
- Menciona datos personales identificables (dirección exacta, nombre completo + foto de menor)
- El período es demasiado vago para asociarlo a algún punto de los datos NDVI
- La fuente requiere suscripción de pago y no hay forma de verificar

### Términos de búsqueda recomendados

```
# En español para Google / Google Scholar:
"incendio forestal" Cusco "comunidad" testimonio
"quema" Cusco agricultor OR campesino declaró
"incendio" distrito Ccorca OR "San Jerónimo" OR Santiago Cusco impacto
"pérdida de vegetación" Cusco comunidad afectada
"pastizal" Cusco incendio "nos afectó"
"sequía" Cusco agricultura impacto comunal

# En repositorios académicos:
site:repositorio.unsaac.edu.pe incendio forestal Cusco
site:tesis.pucp.edu.pe incendio Cusco impacto social
```

### Output esperado

Archivo `src/data/testimonios_semilla.json` con estructura:
```json
{
  "generado": "2026-11-15T...",
  "total": 12,
  "advertencia": "Todos en estado 'pendiente'. Requieren moderación.",
  "testimonios": [
    {
      "territorio_id": "080102",
      "texto": "El incendio nos quitó todo el pasto para el ganado. Ese año perdimos casi la mitad de los animales.",
      "periodo_observado": "2016",
      "tema": "incendio",
      "fuente": {
        "tipo": "prensa",
        "nombre": "Correo Cusco",
        "url": "https://...",
        "fecha_publicacion": "2016-09-15",
        "autor": "Redacción Correo"
      },
      "persona": {
        "nombre_o_anonimo": "Poblador de Ccorca",
        "rol": "agricultor",
        "anonimizar": true
      },
      "consentimiento_publicar": true,
      "consentimiento_anonimo": true,
      "estado": "pendiente",
      "es_de_prueba": false
    }
  ]
}
```

---

## Checklist del pipeline

Antes de entregar los datos al equipo de frontend:

- [x] `scripts/build_data.py` ejecutado — estructura de datos comprendida
- [x] Factor de escala NDVI aplicado (÷ 10000)
- [x] Filtro QA aplicado (bits 0-1, nubes mezcladas, nieve/hielo y sombra)
- [x] Series por distrito generadas para las 3 agregaciones (media_anual, maximo_anual, estacion_seca)
- [x] Mann-Kendall calculado para cada distrito (tau, p, pendiente_anual)
- [x] Corrección BH calculada y verificada
- [x] `manchas.json` generado con datos reales de MCD64A1 (`es_de_prueba: false`, 16 manchas poligonales reales)
- [x] `curvas.json` y `distritos.json` generados desde NASADEM y GeoJSON INEI
- [ ] `resultados.json` incluye `frase_ciudadana` generada por el servidor
- [x] **[Paso 10]** Fuentes de testimonios revisadas (mínimo 3 fuentes públicas: INDECI, Andina, RPP, SPDA, Correo)
- [x] **[Paso 10]** `src/data/testimonios_semilla.json` generado con ≥ 5 testimonios reales
- [x] **[Paso 10]** Cada testimonio tiene URL de fuente verificable

---

## Notas para el agente que implemente este plan

1. **Los archivos .nc están en `/Data`**: no los mover ni renombrar.
2. **GPM IMERG descartado**: el CSV tiene `randomError`, no usar para ninguna conclusión.
3. **El prototipo ya tiene `src/lib/evidencia.ts`**: el cálculo en cliente debe dar los mismos resultados que este pipeline. Verificar con `scripts/07_validar_resultados.py`.
4. **Si MCD64A1 tiene datos escasos**: las manchas de prueba del prototipo son un fallback válido, pero SIEMPRE con `es_de_prueba: true` y el banner en la UI.
5. Si te quedas sin tokens, retomar desde este archivo + `Informacion/00_RESUMEN_PROYECTO.md`.
