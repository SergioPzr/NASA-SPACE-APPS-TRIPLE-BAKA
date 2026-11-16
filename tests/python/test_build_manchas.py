"""Prueba build_manchas.py con un MCD64A1 sintético (no hay datos reales todavía).

Ejecutar: python -m pytest tests/python  (requiere numpy, scipy, netCDF4, rasterio, shapely)
"""
import importlib.util
import json
from pathlib import Path

import netCDF4 as nc
import numpy as np
import pytest

RAIZ = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("build_manchas", RAIZ / "scripts" / "build_manchas.py")
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)

LON0, LAT0, PASO = -72.0, -13.40, 0.005  # píxeles de ~550 m (≈ 30 ha)


def distritos():
    def cuadro(x0, y0, x1, y1):
        return {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"id": "080101", "nombre": "Oeste"}, "geometry": cuadro(-72.0, -13.6, -71.9, -13.4)},
        {"type": "Feature", "properties": {"id": "080102", "nombre": "Este"}, "geometry": cuadro(-71.9, -13.6, -71.8, -13.4)},
    ]}


def escribir_nc(ruta, quemados, filas=40, cols=40, anios=(2019, 2020)):
    """quemados: lista de (año, fila, col, alto, ancho, dia). Latitud decreciente, como AppEEARS."""
    d = nc.Dataset(ruta, "w")
    d.createDimension("time", len(anios))
    d.createDimension("lat", filas)
    d.createDimension("lon", cols)
    t = d.createVariable("time", "f8", ("time",))
    t.units = "days since 2000-01-01"
    t[:] = [(np.datetime64(f"{y}-06-01") - np.datetime64("2000-01-01")).astype(int) for y in anios]
    d.createVariable("lat", "f8", ("lat",))[:] = LAT0 - PASO * (np.arange(filas) + 0.5)
    d.createVariable("lon", "f8", ("lon",))[:] = LON0 + PASO * (np.arange(cols) + 0.5)
    bd = d.createVariable("_500m_monthly_Burn_Date", "i2", ("time", "lat", "lon"), fill_value=-1)
    bd[:] = 0
    u = d.createVariable("_500m_monthly_Burn_Date_Uncertainty", "i2", ("time", "lat", "lon"))
    u[:] = 5
    for y, f, c, h, w, dia in quemados:
        bd[anios.index(y), f:f + h, c:c + w] = dia
    d.close()


@pytest.fixture
def escena(tmp_path):
    ruta = tmp_path / "mcd64a1.nc"
    escribir_nc(ruta, [
        (2019, 2, 2, 4, 4, 200),    # grande, distrito oeste (16 px)
        (2020, 15, 3, 2, 2, 250),   # mediana, oeste (4 px)
        (2020, 30, 4, 1, 1, 100),   # 1 px: ~30 ha, pasa --min-ha 25
        (2019, 5, 24, 3, 3, 180),   # este (9 px)
        (2020, 5, 30, 1, 1, 300),   # este, 1 px
    ])
    return ruta


def correr(ruta, **kw):
    mascara, ultimo, lon, lat = bm.leer_quemado(str(ruta))
    return bm.construir_manchas(mascara, ultimo, lon, lat, distritos(), **kw)


def test_agrupa_pixeles_vecinos_y_asigna_distrito(escena):
    fc = correr(escena, min_ha=1)
    por = {}
    for f in fc["features"]:
        por.setdefault(f["properties"]["distrito"], []).append(f)
    assert len(por["080101"]) == 3 and len(por["080102"]) == 2
    mayor = max(por["080101"], key=lambda f: f["properties"]["area_ha"])
    assert mayor["properties"]["pixeles"] == 16
    assert mayor["properties"]["anio_ultimo"] == 2019


def test_ids_numericos_consecutivos_y_propiedades(escena):
    fc = correr(escena, min_ha=1)
    ids = [f["id"] for f in fc["features"]]
    assert ids == list(range(1, len(ids) + 1))
    for f in fc["features"]:
        p = f["properties"]
        assert p["id"] == f["id"] and isinstance(p["id"], int)
        assert {"id", "distrito", "area_ha"} <= p.keys()
        assert p["es_de_prueba"] is False
        assert f["geometry"]["type"] == "Polygon" and f["geometry"]["coordinates"][0][0] == f["geometry"]["coordinates"][0][-1]


def test_area_coherente_con_pixeles(escena):
    fc = correr(escena, min_ha=1)
    mayor = max(fc["features"], key=lambda f: f["properties"]["area_ha"])["properties"]
    por_pixel = bm.area_ha_pixel(-13.5, PASO, PASO)
    assert mayor["area_ha"] == pytest.approx(16 * por_pixel, rel=0.01)


def test_min_ha_y_tope_por_distrito(escena):
    fc = correr(escena, min_ha=100)
    assert all(f["properties"]["area_ha"] >= 100 for f in fc["features"])
    fc2 = correr(escena, min_ha=1, max_por_distrito=1)
    assert sorted(f["properties"]["distrito"] for f in fc2["features"]) == ["080101", "080102"]
    mayores = {f["properties"]["distrito"]: f["properties"]["pixeles"] for f in fc2["features"]}
    assert mayores == {"080101": 16, "080102": 9}


def test_filtra_por_periodo(escena):
    mascara, ultimo, lon, lat = bm.leer_quemado(str(escena), desde=2020)
    fc = bm.construir_manchas(mascara, ultimo, lon, lat, distritos(), min_ha=1)
    assert all(f["properties"]["anio_ultimo"] == 2020 for f in fc["features"])
    assert len(fc["features"]) == 3


def test_ignora_valores_sin_dato_y_fuera_de_provincia(tmp_path):
    ruta = tmp_path / "x.nc"
    escribir_nc(ruta, [(2019, 2, 2, 2, 2, -2), (2019, 10, 2, 2, 2, 0)])
    assert correr(ruta, min_ha=1)["features"] == []
    ruta2 = tmp_path / "fuera.nc"
    escribir_nc(ruta2, [(2019, 2, 2, 3, 3, 100)])
    solo_este = {"type": "FeatureCollection", "features": [distritos()["features"][1]]}
    mascara, ultimo, lon, lat = bm.leer_quemado(str(ruta2))
    assert bm.construir_manchas(mascara, ultimo, lon, lat, solo_este, min_ha=1)["features"] == []


def test_cli_escribe_json_valido(escena, tmp_path):
    dist, salida = tmp_path / "d.json", tmp_path / "manchas.json"
    dist.write_text(json.dumps(distritos()), encoding="utf-8")
    bm.main([str(escena), str(dist), str(salida), "--min-ha", "1", "--max-por-distrito", "6"])
    fc = json.loads(salida.read_text(encoding="utf-8"))
    assert fc["type"] == "FeatureCollection" and len(fc["features"]) == 5
