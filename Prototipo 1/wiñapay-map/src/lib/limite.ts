const ventanas = new Map<string, number[]>();

const MAX_POR_VENTANA = Number(process.env.WINAPAY_LIMITE_ENVIOS) || 5;

/** Límite básico por IP en memoria: frena el abuso casual; en producción conviene sumar uno en el borde. */
export function permitir(clave: string, max = MAX_POR_VENTANA, ventanaMs = 60 * 60 * 1000): boolean {
  const ahora = Date.now();
  const marcas = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (marcas.length >= max) {
    ventanas.set(clave, marcas);
    return false;
  }
  marcas.push(ahora);
  ventanas.set(clave, marcas);
  if (ventanas.size > 5000) {
    for (const k of ventanas.keys()) {
      ventanas.delete(k);
      if (ventanas.size <= 2500) break;
    }
  }
  return true;
}

export const ipDe = (req: Request) => (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'local').split(',')[0].trim();
