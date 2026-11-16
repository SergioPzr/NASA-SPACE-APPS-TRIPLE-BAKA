import { promises as fs } from 'node:fs';
import path from 'node:path';
import distritosLocal from '@/data/distritos.json';
import manchasLocal from '@/data/manchas.json';
import curvasLocal from '@/data/curvas.json';
import resultadosLocal from '@/data/resultados.json';
import type { Coleccion, Distrito, Mancha, Curva, Resultados, ResultadoZona, Envio } from './tipos';
import type { NombreAgregacion } from './evidencia';
import type { EnvioIniciativa } from './validacion';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_ANON_KEY;
export const modoSupabase = Boolean(URL_SB && KEY_SB);
export const modo = () => (modoSupabase ? 'supabase' : 'local');

async function sb<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL_SB}/rest/v1/${ruta}`, {
    ...init,
    headers: { apikey: KEY_SB!, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

const coleccion = <T>(features: T[]): Coleccion<T> => ({ type: 'FeatureCollection', features });

export async function distritos(): Promise<Coleccion<Distrito>> {
  if (!modoSupabase) return distritosLocal as unknown as Coleccion<Distrito>;
  const filas = await sb<{ feature: Distrito }[]>('distritos_geojson?select=feature');
  return coleccion(filas.map((f) => f.feature));
}

export async function manchas(): Promise<Coleccion<Mancha>> {
  if (!modoSupabase) return manchasLocal as unknown as Coleccion<Mancha>;
  const filas = await sb<{ feature: Mancha }[]>('manchas_geojson?select=feature');
  return coleccion(filas.map((f) => f.feature));
}

export async function curvas(): Promise<Coleccion<Curva>> {
  return curvasLocal as unknown as Coleccion<Curva>;
}

interface FilaSerie {
  zona_id: string;
  agregacion: NombreAgregacion;
  serie: number[];
  media: number;
  pendiente_anual: number;
  p: number;
  tau: number;
  n: number;
  pixeles: number;
  significativo: boolean;
  direccion: string;
}

export async function resultados(): Promise<Resultados> {
  const base = resultadosLocal as unknown as Resultados;
  if (!modoSupabase) return base;
  const filas = await sb<FilaSerie[]>('serie_ndvi?select=*');
  const zonas: Record<string, ResultadoZona> = {};
  for (const { zona_id, agregacion, pixeles, ...resto } of filas) {
    const z = (zonas[zona_id] ??= { pixeles, agregaciones: {} as ResultadoZona['agregaciones'] });
    z.agregaciones[agregacion] = resto;
  }
  const { provincia, ...porDistrito } = zonas;
  return { ...base, distritos: porDistrito, provincia };
}

export async function serie(id: string): Promise<Resultados | ResultadoZona | null> {
  const r = await resultados();
  if (id === 'todos') return r;
  if (id === 'provincia') return r.provincia;
  return r.distritos[id] ?? null;
}

export const idsDistrito = () => (distritosLocal as unknown as Coleccion<Distrito>).features.map((f) => f.properties.id);

/* ───────── Testimonios e iniciativas (moderación previa) ───────── */
export type Tabla = 'testimonios' | 'iniciativas';
type Fila = Record<string, unknown> & { id: string; creado: string; estado: 'pendiente' | 'aprobado' | 'rechazado' };

const archivo = (t: Tabla) => path.join(process.cwd(), process.env.WINAPAY_DATA_DIR || '.data', `${t}.json`);
async function leerLocal(t: Tabla): Promise<Fila[]> {
  try {
    return JSON.parse(await fs.readFile(archivo(t), 'utf8')) as Fila[];
  } catch {
    return [];
  }
}

const CAMPOS_PUBLICOS: Record<Tabla, string[]> = {
  testimonios: ['id', 'texto', 'nombre', 'distrito', 'creado'],
  iniciativas: ['id', 'titulo', 'organizacion', 'distrito', 'descripcion', 'creado'],
};

export async function publicos<T>(t: Tabla): Promise<T[]> {
  const campos = CAMPOS_PUBLICOS[t];
  if (modoSupabase) return sb<T[]>(`${t}?estado=eq.aprobado&select=${campos.join(',')}&order=creado.desc&limit=100`);
  const filas = await leerLocal(t);
  return filas.filter((f) => f.estado === 'aprobado').map((f) => Object.fromEntries(campos.map((c) => [c, f[c]]))) as T[];
}

export async function crear(t: Tabla, datos: Envio | EnvioIniciativa): Promise<void> {
  if (modoSupabase) {
    await sb(t, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...datos, estado: 'pendiente' }) });
    return;
  }
  const filas = await leerLocal(t);
  filas.push({ ...datos, id: crypto.randomUUID(), creado: new Date().toISOString(), estado: 'pendiente' });
  await fs.mkdir(path.dirname(archivo(t)), { recursive: true });
  await fs.writeFile(archivo(t), JSON.stringify(filas, null, 2));
}
