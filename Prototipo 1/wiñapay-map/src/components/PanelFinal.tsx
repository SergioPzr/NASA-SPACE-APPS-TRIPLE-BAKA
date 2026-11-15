'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { etiquetaVeredicto, fraseEvidencia, type Evaluacion } from '@/lib/evidencia';
import { signo } from '@/lib/formato';
import type { Controlador } from '@/lib/mapa';
import { filasResumen } from '@/lib/resumen';
import type { Datos } from '@/lib/tipos';

interface Props {
  ctrl: Controlador;
  datos: Datos;
  evaluaciones: Record<string, Evaluacion>;
  evalProvincia: Evaluacion;
  ligero: boolean;
}

export function PanelFinal({ ctrl, datos, evaluaciones, evalProvincia, ligero }: Props) {
  const ref = useRef<HTMLElement>(null);
  const filas = filasResumen(datos, evaluaciones, evalProvincia);
  const hayPrueba = datos.manchas.features.some((m) => m.properties.es_de_prueba);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: ligero ? 0.2 : 0.6, ease: 'power3.out' });
    el.querySelector<HTMLElement>('h2')?.focus();
  }, [ligero]);

  return (
    <section ref={ref} className="final" aria-labelledby="final-titulo">
      <h2 id="final-titulo" tabIndex={-1}>Provincia completa</h2>
      <p>{fraseEvidencia('la provincia', filas[filas.length - 1].por.media_anual.porDecada, evalProvincia)}</p>
      <table>
        <thead><tr><th>Distrito</th><th className="num">NDVI</th><th className="num">Por década</th><th>Conclusión</th></tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className={f.id === 'provincia' ? 'total' : ''}>
              <td>{f.nombre}</td>
              <td className="num">{f.por.media_anual.media.toFixed(2)}</td>
              <td className="num">{signo(f.por.media_anual.porDecada)}</td>
              <td>{etiquetaVeredicto(f.ev.veredicto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nota">NDVI real (MODIS MOD13Q1, 2001–2025). Cada conclusión usa las tres formas de medirlo.{hayPrueba && ' Las manchas del juego son de prueba hasta tener MCD64A1.'}</p>
      <div className="acciones-final">
        <Link href="/resumen" className="btn-ok">Ver resumen y exportar</Link>
        <button type="button" className="btn-sec" onClick={() => void ctrl.reiniciar()}>Reiniciar recorrido</button>
      </div>
    </section>
  );
}
