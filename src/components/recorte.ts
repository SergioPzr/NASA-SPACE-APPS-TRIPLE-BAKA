import type { Coleccion, Distrito, Mancha } from '@/lib/tipos';

/*
 * Solo presentación: mantiene cada mancha de fuego dentro de su distrito para que no se salga
 * del mapa. Los vértices que caen fuera se llevan al punto más cercano del borde del distrito.
 * Los datos originales (área, distrito) no cambian.
 */

type P = number[];

function dentro(p: P, anillo: P[]): boolean {
  let d = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

function masCercanoEnBorde(p: P, anillo: P[]): P {
  let mejor: P = anillo[0], dmin = Infinity;
  for (let i = 0; i < anillo.length - 1; i++) {
    const a = anillo[i], b = anillo[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const q = [a[0] + t * dx, a[1] + t * dy];
    const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    if (d < dmin) { dmin = d; mejor = q; }
  }
  // Un pelo hacia dentro para que el borde de la mancha no pise la línea del distrito
  return mejor;
}

export function manchasDentroDeDistritos(manchas: Coleccion<Mancha>, distritos: Coleccion<Distrito>): Coleccion<Mancha> {
  const anillos = new Map(distritos.features.map((d) => [d.properties.id, d.geometry.coordinates[0] as P[]]));
  return {
    ...manchas,
    features: manchas.features.map((m) => {
      const borde = anillos.get(m.properties.distrito);
      if (!borde) return m;
      const anillo = (m.geometry.coordinates[0] as P[]).map((p) => (dentro(p, borde) ? p : masCercanoEnBorde(p, borde)));
      return { ...m, geometry: { ...m.geometry, coordinates: [anillo] } };
    }),
  };
}
