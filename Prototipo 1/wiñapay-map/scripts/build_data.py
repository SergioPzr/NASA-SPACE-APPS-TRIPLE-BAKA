#!/usr/bin/env python3
"""Genera los datos del mapa de WIÑAPAY desde el zip de AppEEARS.

Uso: python -I scripts/build_data.py <carpeta_requests> <distritos_raw.geojson> <salida> [--manchas-prueba]

Escribe en <salida>:
- distritos.json  : 8 distritos de la provincia de Cusco (INEI, simplificado)
- curvas.json     : curvas de nivel del NASADEM (cada 100 m)
- resultados.json : NDVI por distrito y provincia (MOD13Q1) con TRES agregaciones anuales
                    (media, máximo y estación seca), cada una con Mann-Kendall + Sen.
                    Se guardan y se reportan juntas: no se elige la que dé significancia.
- manchas.json    : solo con --manchas-prueba (manchas sintéticas, es_de_prueba=true).
                    Las manchas reales las genera scripts/build_manchas.py (MCD64A1).
"""
import json
import random
import sys
import warnings

import matplotlib
import netCDF4 as nc
import numpy as np
import pymannkendall as mk
from matplotlib.path import Path

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

YEARS = list(range(2001, 2026))
MESES_SECA = (5, 6, 7, 8, 9)
AGREGACIONES = {
    "media_anual": "promedio de todos los compuestos de 16 días del año",
    "maximo_anual": "máximo del año entre compuestos de 16 días",
    "estacion_seca": "promedio de los compuestos de mayo a septiembre",
}


def R(x, n=5):
    return [round(float(v), n) for v in x]


def cargar_distritos(dist_file):
    feats = json.load(open(dist_file, encoding="utf-8"))["features"]
    paths, distritos = {}, []
    for f in feats:
        p = f["properties"]
        ring = f["geometry"]["coordinates"][0]
        did = p["IDDIST"]
        paths[did] = Path(np.array(ring))
        xs, ys = zip(*ring)
        a = cx = cy = 0.0
        for (x0, y0), (x1, y1) in zip(ring[:-1], ring[1:]):
            c = x0 * y1 - x1 * y0
            a += c
            cx += (x0 + x1) * c
            cy += (y0 + y1) * c
        a *= 0.5
        nombre = p["NOMBDIST"].title().replace("Jeronimo", "Jerónimo").replace("Sebastian", "Sebastián")
        distritos.append({
            "type": "Feature", "id": int(did),
            "properties": {"id": did, "nombre": nombre, "capital": p["NOM_CAP"].title(),
                           "centroide": R([cx / (6 * a), cy / (6 * a)]),
                           "bbox": R([min(xs), min(ys), max(xs), max(ys)])},
            "geometry": {"type": "Polygon", "coordinates": [[R(c) for c in ring]]},
        })
    return distritos, paths


import os

def encontrar_archivo(req, subcarpeta, nombre):
    directo = os.path.join(req, nombre)
    if os.path.exists(directo):
        return directo
    sub = os.path.join(req, subcarpeta, nombre)
    if os.path.exists(sub):
        return sub
    return directo

def curvas_nivel(req, paths):
    ruta_dem = encontrar_archivo(req, "cusco_province_trends_request", "NASADEM_NC.001_30m_aid0001.nc")
    d = nc.Dataset(ruta_dem)
    h = np.ma.filled(d.variables["NASADEM_HGT"][0].astype(float), np.nan)
    lat = np.array(d.variables["lat"][:])
    lon = np.array(d.variables["lon"][:])
    d.close()
    s = 4
    fig, ax = plt.subplots()
    cs = ax.contour(lon[::s], lat[::s], h[::s, ::s], levels=list(range(3100, 4700, 100)))

    def dentro(pts):
        m = np.zeros(len(pts), bool)
        for pa in paths.values():
            m |= pa.contains_points(pts)
        return m

    lineas = []
    for lvl, segs in zip(cs.levels, cs.allsegs):
        for seg in segs:
            if len(seg) < 6:
                continue
            seg = seg[::2] if len(seg) > 40 else seg
            run = []
            for pt, ok in zip(seg, dentro(seg)):
                if ok:
                    run.append(pt)
                else:
                    if len(run) >= 4:
                        lineas.append((lvl, run))
                    run = []
            if len(run) >= 4:
                lineas.append((lvl, run))
    plt.close(fig)
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"elev": int(lv)},
         "geometry": {"type": "LineString", "coordinates": [R(p, 4) for p in r]}} for lv, r in lineas]}


def cargar_ndvi(req):
    ruta_ndvi = encontrar_archivo(req, "cusco_province_ndvi_request", "MOD13Q1.061_250m_aid0001_ndvi.nc")
    if not os.path.exists(ruta_ndvi):
        ruta_ndvi = encontrar_archivo(req, "cusco_province_ndvi_request", "MOD13Q1.061_250m_aid0001.nc")
    d = nc.Dataset(ruta_ndvi)
    ndvi = np.ma.filled(d.variables["_250m_16_days_NDVI"][:], np.nan).astype(float)
    vq = np.ma.filled(d.variables["_250m_16_days_VI_Quality"][:], 0).astype(np.int64)
    t = d.variables["time"]
    fechas = nc.num2date(t[:], t.units, only_use_cftime_datetimes=False)
    glat = np.array(d.variables["lat"][:])
    glon = np.array(d.variables["lon"][:])
    d.close()
    # calidad: MODLAND_QA<=1, sin nubes mezcladas (bit 10), sin nieve/hielo (bit 14), sin sombra (bit 15)
    ok = ((vq & 3) <= 1) & ((vq & (1 << 10)) == 0) & ((vq & (1 << 14)) == 0) & ((vq & (1 << 15)) == 0)
    return np.where(ok, ndvi, np.nan), np.array([f.year for f in fechas]), np.array([f.month for f in fechas]), glat, glon


def agregar(ts, anios, meses):
    """ts: NDVI medio espacial por compuesto. Devuelve las tres series anuales."""
    out = {"media_anual": [], "maximo_anual": [], "estacion_seca": []}
    seca = np.isin(meses, MESES_SECA)
    for y in YEARS:
        del_anio = ts[anios == y]
        out["media_anual"].append(float(np.nanmean(del_anio)))
        out["maximo_anual"].append(float(np.nanmax(del_anio)))
        out["estacion_seca"].append(float(np.nanmean(ts[(anios == y) & seca])))
    return out


def prueba(serie):
    r = mk.original_test(serie)
    return {"serie": [round(v, 4) for v in serie], "media": round(float(np.mean(serie)), 4),
            "pendiente_anual": round(float(r.slope), 5), "p": round(float(r.p), 4),
            "tau": round(float(r.Tau), 3), "n": len(serie),
            "significativo": bool(r.p < 0.05), "direccion": r.trend if r.p < 0.05 else "sin_cambio"}


def resultados_ndvi(req, paths):
    nd, anios, meses, glat, glon = cargar_ndvi(req)
    lon, lat = np.meshgrid(glon, glat)
    pts = np.column_stack([lon.ravel(), lat.ravel()])

    def zona(mask2d):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            ts = np.nanmean(nd[:, mask2d], axis=1)
        return {"pixeles": int(mask2d.sum()),
                "agregaciones": {k: prueba(v) for k, v in agregar(ts, anios, meses).items()}}

    res = {"metodo": {"variable": "NDVI MOD13Q1 v061 (250 m, 16 días)", "periodo": "2001-2025",
                      "agregaciones": AGREGACIONES, "principal": "media_anual",
                      "prueba": "Mann-Kendall + pendiente de Sen", "nivel": 0.95,
                      "calidad": "MODLAND_QA<=1; sin nubes mezcladas, nieve/hielo ni sombra"},
           "anios": YEARS, "distritos": {}}
    todo = np.zeros(len(pts), bool)
    for did, pa in paths.items():
        m = pa.contains_points(pts)
        todo |= m
        res["distritos"][did] = zona(m.reshape(lon.shape))
    res["provincia"] = zona(todo.reshape(lon.shape))
    return res


def manchas_prueba(distritos, paths):
    rng = random.Random(2026)
    manchas, mid = [], 0
    for f in distritos:
        did = f["properties"]["id"]
        pa = paths[did]
        x0, y0, x1, y1 = f["properties"]["bbox"]
        n, k, intentos = rng.choice([3, 4, 4]), 0, 0
        while k < n and intentos < 4000:
            intentos += 1
            cx, cy = rng.uniform(x0, x1), rng.uniform(y0, y1)
            r0 = rng.uniform(0.0016, 0.0035)
            pts_b = []
            for i in range(18):
                ang = 2 * np.pi * i / 18
                rr = r0 * rng.uniform(0.55, 1.25)
                pts_b.append([cx + rr * np.cos(ang), cy + rr * np.sin(ang)])
            if not pa.contains_points(np.array(pts_b)).all():
                continue
            if any(np.hypot(cx - m["cx"], cy - m["cy"]) < 0.006 for m in manchas):
                continue
            area_ha = abs(0.5 * sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts_b, pts_b[1:] + pts_b[:1]))) \
                * (111.32 ** 2 * np.cos(np.radians(13.5))) * 100
            mid += 1
            k += 1
            manchas.append({"cx": cx, "cy": cy, "type": "Feature", "id": mid,
                            "properties": {"id": mid, "distrito": did, "area_ha": round(float(area_ha), 1), "es_de_prueba": True},
                            "geometry": {"type": "Polygon", "coordinates": [[R(p) for p in pts_b + [pts_b[0]]]]}})
    for m in manchas:
        m.pop("cx")
        m.pop("cy")
    return {"type": "FeatureCollection", "features": manchas}


def escribir(ruta, obj):
    with open(ruta, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, separators=(",", ":"), ensure_ascii=False)


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 3:
        sys.exit(__doc__)
    req, dist_file, out = args
    distritos, paths = cargar_distritos(dist_file)
    escribir(f"{out}/distritos.json", {"type": "FeatureCollection", "features": distritos})
    curvas = curvas_nivel(req, paths)
    escribir(f"{out}/curvas.json", curvas)
    res = resultados_ndvi(req, paths)
    escribir(f"{out}/resultados.json", res)
    print("distritos", len(distritos), "curvas", len(curvas["features"]))
    for did, r in {**res["distritos"], "provincia": res["provincia"]}.items():
        fila = " ".join(f"{k[:5]}={a['pendiente_anual']:+.5f}(p={a['p']:.3f})" for k, a in r["agregaciones"].items())
        print(did, r["pixeles"], fila)
    if "--manchas-prueba" in argv:
        m = manchas_prueba(distritos, paths)
        escribir(f"{out}/manchas.json", m)
        print("manchas de prueba", len(m["features"]))


if __name__ == "__main__":
    main(sys.argv[1:])
