export const NIVEL = 0.05;
export const USAR_FDR = true;

export type NombreAgregacion = 'media_anual' | 'maximo_anual' | 'estacion_seca';
export const AGREGACIONES: { id: NombreAgregacion; nombre: string }[] = [
  { id: 'media_anual', nombre: 'Media anual' },
  { id: 'maximo_anual', nombre: 'Máximo anual' },
  { id: 'estacion_seca', nombre: 'Estación seca (may–sep)' },
];

export interface PruebaAgregacion {
  pendiente_anual: number;
  p: number;
}

export type Veredicto = 'robusta' | 'parcial' | 'ninguna';

export interface Evaluacion {
  veredicto: Veredicto;
  direccion: 'aumento' | 'descenso' | null;
  significativas: NombreAgregacion[];
  calculadas: NombreAgregacion[];
  q_principal: number;
}

/** Benjamini–Hochberg: valores q ajustados, en el mismo orden que la entrada. */
export function ajusteBH(p: number[]): number[] {
  const m = p.length;
  const orden = p.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const q = new Array<number>(m);
  let min = 1;
  for (let k = m - 1; k >= 0; k--) {
    min = Math.min(min, (orden[k][0] * m) / (k + 1));
    q[orden[k][1]] = Math.min(1, min);
  }
  return q;
}

type Entrada = Partial<Record<NombreAgregacion, PruebaAgregacion>>;

/**
 * Regla fijada de antemano (no se elige la agregación que dé significancia):
 * - robusta: la media anual es significativa tras corregir por varios distritos (BH) y
 *   todas las demás agregaciones calculadas apuntan en la misma dirección y también son significativas;
 * - parcial: hay señal en la media anual o en alguna otra, pero no en todas;
 * - ninguna: "aún no hay evidencia suficiente".
 */
export function evaluar(zonas: Record<string, Entrada>, nivel = NIVEL): Record<string, Evaluacion> {
  const ids = Object.keys(zonas);
  const out: Record<string, Evaluacion> = {};
  const nombres = AGREGACIONES.map((a) => a.id);
  const q: Record<string, Record<string, number>> = {};
  for (const ag of nombres) {
    const con = ids.filter((id) => zonas[id][ag]);
    const qs = USAR_FDR ? ajusteBH(con.map((id) => zonas[id][ag]!.p)) : con.map((id) => zonas[id][ag]!.p);
    con.forEach((id, i) => { (q[id] ??= {})[ag] = qs[i]; });
  }
  for (const id of ids) {
    const calculadas = nombres.filter((ag) => zonas[id][ag]);
    const significativas = calculadas.filter((ag) => (q[id][ag] ?? 1) < nivel);
    const principal = zonas[id].media_anual;
    const signo = (ag: NombreAgregacion) => Math.sign(zonas[id][ag]!.pendiente_anual);
    const mismaDireccion = significativas.length > 0 && significativas.every((ag) => signo(ag) === signo(significativas[0]));
    let veredicto: Veredicto = 'ninguna';
    if (principal && significativas.includes('media_anual') && mismaDireccion && significativas.length === calculadas.length) veredicto = 'robusta';
    else if (significativas.length > 0) veredicto = 'parcial';
    const ref = significativas[0] ?? 'media_anual';
    const dir = zonas[id][ref] ? (signo(ref) >= 0 ? 'aumento' : 'descenso') : null;
    out[id] = {
      veredicto,
      direccion: veredicto === 'ninguna' ? null : dir,
      significativas,
      calculadas,
      q_principal: q[id]?.media_anual ?? NaN,
    };
  }
  return out;
}

export function fraseEvidencia(nombre: string, porDecada: number, ev: Evaluacion): string {
  const cambio = `${Math.abs(porDecada).toFixed(3)} puntos de NDVI por década`;
  if (ev.veredicto === 'robusta') {
    return `Entre 2001 y 2025 el verdor de ${nombre} ${ev.direccion === 'aumento' ? 'aumentó' : 'disminuyó'} unos ${cambio}, y la señal se repite en las ${ev.calculadas.length} formas de medirlo. Hay evidencia estadística suficiente.`;
  }
  if (ev.veredicto === 'parcial') {
    return `En ${nombre} aparece una señal de ${ev.direccion === 'aumento' ? 'aumento' : 'descenso'} del verdor en ${ev.significativas.length} de ${ev.calculadas.length} formas de medirlo, pero no en todas: aún no hay evidencia suficiente para afirmar una tendencia.`;
  }
  return `Entre 2001 y 2025 el verdor de ${nombre} varió unos ${cambio}, pero aún no hay evidencia suficiente para afirmar una tendencia.`;
}

export const etiquetaVeredicto = (v: Veredicto) =>
  v === 'robusta' ? 'Evidencia suficiente' : v === 'parcial' ? 'Señal parcial' : 'Aún no hay evidencia suficiente';
