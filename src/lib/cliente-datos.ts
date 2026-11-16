import { guardarDato, leerDato } from './idb';
import type { Coleccion, Curva, Datos, Distrito, Mancha, Resultados } from './tipos';

export type Origen = 'red' | 'cache';

/** Red primero (y se guarda en IndexedDB); si falla, lo último guardado. */
export async function traer<T>(url: string): Promise<{ dato: T; origen: Origen }> {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(String(r.status));
    const dato = (await r.json()) as T;
    void guardarDato(url, dato);
    return { dato, origen: 'red' };
  } catch (e) {
    const guardado = await leerDato<T>(url);
    if (guardado !== undefined) return { dato: guardado, origen: 'cache' };
    throw e;
  }
}

let enCurso: Promise<{ datos: Datos; origen: Origen }> | null = null;

export function cargarDatos(): Promise<{ datos: Datos; origen: Origen }> {
  enCurso ??= (async () => {
    const [d, m, c, r] = await Promise.all([
      traer<Coleccion<Distrito>>('/api/distritos'),
      traer<Coleccion<Mancha>>('/api/manchas'),
      traer<Coleccion<Curva>>('/api/curvas'),
      traer<Resultados>('/api/serie/todos'),
    ]);
    const origen: Origen = [d, m, c, r].every((x) => x.origen === 'red') ? 'red' : 'cache';
    return { datos: { distritos: d.dato, manchas: m.dato, curvas: c.dato, resultados: r.dato }, origen };
  })().catch((e) => {
    enCurso = null;
    throw e;
  });
  return enCurso;
}
