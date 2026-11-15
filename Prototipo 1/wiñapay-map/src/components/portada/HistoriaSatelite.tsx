'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { etiquetaVeredicto } from '@/lib/evidencia';
import {
  ANIOS, AREA_QUEMADA_HA, CONTEO_VEREDICTOS, DISTRITOS, DISTRITOS_CON_FUEGO, DISTRITOS_TOTAL, FRASE_PROVINCIA,
  MANCHAS, NDVI_MEDIO_PROVINCIA, POCOS_PIXELES, SERIE_PROVINCIA, TENDENCIA_PROVINCIA, VISTA_MAPA,
} from './datosPortada';
import { movimientoReducido } from './movimiento';

/* Gráfica de la serie anual de la provincia (escala ampliada y rotulada). */
const G = { w: 600, h: 300, ml: 48, mr: 16, mt: 18, mb: 36 };
const LO = Math.floor((Math.min(...SERIE_PROVINCIA) - 0.01) * 100) / 100;
const HI = Math.ceil((Math.max(...SERIE_PROVINCIA) + 0.01) * 100) / 100;
const X = (i: number) => G.ml + (i * (G.w - G.ml - G.mr)) / (SERIE_PROVINCIA.length - 1);
const Y = (v: number) => G.mt + ((HI - v) * (G.h - G.mt - G.mb)) / (HI - LO);
const D_LINEA = SERIE_PROVINCIA.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
const N = SERIE_PROVINCIA.length - 1;
const D_TENDENCIA = `M${X(0)} ${Y(TENDENCIA_PROVINCIA[0]).toFixed(1)}L${X(N)} ${Y(TENDENCIA_PROVINCIA[1]).toFixed(1)}`;
const MARCAS_Y = [LO, (LO + HI) / 2, HI];
const ANIO_MEDIO = ANIOS[Math.floor(N / 2)];

const lista = (n: string[]) => (n.length ? n.join(', ') : 'ninguno');

/* Ajuste de posición de etiquetas que se pisan (Wanchaq es muy pequeño y está pegado a San Sebastián). */
const AJUSTE_ETIQUETA: Record<string, [number, number]> = { '080108': [-34, -20], '080105': [40, 26] };

export function HistoriaSatelite() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || movimientoReducido()) return;
    gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
    el.classList.add('historia--viva');
    const css = getComputedStyle(document.documentElement);
    const c = (t: string) => css.getPropertyValue(`--${t}`).trim();

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      gsap.set(el, { backgroundColor: c('bosque') });
      gsap.set(q('.h-distrito'), { drawSVG: '0%', fillOpacity: 0 });
      gsap.set(q('.h-mancha'), { scale: 0, opacity: 0, transformOrigin: '50% 50%' });
      gsap.set(q('.h-grafica'), { autoAlpha: 0, y: 40 });
      gsap.set(q('.h-linea, .h-tendencia'), { drawSVG: '0%' });
      gsap.set(q('.h-etiqueta'), { autoAlpha: 0 });
      gsap.set(q('.h-brillo'), { opacity: 0 });

      // Escenas: 1 la provincia · 2 donde ardió · 3 el verdor · 4 lo que se puede afirmar
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
      });
      tl.to(q('.h-distrito'), { drawSVG: '100%', duration: 0.6, stagger: 0.04 }, 0)
        .to(q('.h-distrito'), { fillOpacity: 1, duration: 0.3 }, 0.6)
        .to(el, { backgroundColor: c('tinta'), duration: 0.35 }, 1)
        .to(q('.h-distrito'), { fill: c('bosque'), duration: 0.35 }, 1)
        .to(q('.h-mancha'), { scale: 1, opacity: 1, duration: 0.45, stagger: 0.03, ease: 'back.out(2.2)' }, 1.1)
        .to(q('.h-brillo-fuego'), { opacity: 1, duration: 0.35 }, 1.1)
        .to(q('.h-brillo-fuego'), { opacity: 0, duration: 0.3 }, 2)
        .to(q('.h-brillo-verde'), { opacity: 1, duration: 0.35 }, 3.1)
        .to(el, { backgroundColor: c('crema'), duration: 0.35 }, 2)
        .to(q('.h-mapa'), { autoAlpha: 0.1, scale: 0.92, duration: 0.3 }, 2)
        .to(q('.h-grafica'), { autoAlpha: 1, y: 0, duration: 0.3 }, 2.1)
        .to(q('.h-linea'), { drawSVG: '100%', duration: 0.6 }, 2.2)
        .to(q('.h-tendencia'), { drawSVG: '100%', duration: 0.25 }, 2.75)
        .to(el, { backgroundColor: c('salvia'), duration: 0.35 }, 3)
        .to(q('.h-grafica'), { autoAlpha: 0, y: -40, duration: 0.25 }, 3)
        .to(q('.h-mapa'), { autoAlpha: 1, scale: 1, duration: 0.3 }, 3.05)
        .to(q('.h-mancha'), { opacity: 0, duration: 0.2 }, 3.05)
        .to(q('.h-distrito[data-v="robusta"]'), { fill: c('bosque'), stroke: c('crema'), duration: 0.3 }, 3.1)
        .to(q('.h-distrito[data-v="parcial"]'), { fill: c('arena'), stroke: c('bosque'), duration: 0.3 }, 3.1)
        .to(q('.h-distrito[data-v="ninguna"]'), { fill: c('crema'), stroke: c('bosque'), duration: 0.3 }, 3.1)
        .to(q('.h-etiqueta'), { autoAlpha: 1, duration: 0.2, stagger: 0.02 }, 3.25)
        .to({}, { duration: 0.5 }, 3.5);

      // Cifras que cuentan al aparecer
      q('[data-contar]').forEach((b) => {
        const fin = Number(b.dataset.contar);
        const dec = Number(b.dataset.decimales ?? 0);
        const o = { v: 0 };
        gsap.to(o, {
          v: fin, duration: 1.4, ease: 'power2.out',
          scrollTrigger: { trigger: b, start: 'top 80%', once: true },
          onUpdate: () => { b.textContent = o.v.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec }); },
        });
      });
    }, el);

    return () => { ctx.revert(); el.classList.remove('historia--viva'); };
  }, []);

  return (
    <section ref={ref} className="historia" aria-labelledby="titulo-historia">
      <div className="historia-visual" aria-hidden="true">
        <div className="h-brillo h-brillo-fuego" />
        <div className="h-brillo h-brillo-verde" />
        <svg className="h-mapa" viewBox={VISTA_MAPA} focusable="false">
          {DISTRITOS.map((d) => <path key={d.id} d={d.d} className="h-distrito" data-v={d.veredicto} />)}
          {MANCHAS.map((m, i) => <path key={i} d={m.d} className="h-mancha" />)}
          {DISTRITOS.map((d) => (
            <text key={d.id} x={d.cx + (AJUSTE_ETIQUETA[d.id]?.[0] ?? 0)} y={d.cy + (AJUSTE_ETIQUETA[d.id]?.[1] ?? 0)} className="h-etiqueta" data-v={d.veredicto} textAnchor="middle">{d.nombre}</text>
          ))}
        </svg>
        <figure className="h-grafica">
          <svg viewBox={`0 0 ${G.w} ${G.h}`} focusable="false">
            <defs>
              {/* La línea cambia de color con el valor: más verdor arriba (musgo), menos abajo (ocre) */}
              <linearGradient id="h-grad-linea" gradientUnits="userSpaceOnUse" x1="0" y1={Y(HI)} x2="0" y2={Y(LO)}>
                <stop offset="0" style={{ stopColor: 'var(--musgo)' }} />
                <stop offset="1" style={{ stopColor: 'var(--ocre)' }} />
              </linearGradient>
            </defs>
            {MARCAS_Y.map((m) => (
              <g key={m}>
                <line x1={G.ml} x2={G.w - G.mr} y1={Y(m)} y2={Y(m)} className="h-guia" />
                <text x={G.ml - 8} y={Y(m) + 4} textAnchor="end" className="h-eje">{m.toFixed(2)}</text>
              </g>
            ))}
            <text x={G.ml} y={G.h - 10} className="h-eje">{ANIOS[0]}</text>
            <text x={X(Math.floor(N / 2))} y={G.h - 10} textAnchor="middle" className="h-eje">{ANIO_MEDIO}</text>
            <text x={G.w - G.mr} y={G.h - 10} textAnchor="end" className="h-eje">{ANIOS[ANIOS.length - 1]}</text>
            <path d={D_LINEA} className="h-linea" />
            <path d={D_TENDENCIA} className="h-tendencia" />
          </svg>
          <figcaption>NDVI medio anual de la provincia y su tendencia (pendiente de Sen). Escala ampliada de {LO.toFixed(2)} a {HI.toFixed(2)} para ver la variación.</figcaption>
        </figure>
      </div>

      <div className="historia-pasos">
        <article className="h-paso" data-escena="1">
          <h2 id="titulo-historia">Lo que vio el satélite</h2>
          <p className="h-cifra"><b data-contar={DISTRITOS_TOTAL}>{DISTRITOS_TOTAL}</b> distritos, <b data-contar={ANIOS.length}>{ANIOS.length}</b> años</p>
          <p>El sensor MODIS de la NASA mide el verdor de la vegetación (NDVI) cada 16 días, en píxeles de 250 m. Reunimos {ANIOS.length} años de ese registro, de {ANIOS[0]} a {ANIOS[ANIOS.length - 1]}, para cada distrito de la provincia de Cusco.</p>
        </article>
        <article className="h-paso" data-escena="2">
          <h3>Dónde ardió</h3>
          <p className="h-cifra"><b data-contar={MANCHAS.length}>{MANCHAS.length}</b> áreas quemadas, <b data-contar={AREA_QUEMADA_HA}>{AREA_QUEMADA_HA.toLocaleString('es-PE')}</b> ha</p>
          <p>El producto MCD64A1 marca la superficie quemada. Hay registros en {DISTRITOS_CON_FUEGO} de los {DISTRITOS_TOTAL} distritos; mostramos las áreas más extensas de cada uno. El fuego nos dice dónde mirar.</p>
        </article>
        <article className="h-paso" data-escena="3">
          <h3>El verdor, año por año</h3>
          <p className="h-cifra">NDVI medio <b data-contar={NDVI_MEDIO_PROVINCIA} data-decimales="2">{NDVI_MEDIO_PROVINCIA.toFixed(2)}</b></p>
          <p>{FRASE_PROVINCIA}</p>
        </article>
        <article className="h-paso" data-escena="4">
          <h3>Lo que podemos afirmar</h3>
          <ul className="h-veredictos">
            <li data-v="robusta"><b>{CONTEO_VEREDICTOS.robusta.length}</b> {etiquetaVeredicto('robusta').toLowerCase()}: {lista(CONTEO_VEREDICTOS.robusta)}</li>
            <li data-v="parcial"><b>{CONTEO_VEREDICTOS.parcial.length}</b> con {etiquetaVeredicto('parcial').toLowerCase()}: {lista(CONTEO_VEREDICTOS.parcial)}</li>
            <li data-v="ninguna"><b>{CONTEO_VEREDICTOS.ninguna.length}</b> donde {etiquetaVeredicto('ninguna').toLowerCase()}: {lista(CONTEO_VEREDICTOS.ninguna)}</li>
          </ul>
          <p>Solo afirmamos un cambio cuando lo resisten las tres formas de medir el verdor.{POCOS_PIXELES.length > 0 && ` ${POCOS_PIXELES.join(' y ')} se ${POCOS_PIXELES.length > 1 ? 'apoyan' : 'apoya'} en muy pocos píxeles: su resultado es poco estable.`}</p>
          <Link href="/resumen" className="btn btn-bosque">Ver el resumen completo</Link>
        </article>
      </div>
    </section>
  );
}
