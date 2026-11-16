import distritos from '@/data/distritos.json';
import manchas from '@/data/manchas.json';
import resultados from '@/data/resultados.json';
import { evaluar, fraseEvidencia, type Veredicto } from '@/lib/evidencia';
import { porDecada } from '@/lib/formato';
import { mediana } from '@/lib/geo';
import { suavizarAnillo } from '../suavizar';

/*
 * Datos de la portada, calculados en el servidor a partir de los mismos JSON y la misma regla
 * de evidencia (`evaluar`) que usa el resto de la app. Este módulo solo lee: no cambia datos.
 */

type Anillo = number[][];

const anillos = distritos.features.map((f) => f.geometry.coordinates[0] as Anillo);
const puntos = anillos.flat();
const lon0 = Math.min(...puntos.map((p) => p[0]));
const lon1 = Math.max(...puntos.map((p) => p[0]));
const lat0 = Math.min(...puntos.map((p) => p[1]));
const lat1 = Math.max(...puntos.map((p) => p[1]));
const k = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
const escala = 1000 / ((lon1 - lon0) * k);
const ALTO = (lat1 - lat0) * escala;
const MARGEN = 10;

const px = (lon: number) => (lon - lon0) * k * escala;
const py = (lat: number) => (lat1 - lat) * escala;
const trazo = (anillo: Anillo) =>
  anillo.map(([lon, lat], i) => `${i ? 'L' : 'M'}${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`).join('') + 'Z';

export const VISTA_MAPA = `${-MARGEN} ${-MARGEN} ${1000 + MARGEN * 2} ${(ALTO + MARGEN * 2).toFixed(1)}`;

const zonas = Object.fromEntries(Object.entries(resultados.distritos).map(([id, z]) => [id, z.agregaciones]));
const evaluaciones = evaluar(zonas);
export const EVAL_PROVINCIA = evaluar({ provincia: resultados.provincia.agregaciones }).provincia;

export interface DistritoPortada {
  id: string;
  nombre: string;
  d: string;
  cx: number;
  cy: number;
  veredicto: Veredicto;
}

export const DISTRITOS: DistritoPortada[] = distritos.features.map((f) => ({
  id: f.properties.id,
  nombre: f.properties.nombre,
  d: trazo(f.geometry.coordinates[0] as Anillo),
  cx: px(f.properties.centroide[0]),
  cy: py(f.properties.centroide[1]),
  veredicto: evaluaciones[f.properties.id].veredicto,
}));

export interface ManchaPortada {
  d: string;
  area: number;
  cx: number;
  cy: number;
}

export const MANCHAS: ManchaPortada[] = manchas.features.map((f) => {
  const anillo = f.geometry.coordinates[0] as Anillo;
  const xs = anillo.map((p) => px(p[0]));
  const ys = anillo.map((p) => py(p[1]));
  return {
    d: trazo(suavizarAnillo(anillo)),
    area: f.properties.area_ha,
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
});

export const DISTRITOS_TOTAL = DISTRITOS.length;
export const DISTRITOS_CON_FUEGO = new Set(manchas.features.map((f) => f.properties.distrito)).size;
export const AREA_QUEMADA_HA = Math.round(MANCHAS.reduce((s, m) => s + m.area, 0));
export const ANIOS = resultados.anios;

/* Serie anual de la provincia (media anual) y recta de Sen, como en la gráfica del mapa. */
const principal = resultados.provincia.agregaciones.media_anual;
export const SERIE_PROVINCIA = principal.serie;
export const NDVI_MEDIO_PROVINCIA = principal.media;
const intercepto = mediana(principal.serie.map((v, i) => v - principal.pendiente_anual * i));
export const TENDENCIA_PROVINCIA: [number, number] = [intercepto, intercepto + principal.pendiente_anual * (principal.serie.length - 1)];
export const FRASE_PROVINCIA = fraseEvidencia('la provincia', porDecada(principal.pendiente_anual), EVAL_PROVINCIA);

export const CONTEO_VEREDICTOS: Record<Veredicto, string[]> = { robusta: [], parcial: [], ninguna: [] };
DISTRITOS.forEach((d) => CONTEO_VEREDICTOS[d.veredicto].push(d.nombre));

/** Distritos con muy pocos píxeles de 250 m (mismo umbral que el resumen): sus resultados son poco estables. */
export const POCOS_PIXELES = distritos.features
  .filter((f) => resultados.distritos[f.properties.id as keyof typeof resultados.distritos].pixeles < 100)
  .map((f) => f.properties.nombre);

/** Los 3 distritos con más superficie quemada registrada (MCD64A1), de mayor a menor. */
const quemaPorDistrito = new Map<string, number>();
manchas.features.forEach((f) => {
  quemaPorDistrito.set(f.properties.distrito, (quemaPorDistrito.get(f.properties.distrito) ?? 0) + f.properties.area_ha);
});
export const MAYORES_QUEMAS = [...quemaPorDistrito.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([id]) => distritos.features.find((f) => f.properties.id === id)?.properties.nombre ?? id);
