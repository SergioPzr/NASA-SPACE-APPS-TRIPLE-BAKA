const CACHE_DATOS = 'public, max-age=300, stale-while-revalidate=86400';

export const datos = (cuerpo: unknown) => Response.json(cuerpo, { headers: { 'Cache-Control': CACHE_DATOS } });
export const sinCache = (cuerpo: unknown, status = 200) => Response.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });
export const error = (status: number, mensaje: string, extra?: Record<string, unknown>) => sinCache({ error: mensaje, ...extra }, status);

export async function conFalla(f: () => Promise<Response>): Promise<Response> {
  try {
    return await f();
  } catch {
    return error(503, 'Servicio no disponible por ahora.');
  }
}
