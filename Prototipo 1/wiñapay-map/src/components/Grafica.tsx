'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { mediana } from '@/lib/geo';

interface Props {
  serie: number[];
  pendienteAnual: number;
  anios: number[];
  progreso?: number;
  tendencia?: boolean;
  rapido?: boolean;
  etiqueta: string;
}

const W = 300, H = 112, ML = 30, MR = 6, MT = 8, MB = 18;

/** Serie anual de NDVI con la recta de Sen. `progreso` (0–1) dibuja la línea de forma gradual. */
export function Grafica({ serie, pendienteAnual, anios, progreso = 1, tendencia = true, rapido = false, etiqueta }: Props) {
  const linea = useRef<SVGPathElement>(null);
  const previo = useRef<number | null>(null);

  const lo = Math.min(...serie) - 0.01, hi = Math.max(...serie) + 0.01;
  const X = (i: number) => ML + (i * (W - ML - MR)) / (serie.length - 1);
  const Y = (v: number) => MT + ((hi - v) * (H - MT - MB)) / (hi - lo);
  const d = serie.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const b = mediana(serie.map((v, i) => v - pendienteAnual * i));
  const n = serie.length - 1;
  const dTend = `M${X(0).toFixed(1)} ${Y(b).toFixed(1)}L${X(n).toFixed(1)} ${Y(b + pendienteAnual * n).toFixed(1)}`;

  useLayoutEffect(() => {
    const el = linea.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    const destino = len * (1 - Math.min(progreso, 1));
    if (previo.current === null || rapido) {
      el.style.strokeDashoffset = String(destino);
    } else {
      gsap.to(el, { strokeDashoffset: destino, duration: 1.3, ease: 'power3.inOut' });
    }
    previo.current = progreso;
  }, [progreso, d, rapido]);

  const a0 = anios[0], a1 = anios[anios.length - 1], am = anios[Math.floor(anios.length / 2)];
  return (
    <svg className="grafica" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${etiqueta}, de ${a0} a ${a1}`}>
      <line x1={ML} y1={H - MB} x2={W - MR} y2={H - MB} stroke="#5d645a" />
      <line x1={ML} y1={MT} x2={ML} y2={H - MB} stroke="#5d645a" />
      <text x={ML - 4} y={MT + 8} textAnchor="end">{hi.toFixed(2)}</text>
      <text x={ML - 4} y={H - MB} textAnchor="end">{lo.toFixed(2)}</text>
      <text x={ML} y={H - 5}>{a0}</text>
      <text x={X(Math.floor(n / 2))} y={H - 5} textAnchor="middle">{am}</text>
      <text x={W - MR} y={H - 5} textAnchor="end">{a1}</text>
      <path ref={linea} d={d} fill="none" stroke="#244d3c" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={dTend} fill="none" stroke="#b9542d" strokeWidth="1.8" strokeDasharray="5 4" className="g-tend" style={{ opacity: tendencia ? 1 : 0 }} />
    </svg>
  );
}
