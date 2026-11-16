'use client';

import Link from 'next/link';
import { useState } from 'react';
import { etiquetaVeredicto } from '@/lib/evidencia';
import {
  ANIOS, AREA_QUEMADA_HA, CONTEO_VEREDICTOS, DISTRITOS, DISTRITOS_CON_FUEGO, DISTRITOS_TOTAL, FRASE_PROVINCIA,
  MANCHAS, MAYORES_QUEMAS, NDVI_MEDIO_PROVINCIA, POCOS_PIXELES, SERIE_PROVINCIA, TENDENCIA_PROVINCIA, VISTA_MAPA,
} from './datosPortada';

/* Gráfica de la serie anual de la provincia (escala ampliada y rotulada) */
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

/* Fotos satelitales NASA reales en public/img/satelite/ */
const FOTOS_FUEGO = [
  {
    src: '/img/satelite/fuego_1.jpg',
    titulo: 'Incendios en laderas de Cusco',
    sensor: 'NASA Terra / MODIS · Canal Infrarrojo',
    detalle: `${AREA_QUEMADA_HA.toLocaleString('es-PE')} ha quemadas registradas en la provincia (${ANIOS[0]}–${ANIOS[ANIOS.length - 1]}).`,
  },
  {
    src: '/img/satelite/fuego_2.jpg',
    titulo: 'Focos de calor nocturnos',
    sensor: 'NASA FIRMS · Radiación Térmica',
    detalle: `Áreas quemadas en ${DISTRITOS_CON_FUEGO} de los ${DISTRITOS_TOTAL} distritos.`,
  },
  {
    src: '/img/satelite/fuego_3.jpg',
    titulo: 'Pajonales y cumbres quemadas',
    sensor: 'MCD64A1 · Cicatrices de Quema',
    detalle: `${MAYORES_QUEMAS.join(', ')}: los distritos con más superficie quemada.`,
  },
];

const lista = (n: string[]) => (n.length ? n.join(', ') : 'ninguno');

export function HistoriaSatelite() {
  const [fotoActiva, setFotoActiva] = useState(0);

  /* Las animaciones de esta sección (aparición, contadores y trazos) las dirige escenasScroll.ts
     con una línea de tiempo ligada al scroll. */

  return (
    <section className="historia" aria-labelledby="titulo-historia">
      <div className="h-escenario">
      {/* ── PASO 1: Lo que vio el satélite (Constelación distrital en SVG + Texto) ── */}
      <article className="h-paso-fila" data-escena="1">
        <div className="h-paso-visual">
          <div className="h-visual-tarjeta">
            <svg
              className="h-mapa h-constelacion"
              viewBox={VISTA_MAPA}
              focusable="false"
              aria-label="Mapa de distritos de Cusco como constelación satelital"
            >
              {DISTRITOS.map((d) => (
                <path key={d.id} d={d.d} className="h-distrito" />
              ))}
              {DISTRITOS.map((d) => (
                <text
                  key={d.id}
                  x={d.cx + ({ '080108': -34, '080105': 40 }[d.id] ?? 0)}
                  y={d.cy + ({ '080108': -20, '080105': 26 }[d.id] ?? 0)}
                  className="h-etiqueta-visible"
                  textAnchor="middle"
                >
                  {d.nombre}
                </text>
              ))}
            </svg>
          </div>
        </div>

        <div className="h-paso-texto">
          <span className="h-subtitulo-seccion">Monitoreo Satelital</span>
          <h2 id="titulo-historia">Lo que vio el satélite</h2>
          <p className="h-cifra">
            <b data-contar={DISTRITOS_TOTAL}>{DISTRITOS_TOTAL}</b> distritos,{' '}
            <b data-contar={ANIOS.length}>{ANIOS.length}</b> años
          </p>
          <p>
            El sensor MODIS de la NASA mide el verdor de la vegetación (NDVI) cada 16 días, en píxeles de 250 m.
            Reunimos {ANIOS.length} años de ese registro, de {ANIOS[0]} a {ANIOS[ANIOS.length - 1]}, para cada distrito
            de la provincia de Cusco.
          </p>
        </div>
      </article>

      {/* ── PASO 2: Dónde ardió (Galería fotográfica satelital al costado + Texto) ── */}
      <article className="h-paso-fila" data-escena="2">
        <div className="h-paso-visual">
          <div className="h-visual-tarjeta h-fuego-tarjeta">
            <div className="h-fuego-visor">
              <img
                src={FOTOS_FUEGO[fotoActiva].src}
                alt={FOTOS_FUEGO[fotoActiva].titulo}
                className="h-fuego-img-principal"
              />
              <div className="h-fuego-info">
                <span className="h-fuego-sensor">{FOTOS_FUEGO[fotoActiva].sensor}</span>
                <strong className="h-fuego-titulo">{FOTOS_FUEGO[fotoActiva].titulo}</strong>
                <p className="h-fuego-detalle">{FOTOS_FUEGO[fotoActiva].detalle}</p>
              </div>
            </div>

            {/* Selector de fotos satelitales interactivas */}
            <div className="h-fuego-thumbs">
              {FOTOS_FUEGO.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`h-fuego-thumb ${fotoActiva === idx ? 'activo' : ''}`}
                  onClick={() => setFotoActiva(idx)}
                  aria-label={`Ver foto satelital: ${item.titulo}`}
                >
                  <img src={item.src} alt="" />
                  <span>Foto 0{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-paso-texto">
          <span className="h-subtitulo-seccion">Detección Térmica</span>
          <h3>Dónde ardió</h3>
          <p className="h-cifra">
            <b data-contar={MANCHAS.length}>{MANCHAS.length}</b> áreas quemadas,{' '}
            <b data-contar={AREA_QUEMADA_HA}>{AREA_QUEMADA_HA.toLocaleString('es-PE')}</b> ha
          </p>
          <p>
            El producto MCD64A1 marca la superficie quemada. Hay registros en {DISTRITOS_CON_FUEGO} de los{' '}
            {DISTRITOS_TOTAL} distritos; mostramos las áreas más extensas de cada uno. El fuego nos dice dónde mirar.
          </p>
        </div>
      </article>

      {/* ── PASO 3: El verdor, año por año (Gráfica NDVI 2001-2025 al costado + Texto) ── */}
      <article className="h-paso-fila" data-escena="3">
        <div className="h-paso-visual">
          <div className="h-visual-tarjeta">
            <figure className="h-grafica-tarjeta">
              <svg viewBox={`0 0 ${G.w} ${G.h}`} focusable="false">
                <defs>
                  <linearGradient id="h-grad-linea" gradientUnits="userSpaceOnUse" x1="0" y1={Y(HI)} x2="0" y2={Y(LO)}>
                    <stop offset="0" style={{ stopColor: 'var(--brote)' }} />
                    <stop offset="1" style={{ stopColor: 'var(--ocre)' }} />
                  </linearGradient>
                </defs>
                {MARCAS_Y.map((m) => (
                  <g key={m}>
                    <line x1={G.ml} x2={G.w - G.mr} y1={Y(m)} y2={Y(m)} className="h-guia" />
                    <text x={G.ml - 8} y={Y(m) + 4} textAnchor="end" className="h-eje">
                      {m.toFixed(2)}
                    </text>
                  </g>
                ))}
                <text x={G.ml} y={G.h - 10} className="h-eje">{ANIOS[0]}</text>
                <text x={X(Math.floor(N / 2))} y={G.h - 10} textAnchor="middle" className="h-eje">
                  {ANIO_MEDIO}
                </text>
                <text x={G.w - G.mr} y={G.h - 10} textAnchor="end" className="h-eje">
                  {ANIOS[ANIOS.length - 1]}
                </text>
                <path d={D_LINEA} className="h-linea" />
                <path d={D_TENDENCIA} className="h-tendencia" />
              </svg>
              <figcaption>NDVI medio anual · provincia de Cusco · NASA MODIS MOD13Q1 (250 m/píxel)</figcaption>
            </figure>
          </div>
        </div>

        <div className="h-paso-texto">
          <span className="h-subtitulo-seccion">Serie Temporal</span>
          <h3>El verdor, año por año</h3>
          <p className="h-cifra">
            NDVI medio <b data-contar={NDVI_MEDIO_PROVINCIA} data-decimales="2">{NDVI_MEDIO_PROVINCIA.toFixed(2)}</b>
          </p>
          <p>{FRASE_PROVINCIA}</p>
        </div>
      </article>

      {/* ── PASO 4: Lo que podemos afirmar (Mapa con Veredictos al costado + Texto) ── */}
      <article className="h-paso-fila" data-escena="4">
        <div className="h-paso-visual">
          <div className="h-visual-tarjeta">
            <svg
              className="h-mapa h-mapa-veredictos"
              viewBox={VISTA_MAPA}
              focusable="false"
              aria-label="Mapa de distritos con veredictos de tendencia"
            >
              {DISTRITOS.map((d) => (
                <path key={d.id} d={d.d} className="h-distrito" data-v={d.veredicto} />
              ))}
              {MANCHAS.map((m, i) => (
                <path key={i} d={m.d} className="h-mancha" />
              ))}
              {DISTRITOS.map((d) => (
                <text
                  key={d.id}
                  x={d.cx + ({ '080108': -34, '080105': 40 }[d.id] ?? 0)}
                  y={d.cy + ({ '080108': -20, '080105': 26 }[d.id] ?? 0)}
                  className="h-etiqueta-visible"
                  data-v={d.veredicto}
                  textAnchor="middle"
                >
                  {d.nombre}
                </text>
              ))}
            </svg>
          </div>
        </div>

        <div className="h-paso-texto">
          <span className="h-subtitulo-seccion">Evidencia Estadística</span>
          <h3>Lo que podemos afirmar</h3>
          <ul className="h-veredictos">
            <li data-v="robusta">
              <b>{CONTEO_VEREDICTOS.robusta.length}</b> {etiquetaVeredicto('robusta').toLowerCase()}:{' '}
              {lista(CONTEO_VEREDICTOS.robusta)}
            </li>
            <li data-v="parcial">
              <b>{CONTEO_VEREDICTOS.parcial.length}</b> con {etiquetaVeredicto('parcial').toLowerCase()}:{' '}
              {lista(CONTEO_VEREDICTOS.parcial)}
            </li>
            <li data-v="ninguna">
              <b>{CONTEO_VEREDICTOS.ninguna.length}</b> donde {etiquetaVeredicto('ninguna').toLowerCase()}:{' '}
              {lista(CONTEO_VEREDICTOS.ninguna)}
            </li>
          </ul>
          <p>
            Solo afirmamos un cambio cuando lo resisten las tres formas de medir el verdor.
            {POCOS_PIXELES.length > 0 &&
              ` ${POCOS_PIXELES.join(' y ')} se ${
                POCOS_PIXELES.length > 1 ? 'apoyan' : 'apoya'
              } en muy pocos píxeles: su resultado es poco estable.`}
          </p>
          <Link href="/resumen" className="btn btn-bosque">
            Ver el resumen completo
          </Link>
        </div>
      </article>
      </div>
    </section>
  );
}
