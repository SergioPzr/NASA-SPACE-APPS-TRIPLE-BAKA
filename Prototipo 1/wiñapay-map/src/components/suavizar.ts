import type { Coleccion, Mancha } from '@/lib/tipos';

type Anillo = number[][];

/**
 * Redondea un contorno de píxeles (escalones) con cortes de esquina de Chaikin.
 * Es solo presentación: los datos siguen siendo píxeles de 500 m y `area_ha` no cambia.
 */
export function suavizarAnillo(anillo: Anillo, pasadas = 3): Anillo {
  let pts = anillo.slice();
  const [a, b] = [pts[0], pts[pts.length - 1]];
  if (pts.length > 1 && a[0] === b[0] && a[1] === b[1]) pts = pts.slice(0, -1);
  if (pts.length < 3) return anillo;
  for (let k = 0; k < pasadas; k++) {
    const sig: Anillo = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      sig.push([0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]]);
      sig.push([0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]]);
    }
    pts = sig;
  }
  return [...pts, pts[0]];
}

/** Copia de las manchas con los contornos redondeados, conservando id y propiedades. */
export function suavizarManchas(manchas: Coleccion<Mancha>): Coleccion<Mancha> {
  return {
    ...manchas,
    features: manchas.features.map((m) => ({
      ...m,
      geometry: { ...m.geometry, coordinates: m.geometry.coordinates.map((anillo) => suavizarAnillo(anillo)) },
    })),
  };
}
