#!/usr/bin/env python3
"""Genera supabase/seed.sql desde src/data para cargar Supabase tras ejecutar supabase/schema.sql.

Uso: python -I scripts/make_seed_sql.py src/data supabase/seed.sql
"""
import json
import sys


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def arr(v):
    return "array[" + ",".join(str(x) for x in v) + "]"


def main(entrada, salida):
    def cargar(n):
        return json.load(open(f"{entrada}/{n}.json", encoding="utf-8"))

    distritos, manchas, res = cargar("distritos"), cargar("manchas"), cargar("resultados")
    sql = ["-- Generado por scripts/make_seed_sql.py. No editar a mano.", "begin;"]
    sql.append("delete from manchas;")
    sql.append("delete from serie_ndvi;")
    for f in distritos["features"]:
        p = f["properties"]
        sql.append(
            f"insert into distritos (id, nombre, capital, centroide, bbox, geom) values ({q(p['id'])}, {q(p['nombre'])}, {q(p['capital'])}, "
            f"{arr(p['centroide'])}, {arr(p['bbox'])}, st_setsrid(st_geomfromgeojson({q(json.dumps(f['geometry']))}), 4326)) "
            "on conflict (id) do update set nombre = excluded.nombre, capital = excluded.capital, centroide = excluded.centroide, bbox = excluded.bbox, geom = excluded.geom;")
    for f in manchas["features"]:
        p = f["properties"]
        sql.append(
            f"insert into manchas (id, distrito, area_ha, es_de_prueba, geom) values ({p['id']}, {q(p['distrito'])}, {p['area_ha']}, "
            f"{str(bool(p.get('es_de_prueba', False))).lower()}, st_setsrid(st_geomfromgeojson({q(json.dumps(f['geometry']))}), 4326));")
    zonas = {**res["distritos"], "provincia": res["provincia"]}
    for zid, z in zonas.items():
        for ag, a in z["agregaciones"].items():
            sql.append(
                "insert into serie_ndvi (zona_id, agregacion, serie, media, pendiente_anual, p, tau, n, pixeles, significativo, direccion) values "
                f"({q(zid)}, {q(ag)}, {arr(a['serie'])}, {a['media']}, {a['pendiente_anual']}, {a['p']}, {a['tau']}, {a['n']}, {z['pixeles']}, "
                f"{str(a['significativo']).lower()}, {q(a['direccion'])});")
    sql.append("commit;")
    with open(salida, "w", encoding="utf-8") as fh:
        fh.write("\n".join(sql) + "\n")
    print(f"{len(sql)} sentencias -> {salida}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
