import { AGREGACIONES, etiquetaVeredicto, type Evaluacion, type NombreAgregacion } from './evidencia';
import { porDecada } from './formato';
import type { Datos } from './tipos';

export interface FilaResumen {
  id: string;
  nombre: string;
  pixeles: number;
  ev: Evaluacion;
  por: Record<NombreAgregacion, { media: number; porDecada: number; p: number }>;
}

export const POCOS_PIXELES = 100;

export function filasResumen(datos: Datos, evaluaciones: Record<string, Evaluacion>, evalProvincia: Evaluacion): FilaResumen[] {
  const fila = (id: string, nombre: string, z: Datos['resultados']['provincia'], ev: Evaluacion): FilaResumen => ({
    id, nombre, pixeles: z.pixeles, ev,
    por: Object.fromEntries(AGREGACIONES.map(({ id: ag }) => {
      const a = z.agregaciones[ag];
      return [ag, { media: a.media, porDecada: porDecada(a.pendiente_anual), p: a.p }];
    })) as FilaResumen['por'],
  });
  return [
    ...datos.distritos.features.map((f) => fila(f.properties.id, f.properties.nombre, datos.resultados.distritos[f.properties.id], evaluaciones[f.properties.id])),
    fila('provincia', 'Provincia de Cusco', datos.resultados.provincia, evalProvincia),
  ];
}

const BOM = String.fromCharCode(0xfeff);
const celda = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function aCSV(filas: FilaResumen[]): string {
  const cab = ['zona_id', 'zona', 'pixeles_250m'];
  AGREGACIONES.forEach(({ id }) => cab.push(`${id}_ndvi_medio`, `${id}_cambio_por_decada`, `${id}_p`));
  cab.push('q_media_anual_BH', 'conclusion');
  const lineas = filas.map((f) => {
    const c: (string | number)[] = [f.id, f.nombre, f.pixeles];
    AGREGACIONES.forEach(({ id }) => c.push(f.por[id].media.toFixed(4), f.por[id].porDecada.toFixed(4), f.por[id].p.toFixed(4)));
    c.push(Number.isNaN(f.ev.q_principal) ? '' : f.ev.q_principal.toFixed(4), etiquetaVeredicto(f.ev.veredicto));
    return c.map(celda).join(',');
  });
  return BOM + [cab.join(','), ...lineas].join('\r\n') + '\r\n';
}

export function descargar(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Dibuja el resumen en un canvas (PNG): barras de cambio por década con su conclusión. */
export function dibujarResumen(filas: FilaResumen[], periodo: string): HTMLCanvasElement {
  const css = getComputedStyle(document.documentElement);
  const tok = (n: string) => css.getPropertyValue(n).trim();
  const bosque = tok('--bosque'), texto = tok('--texto'), suave = tok('--suave'), dorado = tok('--dorado'), salvia = tok('--salvia');
  const W = 1200, fh = 54, top = 170, H = top + filas.length * fh + 110;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const f = `${tok('--fuente')}`, ft = `${tok('--fuente-titulo')}`;
  g.fillStyle = bosque; g.fillRect(0, 0, W, H);
  g.fillStyle = dorado; g.font = `34px ${ft}`; g.fillText('wiñapay.', 48, 70);
  g.fillStyle = texto; g.font = `500 22px ${f}`; g.fillText('Cambio del verdor (NDVI) por década · provincia de Cusco', 48, 108);
  g.fillStyle = suave; g.font = `16px ${f}`; g.fillText(`${periodo} · MODIS MOD13Q1 · cambio de la media anual (pendiente de Sen) · conclusión con las 3 formas de medirlo`, 48, 136);

  const maxAbs = Math.max(0.02, ...filas.map((x) => Math.abs(x.por.media_anual.porDecada)));
  const x0 = 520, ancho = 340, mitad = x0 + ancho / 2;
  g.strokeStyle = suave; g.lineWidth = 1; g.beginPath(); g.moveTo(mitad, top - 8); g.lineTo(mitad, top + filas.length * fh); g.stroke();
  filas.forEach((x, i) => {
    const y = top + i * fh;
    const v = x.por.media_anual.porDecada;
    const w = (Math.abs(v) / maxAbs) * (ancho / 2 - 6);
    g.fillStyle = texto; g.font = `${x.id === 'provincia' ? 700 : 500} 20px ${f}`; g.textBaseline = 'middle';
    g.fillText(x.nombre, 48, y + fh / 2 - 4);
    const solida = x.ev.veredicto === 'robusta';
    g.fillStyle = solida ? (v >= 0 ? salvia : dorado) : 'rgba(244,240,227,0.22)';
    g.fillRect(v >= 0 ? mitad : mitad - w, y + 10, Math.max(w, 2), fh - 26);
    g.fillStyle = suave; g.font = `15px ${f}`;
    g.fillText(`${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(3)} por década`, x0 + ancho + 24, y + fh / 2 - 4);
    g.fillStyle = solida ? dorado : suave;
    g.fillText(etiquetaVeredicto(x.ev.veredicto), x0 + ancho + 24, y + fh / 2 + 14);
    if (x.pixeles < POCOS_PIXELES) { g.fillStyle = suave; g.font = `13px ${f}`; g.fillText(`solo ${x.pixeles} píxeles`, 48, y + fh / 2 + 14); }
  });
  g.fillStyle = suave; g.font = `14px ${f}`; g.textBaseline = 'alphabetic';
  g.fillText('Barra sólida = evidencia suficiente (media, máximo y estación seca coinciden). Barra tenue = aún no hay evidencia suficiente.', 48, H - 52);
  g.fillText('NASA Space Apps 2026 · "El territorio cambia. Hagámoslo visible."', 48, H - 28);
  return c;
}
