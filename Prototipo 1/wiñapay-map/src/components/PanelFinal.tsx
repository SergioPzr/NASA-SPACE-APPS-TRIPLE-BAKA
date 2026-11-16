'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { Evaluacion } from '@/lib/evidencia';
import type { Controlador } from '@/lib/mapa';
import type { Datos } from '@/lib/tipos';
import { fraseCambio, nivelVerde } from './lenguajeSimple';

interface Props {
  ctrl: Controlador;
  datos: Datos;
  evaluaciones: Record<string, Evaluacion>;
  evalProvincia: Evaluacion;
  ligero: boolean;
}

/** Resumen al terminar el recorrido, en lenguaje sencillo y con los datos reales de cada distrito. */
export function PanelFinal({ ctrl, datos, evaluaciones, evalProvincia, ligero }: Props) {
  const ref = useRef<HTMLElement>(null);
  const anios = datos.resultados.anios;
  const a0 = anios[0], a1 = anios[anios.length - 1];
  const provincia = fraseCambio(evalProvincia, a0, a1);
  const hayPrueba = datos.manchas.features.some((m) => m.properties.es_de_prueba);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Centrado vertical con GSAP (yPercent) para que el deslizamiento no lo descoloque
    gsap.set(el, { yPercent: -50 });
    const fuera = window.innerWidth - el.getBoundingClientRect().left + 60;
    gsap.fromTo(el, { x: fuera }, { x: 0, duration: ligero ? 0.4 : 1.1, ease: 'expo.out' });
    el.querySelector<HTMLElement>('h2')?.focus();
  }, [ligero]);

  return (
    <section ref={ref} className="final" aria-labelledby="final-titulo">
      <h2 id="final-titulo" tabIndex={-1}>Recorriste toda la provincia</h2>
      <p><strong>{provincia.titulo}.</strong> {provincia.detalle}</p>
      <table>
        <thead><tr><th>Distrito</th><th>Vegetación</th><th>¿Cambió?</th></tr></thead>
        <tbody>
          {datos.distritos.features.map((f) => {
            const id = f.properties.id;
            return (
              <tr key={id}>
                <td>{f.properties.nombre}</td>
                <td>{nivelVerde(datos.resultados.distritos[id].agregaciones.media_anual.media).titulo}</td>
                <td>{fraseCambio(evaluaciones[id], a0, a1).titulo}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hayPrueba && <p className="nota">Los incendios del mapa son de prueba.</p>}
      <div className="acciones-final">
        <Link href="/resumen" className="btn-ok">Ver el resumen completo</Link>
        <button type="button" className="btn-sec" onClick={() => void ctrl.reiniciar()}>Empezar de nuevo</button>
      </div>
    </section>
  );
}
