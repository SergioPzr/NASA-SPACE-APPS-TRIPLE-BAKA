import type { Evaluacion } from '@/lib/evidencia';
import type { Coleccion, Mancha } from '@/lib/tipos';

/*
 * Traduce los datos reales (NDVI de MODIS y áreas quemadas MCD64A1) a frases para cualquier
 * persona, sin tecnicismos. No cambia ni inventa datos: solo los explica.
 */

/** Una cancha de fútbol reglamentaria (105 × 68 m) mide unas 0,714 hectáreas. */
const HA_POR_CANCHA = 0.714;

export const canchas = (ha: number) => Math.max(1, Math.round(ha / HA_POR_CANCHA));
export const hectareas = (ha: number) => Math.round(ha).toLocaleString('es-PE');

/** Cuánta vegetación hay, en palabras (a partir del verdor medio medido por el satélite). */
export function nivelVerde(media: number): { titulo: string; detalle: string } {
  if (media < 0.2) return { titulo: 'Poca vegetación', detalle: 'Hay más suelo, roca o ciudad que plantas.' };
  if (media < 0.35) return { titulo: 'Vegetación escasa', detalle: 'Hay plantas, pero dispersas: pastos y matorrales bajos.' };
  if (media < 0.5) return { titulo: 'Vegetación media', detalle: 'Una mezcla de pastos, arbustos y algunas zonas más tupidas.' };
  return { titulo: 'Mucha vegetación', detalle: 'La zona está bastante cubierta de plantas.' };
}

/** Qué pasó con la vegetación entre el primer y el último año, contado sin términos técnicos. */
export function fraseCambio(ev: Evaluacion, desde: number, hasta: number): { titulo: string; detalle: string } {
  const mas = ev.direccion === 'aumento';
  if (ev.veredicto === 'robusta') {
    return {
      titulo: mas ? 'Hoy hay más vegetación' : 'Hoy hay menos vegetación',
      detalle: `Comparando ${desde} con ${hasta}, la zona ${mas ? 'ganó' : 'perdió'} vegetación, y el cambio se ve claro de varias maneras distintas de medirlo.`,
    };
  }
  if (ev.veredicto === 'parcial') {
    return {
      titulo: mas ? 'Parece que hay algo más de vegetación' : 'Parece que hay algo menos de vegetación',
      detalle: `Hay señales de ${mas ? 'aumento' : 'disminución'} desde ${desde}, pero todavía no son lo bastante claras para asegurarlo.`,
    };
  }
  return {
    titulo: 'Casi no cambió',
    detalle: `Entre ${desde} y ${hasta} la vegetación subió y bajó según el año, pero no hay un cambio que se pueda asegurar.`,
  };
}

/**
 * Para el mapa: deja como máximo `max` incendios por distrito (los más grandes). Es solo cómo se
 * muestran en el juego; los datos originales no se modifican.
 */
export function limitarFuegos(manchas: Coleccion<Mancha>, max = 2): Coleccion<Mancha> {
  const porDistrito = new Map<string, Mancha[]>();
  manchas.features.forEach((m) => {
    const lista = porDistrito.get(m.properties.distrito) ?? [];
    lista.push(m);
    porDistrito.set(m.properties.distrito, lista);
  });
  const elegidas = new Set<number>();
  porDistrito.forEach((lista) => {
    [...lista].sort((a, b) => b.properties.area_ha - a.properties.area_ha).slice(0, max).forEach((m) => elegidas.add(m.id));
  });
  return { ...manchas, features: manchas.features.filter((m) => elegidas.has(m.id)) };
}
