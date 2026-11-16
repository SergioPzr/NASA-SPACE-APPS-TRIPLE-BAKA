'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AGREGACIONES, etiquetaVeredicto, fraseEvidencia, type NombreAgregacion } from '@/lib/evidencia';
import { signo, textoP } from '@/lib/formato';
import { aCSV, descargar, dibujarResumen, filasResumen, POCOS_PIXELES } from '@/lib/resumen';
import type { Datos } from '@/lib/tipos';
import { useDatos } from '@/lib/useDatos';

const ESTILO: Record<NombreAgregacion, { color: string; trazo?: string }> = {
  media_anual: { color: '#244d3c' },
  maximo_anual: { color: '#b9542d', trazo: '7 4' },
  estacion_seca: { color: '#252a26', trazo: '2 4' },
};

function GraficaTres({ datos, id, nombre }: { datos: Datos; id: string; nombre: string }) {
  const W = 640, H = 260, ml = 44, mr = 12, mt = 14, mb = 28;
  const zona = id === 'provincia' ? datos.resultados.provincia : datos.resultados.distritos[id];
  const todas = AGREGACIONES.flatMap(({ id: ag }) => zona.agregaciones[ag].serie);
  const lo = Math.min(...todas) - 0.01, hi = Math.max(...todas) + 0.01;
  const anios = datos.resultados.anios;
  const X = (i: number) => ml + (i * (W - ml - mr)) / (anios.length - 1);
  const Y = (v: number) => mt + ((hi - v) * (H - mt - mb)) / (hi - lo);
  const marcas = [lo + 0.01, (lo + hi) / 2, hi - 0.01];
  return (
    <div className="grafica-caja">
      <svg className="grafica-grande" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`NDVI de ${nombre} de ${anios[0]} a ${anios[anios.length - 1]}, con tres formas de medirlo`}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={ml} x2={W - mr} y1={Y(m)} y2={Y(m)} stroke="#252a26" strokeOpacity="0.15" />
            <text x={ml - 6} y={Y(m) + 4} textAnchor="end">{m.toFixed(2)}</text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((i) => <text key={i} x={X(i)} y={H - 8} textAnchor="middle">{anios[i]}</text>)}
        {AGREGACIONES.map(({ id: ag }) => (
          <path
            key={ag}
            d={zona.agregaciones[ag].serie.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('')}
            fill="none" stroke={ESTILO[ag].color} strokeWidth="2.2" strokeDasharray={ESTILO[ag].trazo} strokeLinejoin="round" strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="leyenda">
        {AGREGACIONES.map(({ id: ag, nombre: n }) => (
          <span key={ag} style={{ ['--c' as string]: ESTILO[ag].color, ['--t' as string]: ESTILO[ag].trazo ? 'dashed' : 'solid' }}>{n}</span>
        ))}
      </div>
    </div>
  );
}

export function ResumenApp() {
  const d = useDatos();
  const [zona, setZona] = useState('provincia');

  if (d.estado !== 'listo') {
    return (
      <main className="pagina">
        <h1>Resumen de la provincia</h1>
        {d.estado === 'cargando' ? <p role="status">Cargando resultados…</p> : (
          <div role="alert" className="panel aviso">
            <p>No pudimos cargar los resultados y no hay una copia guardada en este dispositivo.</p>
            <button type="button" className="btn-sec" onClick={d.reintentar}>Reintentar</button>
          </div>
        )}
      </main>
    );
  }

  const { datos, evaluaciones, evalProvincia, origen } = d;
  const filas = filasResumen(datos, evaluaciones, evalProvincia);
  const prov = filas[filas.length - 1];
  const nombreZona = filas.find((f) => f.id === zona)?.nombre ?? '';
  const con = filas.slice(0, -1).filter((f) => f.ev.veredicto === 'robusta');

  const exportarCSV = () => descargar('winapay-resumen-ndvi-cusco.csv', new Blob([aCSV(filas)], { type: 'text/csv;charset=utf-8' }));
  const exportarPNG = () => {
    dibujarResumen(filas, datos.resultados.metodo.periodo).toBlob((b) => b && descargar('winapay-resumen-ndvi-cusco.png', b), 'image/png');
  };

  return (
    <main className="pagina">
      <h1>Resumen de la provincia de Cusco</h1>
      <p className="bajada">Cómo cambió el verdor (NDVI) entre {datos.resultados.metodo.periodo} y qué tan seguros estamos de cada cambio.</p>
      {origen === 'cache' && <p className="estado-envio" role="status">Mostrando datos guardados en este dispositivo.</p>}

      <section className="panel" aria-labelledby="titular">
        <h2 id="titular" style={{ marginTop: 0 }}>Lo principal</h2>
        <p>{fraseEvidencia('la provincia', prov.por.media_anual.porDecada, evalProvincia)}</p>
        <p>
          {con.length > 0
            ? `${con.length} de ${filas.length - 1} distritos tienen evidencia suficiente: ${con.map((f) => f.nombre).join(', ')}.`
            : 'En ningún distrito hay todavía evidencia suficiente para afirmar una tendencia con las tres formas de medirlo.'}{' '}
          En el resto, aún no hay evidencia suficiente: eso no significa que no haya cambio, sino que los datos no permiten afirmarlo.
        </p>
      </section>

      <div className="fila-botones">
        <button type="button" className="btn-prim" onClick={exportarCSV}>Descargar CSV</button>
        <button type="button" className="btn-sec" onClick={exportarPNG}>Descargar imagen (PNG)</button>
        <Link href="/mapa" className="btn-sec">Volver al mapa</Link>
      </div>

      <h2>Las tres formas de medirlo, juntas</h2>
      <p>
        No elegimos la medida que dé significancia. Mostramos las tres: media de todo el año, máximo del año y estación seca (mayo–septiembre).
        Solo decimos «evidencia suficiente» cuando las tres coinciden y siguen siendo significativas tras corregir por mirar varios distritos a la vez.
      </p>
      <div className="tabla-scroll">
        <table className="tabla">
          <caption>Cambio de NDVI por década (pendiente de Sen) y valor p de Mann-Kendall. Nivel 95 %.</caption>
          <thead>
            <tr>
              <th scope="col">Zona</th>
              {AGREGACIONES.map((a) => <th key={a.id} scope="col" className="num">{a.nombre}</th>)}
              <th scope="col">Conclusión</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className={f.id === 'provincia' ? 'total' : ''}>
                <th scope="row">{f.nombre}{f.pixeles < POCOS_PIXELES && <small>solo {f.pixeles} píxeles de 250 m</small>}</th>
                {AGREGACIONES.map((a) => (
                  <td key={a.id} className="num">{signo(f.por[a.id].porDecada)}<small>{textoP(f.por[a.id].p)}</small></td>
                ))}
                <td>{etiquetaVeredicto(f.ev.veredicto)}{f.ev.veredicto !== 'ninguna' && <small>{f.ev.significativas.length} de {f.ev.calculadas.length} medidas</small>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Mira la serie de una zona</h2>
      <div className="campo" style={{ maxWidth: 360 }}>
        <label htmlFor="sel-zona">Zona</label>
        <select id="sel-zona" value={zona} onChange={(e) => setZona(e.target.value)}>
          {filas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </div>
      <div style={{ marginTop: 12 }}><GraficaTres datos={datos} id={zona} nombre={nombreZona} /></div>

      <h2>Cómo leer esto con honestidad</h2>
      <ul className="lista">
        <li><strong>Evidencia suficiente</strong>: las tres medidas apuntan en la misma dirección y son significativas tras la corrección por varios distritos (Benjamini–Hochberg).</li>
        <li><strong>Señal parcial</strong>: solo algunas medidas la ven. Aún no hay evidencia suficiente para afirmar una tendencia.</li>
        <li><strong>Aún no hay evidencia suficiente</strong>: no podemos afirmar ni descartar un cambio.</li>
        <li>Los incendios son una máscara espacial para el mapa, no una segunda variable: este resumen es solo de NDVI.</li>
        <li>Calidad: {datos.resultados.metodo.calidad}. Resolución de 250 m: los distritos pequeños o urbanos (Wanchaq) se apoyan en muy pocos píxeles.</li>
      </ul>
    </main>
  );
}
