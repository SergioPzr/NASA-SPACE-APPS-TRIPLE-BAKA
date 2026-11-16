const LAT0 = -13.54;
const KX = Math.cos((LAT0 * Math.PI) / 180);

type P = number[];

function distSeg(p: P, a: P, b: P): number {
  const px = p[0] * KX, py = p[1], ax = a[0] * KX, ay = a[1], bx = b[0] * KX, by = b[1];
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distancia (en grados, con longitud corregida) de un punto a un anillo; 0 si está dentro. */
export function distPuntoPoligono(p: P, ring: P[]): number {
  let dentro = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  if (dentro) return 0;
  let min = Infinity;
  for (let i = 0; i < ring.length - 1; i++) min = Math.min(min, distSeg(p, ring[i], ring[i + 1]));
  return min;
}

export function centro(geom: { coordinates: number[][][] }): [number, number] {
  const ring = geom.coordinates[0].slice(0, -1);
  return [ring.reduce((s, c) => s + c[0], 0) / ring.length, ring.reduce((s, c) => s + c[1], 0) / ring.length];
}

export function mediana(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
