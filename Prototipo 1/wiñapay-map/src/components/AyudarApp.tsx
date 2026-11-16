'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

type Tipo = 'reforestacion' | 'donacion' | 'voluntariado';

export interface IniciativaAyuda {
  id: string;
  titulo: string;
  org: string;
  descripcion: string;
  url: string;
  urlTexto: string;
  tipo: string;
  yape?: string;
}
export interface PracticaAyuda { titulo: string; texto: string }

const ETIQUETAS: Record<Tipo, string> = {
  reforestacion: 'Reforestación',
  donacion: 'Donación',
  voluntariado: 'Voluntariado',
};
const FILTROS: { id: 'todas' | Tipo; nombre: string }[] = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'reforestacion', nombre: 'Reforestación' },
  { id: 'donacion', nombre: 'Donación' },
  { id: 'voluntariado', nombre: 'Voluntariado' },
];

/** «¿Cómo ayudar?» con la misma línea visual del resto: noche estrellada, tarjetas con foto y GSAP. */
export function AyudarApp({ iniciativas, practicas }: { iniciativas: readonly IniciativaAyuda[]; practicas: readonly PracticaAyuda[] }) {
  const [filtro, setFiltro] = useState<'todas' | Tipo>('todas');
  const raiz = useRef<HTMLElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const primera = useRef(true);
  const visibles = iniciativas.filter((i) => filtro === 'todas' || i.tipo === filtro);

  // Entrada de la página
  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    gsap.fromTo(el.querySelectorAll('.ay-entra'), { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' });
  }, []);

  // Al filtrar, las tarjetas vuelven a entrar escalonadas
  useLayoutEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const el = lista.current;
    if (!el) return;
    gsap.fromTo(el.children, { opacity: 0, y: 24, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' });
  }, [filtro]);

  return (
    <main ref={raiz} className="pagina ayudar2">
      <header className="ay-cabecera">
        <p className="ay-bajada ay-entra">Más allá de los datos</p>
        <h1 className="titulo-centrado ay-entra">¿Cómo ayudar?</h1>
        <p className="ay-intro ay-entra">
          El mapa muestra lo que cambió. Estas organizaciones y estas prácticas ayudan a que la vegetación de Cusco se recupere.
        </p>
      </header>

      <section aria-labelledby="ay-org">
        <h2 id="ay-org" className="ay-titulo ay-entra">Organizaciones que trabajan en Cusco</h2>
        <div className="ay-filtros ay-entra" role="group" aria-label="Filtrar por tipo de ayuda">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" className={`ay-filtro${filtro === f.id ? ' activo' : ''}`} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.nombre}
            </button>
          ))}
        </div>
        <ul ref={lista} className="ay-grilla">
          {visibles.map((ini) => (
            <li key={ini.id} className="ay-carta ay-entra">
              <div className="ay-foto">
                <img src={`/img/ong/${ini.id}.jpg`} alt="" loading="lazy" />
                <span className={`ay-chip ${ini.tipo}`}>{ETIQUETAS[ini.tipo as Tipo] ?? ini.tipo}</span>
              </div>
              <div className="ay-cuerpo">
                <span className="ay-org-nombre">{ini.org}</span>
                <h3>{ini.titulo}</h3>
                <p>{ini.descripcion}</p>
                {ini.yape && <p className="ay-yape">Yape: <strong>{ini.yape}</strong></p>}
                <a href={ini.url} target="_blank" rel="noopener noreferrer" className="ay-enlace" aria-label={`Visitar ${ini.org} (abre en nueva pestaña)`}>
                  {ini.urlTexto} ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ay-prac" className="ay-practicas-sec">
        <h2 id="ay-prac" className="ay-titulo ay-entra">Lo que puedes hacer tú</h2>
        <ol className="ay-practicas">
          {practicas.map((p, i) => (
            <li key={p.titulo} className="ay-practica ay-entra">
              <span className="ay-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ay-cierre ay-entra">
        <p>El primer paso es entender qué está pasando.</p>
        <h2>Mira cómo cambió tu distrito.</h2>
        <div className="ay-cierre-acciones">
          <Link href="/mapa" className="ay-boton">Explorar el mapa</Link>
          <Link href="/resumen" className="ay-boton secundario">Ver el resumen</Link>
        </div>
      </section>
    </main>
  );
}
