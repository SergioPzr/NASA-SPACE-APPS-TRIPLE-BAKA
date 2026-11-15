#!/usr/bin/env python3
"""Agrupa los píxeles quemados de MCD64A1 (Burn_Date) en manchas (polígonos) para el mapa.

Uso:
  python -I scripts/build_manchas.py <MCD64A1.nc> <distritos.json> <salida_manchas.json>
         [--min-ha 25] [--max-por-distrito 6] [--desde 2001] [--hasta 2025]

Entrada
- MCD64A1.nc   : NetCDF de AppEEARS con la capa Burn_Date (día juliano 1–366; 0 = sin quema; negativos = sin dato/agua).
- distritos.json: el que genera build_data.py (src/data/distritos.json).

Qué hace
1. Une todas las fechas del periodo: un píxel cuenta como quemado si alguna vez tuvo Burn_Date entre 1 y 366.
2. Agrupa los píxeles vecinos (8 conexiones) en manchas y los convierte en polígonos.
3. Asigna cada mancha al distrito que contiene su punto representativo; descarta las de fuera de la provincia.
4. Descarta manchas menores a --min-ha y conserva las --max-por-distrito más grandes de cada distrito
   (el recorrido del mapa apaga todas las manchas de un distrito: más de ~6 lo vuelve eterno).
5. Escribe un FeatureCollection con id numérico y properties {id, distrito, area_ha, es_de_prueba=false, ...}.

Qué NO hace: no inventa nada. Con datos reales, es_de_prueba=false y el aviso de "datos de prueba" desaparece.
"""
import json
import sys

import netCDF4 as nc
import numpy as np
from rasterio.features import shapes
from rasterio.transform import from_origin
from scipy import ndimage
from shapely.geometry import Point, shape
from shapely.prepared import prep

KM_POR_GRADO = 111.32


TIPOS = {"min-ha": float, "max-por-distrito": int, "desde": int, "hasta": int}


def parse_args(argv):
    opciones = {"min-ha": 25.0, "max-por-distrito": 6, "desde": None, "hasta": None}
    pos, i = [], 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("--"):
            if a[2:] not in TIPOS or i + 1 >= len(argv):
                sys.exit(__doc__)
            opciones[a[2:]] = TIPOS[a[2:]](argv[i + 1])
            i += 2
        else:
            pos.append(a)
            i += 1
    if len(pos) != 3:
        sys.exit(__doc__)
    return pos, opciones


def variable_burn_date(d):
    candidatas = [n for n in d.variables if "burn_date" in n.lower() and "uncertainty" not in n.lower()]
    if not candidatas:
        sys.exit("No se encontró la variable Burn_Date en el NetCDF. Variables: " + ", ".join(d.variables))
    return d.variables[candidatas[0]]


def leer_quemado(ruta, desde=None, hasta=None):
    """Devuelve (mascara 2D quemado alguna vez, último año quemado por píxel, lon, lat)."""
    d = nc.Dataset(ruta)
    var = variable_burn_date(d)
    datos = np.ma.filled(var[:].astype(float), 0)
    if datos.ndim == 2:
        datos = datos[None]
    t = d.variables["time"]
    anios = np.array([f.year for f in nc.num2date(t[:], t.units, only_use_cftime_datetimes=False)])
    lat = np.array(d.variables["lat"][:], dtype=float)
    lon = np.array(d.variables["lon"][:], dtype=float)
    d.close()
    if len(anios) != datos.shape[0]:
        sys.exit("El eje de tiempo no coincide con Burn_Date.")
    sel = np.ones(len(anios), bool)
    if desde is not None:
        sel &= anios >= desde
    if hasta is not None:
        sel &= anios <= hasta
    datos, anios = datos[sel], anios[sel]
    quemado_t = (datos >= 1) & (datos <= 366)
    mascara = quemado_t.any(axis=0)
    ultimo = np.zeros(mascara.shape, int)
    for k, y in enumerate(anios):
        ultimo = np.where(quemado_t[k], y, ultimo)
    return mascara, ultimo, lon, lat


def transformacion(lon, lat):
    dx = float(np.median(np.diff(lon)))
    dy = float(np.median(np.diff(lat)))
    norte = float(lat[0] - dy / 2) if dy < 0 else float(lat[-1] + abs(dy) / 2)
    return from_origin(float(lon[0] - dx / 2), norte, abs(dx), abs(dy)), abs(dx), abs(dy), dy < 0


def area_ha_pixel(lat_grados, dx, dy):
    return dx * dy * KM_POR_GRADO ** 2 * np.cos(np.radians(lat_grados)) * 100.0


def construir_manchas(mascara, ultimo, lon, lat, distritos, min_ha=25.0, max_por_distrito=6):
    """distritos: FeatureCollection (dict). Devuelve el FeatureCollection de manchas."""
    transform, dx, dy, norte_primero = transformacion(lon, lat)
    m = mascara if norte_primero else mascara[::-1]
    u = ultimo if norte_primero else ultimo[::-1]
    etiquetas, n = ndimage.label(m, structure=np.ones((3, 3)))
    zonas = [(f["properties"]["id"], prep(shape(f["geometry"]))) for f in distritos["features"]]
    por_distrito = {}
    for geom, valor in shapes(etiquetas.astype(np.int32), mask=etiquetas > 0, transform=transform, connectivity=8):
        comp = int(valor)
        poligono = shape(geom)
        pixeles = int((etiquetas == comp).sum())
        punto = poligono.representative_point()
        area = pixeles * area_ha_pixel(punto.y, dx, dy)
        if area < min_ha:
            continue
        did = next((i for i, z in zonas if z.contains(Point(punto.x, punto.y))), None)
        if did is None:
            continue
        anio = int(u[etiquetas == comp].max())
        borde = list(poligono.exterior.coords)
        por_distrito.setdefault(did, []).append({
            "area_ha": round(float(area), 1), "pixeles": pixeles, "anio_ultimo": anio,
            "anillo": [[round(float(x), 5), round(float(y), 5)] for x, y in borde],
        })
    feats, mid = [], 0
    for f in distritos["features"]:
        did = f["properties"]["id"]
        for s in sorted(por_distrito.get(did, []), key=lambda s: -s["area_ha"])[:max_por_distrito]:
            mid += 1
            feats.append({
                "type": "Feature", "id": mid,
                "properties": {"id": mid, "distrito": did, "area_ha": s["area_ha"], "es_de_prueba": False,
                               "pixeles": s["pixeles"], "anio_ultimo": s["anio_ultimo"]},
                "geometry": {"type": "Polygon", "coordinates": [s["anillo"]]},
            })
    return {"type": "FeatureCollection", "features": feats}


def main(argv):
    (ruta_nc, ruta_dist, salida), op = parse_args(argv)
    distritos = json.load(open(ruta_dist, encoding="utf-8"))
    mascara, ultimo, lon, lat = leer_quemado(ruta_nc, op["desde"], op["hasta"])
    fc = construir_manchas(mascara, ultimo, lon, lat, distritos, op["min-ha"], op["max-por-distrito"])
    with open(salida, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, separators=(",", ":"), ensure_ascii=False)
    cuenta = {}
    for f in fc["features"]:
        cuenta[f["properties"]["distrito"]] = cuenta.get(f["properties"]["distrito"], 0) + 1
    print(f"{len(fc['features'])} manchas -> {salida}")
    for f in distritos["features"]:
        print(" ", f["properties"]["id"], f["properties"]["nombre"], cuenta.get(f["properties"]["id"], 0))


if __name__ == "__main__":
    main(sys.argv[1:])
