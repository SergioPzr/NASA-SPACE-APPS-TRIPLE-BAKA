import { encolar, leerCola, quitarDeCola } from './idb';
import type { Errores } from './validacion';

export type Destino = 'testimonios' | 'iniciativas';
export type ResultadoEnvio = { estado: 'enviado' } | { estado: 'en_cola' } | { estado: 'invalido'; errores: Errores } | { estado: 'rechazado'; mensaje: string };

async function publicar(destino: Destino, cuerpo: Record<string, unknown>): Promise<Response> {
  return fetch(`/api/${destino}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
}

/** Envía; si no hay red o el servidor falla (5xx), guarda en la cola de IndexedDB para reintentar al volver la conexión. */
export async function enviar(destino: Destino, cuerpo: Record<string, unknown>): Promise<ResultadoEnvio> {
  try {
    const r = await publicar(destino, cuerpo);
    if (r.ok) return { estado: 'enviado' };
    const j = (await r.json().catch(() => ({}))) as { errores?: Errores; error?: string };
    if (r.status === 422 && j.errores) return { estado: 'invalido', errores: j.errores };
    if (r.status >= 500) throw new Error('servidor');
    return { estado: 'rechazado', mensaje: j.error ?? 'No se pudo enviar.' };
  } catch {
    try {
      await encolar({ destino, cuerpo, creado: Date.now() });
      return { estado: 'en_cola' };
    } catch {
      return { estado: 'rechazado', mensaje: 'Sin conexión y sin espacio para guardarlo en este dispositivo.' };
    }
  }
}

let vaciando = false;

/** Reenvía lo pendiente. Se detiene ante el primer fallo de red; descarta lo que el servidor rechaza por inválido. */
export async function vaciarCola(): Promise<{ enviados: number; restantes: number }> {
  if (vaciando) return { enviados: 0, restantes: (await leerCola()).length };
  vaciando = true;
  let enviados = 0;
  try {
    for (const item of await leerCola()) {
      try {
        const r = await publicar(item.destino, item.cuerpo);
        if (r.status >= 500 || r.status === 429) break;
        if (r.ok) enviados++;
        if (item.idLocal !== undefined) await quitarDeCola(item.idLocal);
      } catch {
        break;
      }
    }
  } finally {
    vaciando = false;
  }
  return { enviados, restantes: (await leerCola()).length };
}

export const pendientesEnCola = async () => (await leerCola()).length;
