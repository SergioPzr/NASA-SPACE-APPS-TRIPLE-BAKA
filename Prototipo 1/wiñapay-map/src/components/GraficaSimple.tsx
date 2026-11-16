'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { mediana } from '@/lib/geo';

interface Props {
  serie: number[];
  pendienteAnual: number;
  anios: number[];
  progreso?: number;
  rapido?: boolean;
  etiqueta: string;
}

const W = 340, H = 160, ML = 6, MR = 6, MT = 12, MB = 24;
const VERDE = '#3d8b3a', SECO = '#c9a84c', TEND = '#b9542d';

/**
 * Gráfica fácil de leer: una barra por año. Verde = año más verde que el promedio; dorado = año
 * menos verde. Marca el promedio, el año más verde, el menos verde y hacia dónde va (línea
 * punteada). La escala se amplía alrededor de los datos para que las diferencias se vean.
 */
export function GraficaSimple({ serie, pendienteAnual, anios, progreso = 1, rapido = false, etiqueta }: Props) {
  const barras = useRef<(SVGRectElement | null)[]>([]);
  const previo = useRef(0);

  const n = serie.length;
  const min = Math.min(...serie), max = Math.max(...serie);
  const rango = Math.max(max - min, 0.01);
  const lo = min - rango * 0.45, hi = max + rango * 0.2;
  const paso = (W - ML - MR) / n;
  const X = (i: number) => ML + i * paso;
  const Y = (v: number) => MT + ((hi - v) * (H - MT - MB)) / (hi - lo);
  const base = H - MB;
  const promedio = serie.reduce((s, v) => s + v, 0) / n;
  const iMax = serie.indexOf(max), iMin = serie.indexOf(min);
  const b = mediana(serie.map((v, i) => v - pendienteAnual * i));
  const cx = (i: number) => X(i) + paso / 2;
  const visibles = Math.round(Math.min(progreso, 1) * n);
  const completa = visibles >= n;

  // Las barras nuevas crecen desde abajo, una tras otra
  useLayoutEffect(() => {
    const desde = previo.current;
    const nuevas = barras.current.slice(desde, visibles).filter(Boolean) as SVGRectElement[];
    if (nuevas.length && !rapido) {
      gsap.fromTo(nuevas, { scaleY: 0 }, { scaleY: 1, duration: 0.55, stagger: 0.035, ease: 'power3.out' });
    }
    previo.current = visibles;
  }, [visibles, rapido]);

  return (
    <figure className="grafica-simple">
      <span className="gs-titulo">Vegetación de cada año</span>
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`${etiqueta}, de ${anios[0]} a ${anios[n - 1]}. El año más verde fue ${anios[iMax]} y el menos verde ${anios[iMin]}.`}>
        {serie.map((v, i) => (
          <rect
            key={anios[i]}
            ref={(el) => { barras.current[i] = el; }}
            x={X(i) + paso * 0.14}
            y={Y(v)}
            width={paso * 0.72}
            height={Math.max(1, base - Y(v))}
            rx={1.5}
            fill={v >= promedio ? VERDE : SECO}
            stroke={completa && (i === iMax || i === iMin) ? '#1c2a18' : 'none'}
            strokeWidth={1.6}
            style={{ opacity: i < visibles ? 1 : 0, transformBox: 'fill-box', transformOrigin: '50% 100%' }}
          />
        ))}
        <line x1={ML} x2={W - MR} y1={base} y2={base} className="gs-base" />
        {completa && (
          <>
            <line x1={ML} x2={W - MR} y1={Y(promedio)} y2={Y(promedio)} className="gs-promedio" />
            <text x={W - MR} y={Y(promedio) + 12} textAnchor="end" className="gs-rot">promedio</text>
            <line x1={cx(0)} y1={Y(b)} x2={cx(n - 1)} y2={Y(b + pendienteAnual * (n - 1))} stroke={TEND} strokeWidth="2.2" strokeDasharray="6 4" strokeLinecap="round" />
          </>
        )}
        <text x={ML} y={H - 7} className="gs-anio">{anios[0]}</text>
        <text x={W / 2} y={H - 7} className="gs-anio" textAnchor="middle">{anios[Math.floor((n - 1) / 2)]}</text>
        <text x={W - MR} y={H - 7} className="gs-anio" textAnchor="end">{anios[n - 1]}</text>
      </svg>
      <figcaption>
        <span><i className="gs-ley" style={{ background: VERDE }} aria-hidden="true" />Más verde que el promedio</span>
        <span><i className="gs-ley" style={{ background: SECO }} aria-hidden="true" />Menos verde</span>
        <span><i className="gs-ley-tend" aria-hidden="true" />Hacia dónde va</span>
      </figcaption>
      {completa && (
        <p className="gs-extremos">Año más verde: <b>{anios[iMax]}</b> · Año menos verde: <b>{anios[iMin]}</b></p>
      )}
    </figure>
  );
}
