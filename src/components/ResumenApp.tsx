'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import type { Datos } from '@/lib/tipos';
import { useDatos } from '@/lib/useDatos';
import { hectareas, nivelVerde } from './lenguajeSimple';

/*
 * Resumen de la provincia en lenguaje sencillo. Todo sale de los datos reales:
 * la vegetación de cada año (satélite MODIS) y las zonas quemadas (MCD64A1).
 * Los años se recorren por periodos de 5 años con el selector de estrellas de la derecha.
 */

interface Periodo { desde: number; hasta: number; i0: number; i1: number }

const TAM_PERIODO = 5;
const UMBRAL_PARECIDO = 0.01; // diferencias menores se cuentan como «parecido»
const prom = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;

function periodosDe(anios: number[]): Periodo[] {
  const out: Periodo[] = [];
  for (let i = 0; i < anios.length; i += TAM_PERIODO) {
    const i1 = Math.min(i + TAM_PERIODO, anios.length) - 1;
    out.push({ desde: anios[i], hasta: anios[i1], i0: i, i1 });
  }
  return out;
}

export function ResumenApp() {
  const d = useDatos();
  if (d.estado !== 'listo') {
    return (
      <main className="pagina">
        <h1 className="titulo-centrado">Resumen de la provincia de Cusco</h1>
        {d.estado === 'cargando' ? <p role="status">Cargando…</p> : (
          <div role="alert" className="panel aviso">
            <p>No pudimos cargar los datos y no hay una copia guardada en este dispositivo.</p>
            <button type="button" className="btn-sec" onClick={d.reintentar}>Reintentar</button>
          </div>
        )}
      </main>
    );
  }
  return <Resumen datos={d.datos} />;
}

function Resumen({ datos }: { datos: Datos }) {
  const anios = datos.resultados.anios;
  const periodos = useMemo(() => periodosDe(anios), [anios]);
  const [activo, setActivo] = useState(0);
  const per = periodos[activo];
  const prev = activo > 0 ? periodos[activo - 1] : null;
  const sig = activo < periodos.length - 1 ? periodos[activo + 1] : null;
  const contenido = useRef<HTMLDivElement>(null);
  const cabecera = useRef<HTMLElement>(null);
  const barraSig = useRef<HTMLElement>(null);
  const primera = useRef(true);
  const activoRef = useRef(activo);
  activoRef.current = activo;
  const saltar = useRef<() => void>(() => {});

  /*
   * Al final de un periodo, si se sigue bajando, se pasa solo al siguiente: una barrita se llena
   * mientras se insiste (para que no salte por accidente) y la página sube suave al inicio del
   * nuevo periodo con GSAP.
   */
  useEffect(() => {
    gsap.registerPlugin(ScrollToPlugin);
    const UMBRAL = 280;
    let acumulado = 0, ocupado = false, espera = 0, y0 = 0;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
    const alFinal = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    const llenar = (v: number, dur = 0.25) => { if (barraSig.current) gsap.to(barraSig.current, { scaleX: v, duration: dur, ease: 'power2.out', overwrite: true }); };

    const irSiguiente = () => {
      if (ocupado || activoRef.current >= periodos.length - 1) return;
      ocupado = true;
      acumulado = 0;
      llenar(1, 0.15);
      setActivo(activoRef.current + 1);
      gsap.to(window, {
        scrollTo: { y: cabecera.current ?? 0, offsetY: navH + 24, autoKill: false },
        duration: reducido ? 0 : 1.3,
        ease: 'power3.inOut',
        onComplete: () => { ocupado = false; llenar(0, 0.3); },
      });
    };
    saltar.current = irSiguiente;

    /* Subir: arriba del todo, si se sigue subiendo el contenido empieza a desvanecerse poco a poco
       (no de golpe) y, al insistir lo suficiente, pasa al periodo anterior. Si se suelta, vuelve. */
    let arriba = 0, esperaArriba = 0;
    const atenuar = (p: number, dur = 0.3) => {
      const el = contenido.current;
      if (!el) return;
      gsap.to(el, { opacity: 1 - 0.55 * p, y: 30 * p, filter: `blur(${(3 * p).toFixed(2)}px)`, duration: reducido ? 0 : dur, ease: 'power2.out', overwrite: true });
    };
    const irAnterior = () => {
      if (ocupado || activoRef.current <= 0) return;
      ocupado = true;
      arriba = 0;
      setActivo(activoRef.current - 1);
      atenuar(0, 0.7);
      window.setTimeout(() => { ocupado = false; }, 800);
    };

    const empujar = (d: number, objetivo: EventTarget | null) => {
      if (ocupado) return;
      if (objetivo instanceof Element && objetivo.closest('.constelacion')) return;
      if (d < 0 && window.scrollY <= 2 && activoRef.current > 0) {
        arriba = Math.min(UMBRAL, arriba - d);
        atenuar(arriba / UMBRAL);
        window.clearTimeout(esperaArriba);
        esperaArriba = window.setTimeout(() => { arriba = 0; atenuar(0, 0.6); }, 500);
        if (arriba >= UMBRAL) irAnterior();
        return;
      }
      if (d <= 0 || !alFinal() || activoRef.current >= periodos.length - 1) return;
      acumulado = Math.min(UMBRAL, acumulado + d);
      llenar(acumulado / UMBRAL);
      window.clearTimeout(espera);
      espera = window.setTimeout(() => { acumulado = 0; llenar(0, 0.6); }, 700);
      if (acumulado >= UMBRAL) irSiguiente();
    };
    const rueda = (e: WheelEvent) => empujar(e.deltaY, e.target);
    const inicioToque = (e: TouchEvent) => { y0 = e.touches[0].clientY; };
    const movToque = (e: TouchEvent) => { const y = e.touches[0].clientY; empujar((y0 - y) * 1.5, e.target); y0 = y; };
    window.addEventListener('wheel', rueda, { passive: true });
    window.addEventListener('touchstart', inicioToque, { passive: true });
    window.addEventListener('touchmove', movToque, { passive: true });
    return () => {
      window.clearTimeout(espera);
      window.clearTimeout(esperaArriba);
      window.removeEventListener('wheel', rueda);
      window.removeEventListener('touchstart', inicioToque);
      window.removeEventListener('touchmove', movToque);
    };
  }, [periodos.length]);

  const distritos = datos.distritos.features.map((f) => {
    const serie = datos.resultados.distritos[f.properties.id].agregaciones.media_anual.serie;
    const media = prom(serie.slice(per.i0, per.i1 + 1));
    const antes = prev ? prom(serie.slice(prev.i0, prev.i1 + 1)) : null;
    const ha = datos.manchas.features
      .filter((m) => {
        const anio = (m.properties as { anio_ultimo?: number }).anio_ultimo;
        return m.properties.distrito === f.properties.id && anio !== undefined && anio >= per.desde && anio <= per.hasta;
      })
      .reduce((s, m) => s + m.properties.area_ha, 0);
    return { id: f.properties.id, nombre: f.properties.nombre, media, antes, ha };
  });

  // Escala común a todos los periodos para que las barras se puedan comparar al cambiar
  const todas = datos.distritos.features.flatMap((f) =>
    periodos.map((p) => prom(datos.resultados.distritos[f.properties.id].agregaciones.media_anual.serie.slice(p.i0, p.i1 + 1))),
  );
  const lo = Math.min(...todas) - 0.03, hi = Math.max(...todas) + 0.01;

  const cambiar = (desde: number, hasta: number) => {
    const i = periodos.findIndex((p) => p.desde === desde && p.hasta === hasta);
    if (i >= 0) setActivo(i);
  };

  // Animación de cambio de periodo: el contenido sale hacia arriba y entra desde abajo
  useLayoutEffect(() => {
    const el = contenido.current;
    if (!el) return;
    if (primera.current) { primera.current = false; return; }
    gsap.fromTo(el.querySelectorAll('.anima'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out', clearProps: 'transform' });
  }, [activo]);

  return (
    <main className="pagina resumen2">
      <h1 className="titulo-centrado">Resumen de la provincia de Cusco</h1>
      <div className="resumen2-capas">
        <div ref={contenido} className="resumen2-contenido">
          <header ref={cabecera} className="resumen2-periodo anima">
            <span>Estás viendo</span>
            <strong>{per.desde} – {per.hasta}</strong>
          </header>

          <ul className="tarjetas-distrito">
            {distritos.map((z) => {
              const nivel = nivelVerde(z.media);
              const dif = z.antes === null ? null : z.media - z.antes;
              const cambio = dif === null
                ? { txt: 'Es el primer periodo con datos del satélite.', cls: 'igual' }
                : Math.abs(dif) < UMBRAL_PARECIDO
                  ? { txt: `Parecido a ${prev!.desde}–${prev!.hasta}.`, cls: 'igual' }
                  : dif > 0
                    ? { txt: `Más verde que en ${prev!.desde}–${prev!.hasta}.`, cls: 'sube' }
                    : { txt: `Menos verde que en ${prev!.desde}–${prev!.hasta}.`, cls: 'baja' };
              return (
                <li key={z.id} className="tarjeta-distrito anima">
                  <h2>{z.nombre}</h2>
                  <p className="td-nivel">{nivel.titulo}</p>
                  <div className="medidor" aria-hidden="true"><i style={{ left: `${Math.max(0, Math.min(1, z.media)) * 100}%` }} /></div>
                  <p className={`td-cambio ${cambio.cls}`}>
                    <span aria-hidden="true">{cambio.cls === 'sube' ? '▲' : cambio.cls === 'baja' ? '▼' : '●'}</span> {cambio.txt}
                  </p>
                  <p className="td-fuego">
                    {z.ha > 0
                      ? <>Zonas que ardieron por última vez en estos años: <b>unas {hectareas(z.ha)} ha</b>.</>
                      : 'Ninguna zona tuvo su última quema en estos años.'}
                  </p>
                </li>
              );
            })}
          </ul>

          <section className="resumen2-grafico anima" aria-labelledby="g1">
            <h2 id="g1">¿Qué tan verde estuvo cada distrito?</h2>
            <p className="g-ayuda">Promedio de {per.desde} a {per.hasta}. Barra más larga = más vegetación.</p>
            <ul className="barras-h">
              {distritos.map((z) => (
                <li key={z.id}>
                  <span className="bh-nombre">{z.nombre}</span>
                  <span className="bh-pista"><i style={{ width: `${Math.max(2, ((z.media - lo) / (hi - lo)) * 100)}%` }} /></span>
                  <span className="bh-nivel">{nivelVerde(z.media).titulo}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="resumen2-grafico anima" aria-labelledby="g2">
            <h2 id="g2">La provincia, año por año</h2>
            <p className="g-ayuda">Cada barra es un año. En color, los años que estás viendo.</p>
            <ProvinciaAnual serie={datos.resultados.provincia.agregaciones.media_anual.serie} anios={anios} per={per} />
          </section>

          {sig ? (
            <div className="siguiente-periodo">
              <span className="spp-texto">Sigue bajando para ver <b>{sig.desde}–{sig.hasta}</b></span>
              <span className="spp-pista" aria-hidden="true"><i ref={barraSig} /></span>
              <button type="button" className="spp-boton" onClick={() => saltar.current()}>Ir ahora ↓</button>
            </div>
          ) : (
            <p className="siguiente-periodo fin">Viste todos los periodos, de {periodos[0].desde} a {periodos[periodos.length - 1].hasta}.</p>
          )}
        </div>

        <SelectorPeriodo periodos={periodos} activo={activo} onChange={cambiar} />
      </div>
    </main>
  );
}

/** Barras de la provincia por año; los del periodo elegido van en color. */
function ProvinciaAnual({ serie, anios, per }: { serie: number[]; anios: number[]; per: Periodo }) {
  const W = 640, H = 210, MB = 26, MT = 26;
  const min = Math.min(...serie), max = Math.max(...serie);
  const r = Math.max(max - min, 0.01);
  const lo = min - r * 0.5, hi = max + r * 0.15;
  const paso = W / serie.length;
  const Y = (v: number) => MT + ((hi - v) * (H - MT - MB)) / (hi - lo);
  return (
    <figure className="prov-anual">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Vegetación de la provincia cada año de ${anios[0]} a ${anios[anios.length - 1]}; resaltados ${per.desde} a ${per.hasta}`}>
        {serie.map((v, i) => {
          const dentro = i >= per.i0 && i <= per.i1;
          return (
            <rect key={anios[i]} x={i * paso + paso * 0.15} y={Y(v)} width={paso * 0.7} height={H - MB - Y(v)} rx={2}
              className={dentro ? 'pa-dentro' : 'pa-fuera'} />
          );
        })}
        <text x={0} y={H - 8} className="pa-anio">{anios[0]}</text>
        <text x={W} y={H - 8} textAnchor="end" className="pa-anio">{anios[anios.length - 1]}</text>
        <text x={Math.max(40, Math.min(W - 40, ((per.i0 + per.i1 + 1) / 2) * paso))} y={14} textAnchor="middle" className="pa-anio pa-sel">{per.desde}–{per.hasta}</text>
      </svg>
    </figure>
  );
}

/**
 * Selector de periodos: una constelación pequeña y sutil. Cada estrella es un periodo de años,
 * unidas por líneas finas. Al cambiar, un brillo viaja por la constelación hasta la nueva estrella.
 * onChange recibe siempre dos enteros: año inicial y año final.
 */
function SelectorPeriodo({ periodos, activo, onChange }: { periodos: Periodo[]; activo: number; onChange: (desde: number, hasta: number) => void }) {
  const brillo = useRef<HTMLSpanElement>(null);
  const bloqueo = useRef(0);
  const nav = useRef<HTMLElement>(null);
  const SEP = 62;                       // separación vertical entre estrellas
  const DESV = [0, 14, 4, 18, 6, 12, 2]; // pequeño zigzag, como una constelación
  const ANCHO = 132, XB = 112;          // la estrella queda a la derecha, el año a su izquierda
  const pos = periodos.map((_, i) => ({ x: XB - DESV[i % DESV.length], y: 10 + i * SEP }));
  const alto = pos[pos.length - 1].y + 10;

  const ir = (i: number) => {
    const j = Math.max(0, Math.min(periodos.length - 1, i));
    onChange(periodos[j].desde, periodos[j].hasta);
  };

  useLayoutEffect(() => {
    const el = brillo.current;
    if (!el) return;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.to(el, { x: pos[activo].x, y: pos[activo].y, duration: reducido ? 0 : 0.9, ease: 'power3.inOut' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  // La rueda del ratón sobre la constelación pasa de una estrella a otra
  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const ahora = performance.now();
      if (ahora - bloqueo.current < 600 || Math.abs(e.deltaY) < 4) return;
      bloqueo.current = ahora;
      ir(activo + (e.deltaY > 0 ? 1 : -1));
    };
    el.addEventListener('wheel', rueda, { passive: false });
    return () => el.removeEventListener('wheel', rueda);
  });

  return (
    <nav ref={nav} className="constelacion" aria-label="Elegir periodo de años" style={{ width: ANCHO, height: alto }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); ir(activo + 1); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); ir(activo - 1); }
      }}>
      <svg className="ct-lineas" width={ANCHO} height={alto} aria-hidden="true">
        <polyline points={pos.map((p) => `${p.x},${p.y}`).join(' ')} />
      </svg>
      <span ref={brillo} className="ct-brillo" aria-hidden="true" />
      <ol>
        {periodos.map((p, i) => (
          <li key={p.desde} style={{ top: pos[i].y, left: 0, width: pos[i].x + 10 }}>
            <button type="button" className={`ct-estrella${i === activo ? ' activa' : ''}`} aria-current={i === activo ? 'true' : undefined}
              onClick={() => onChange(p.desde, p.hasta)}>
              <span className="ct-anios">{p.desde}–{p.hasta}</span>
              <i aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
