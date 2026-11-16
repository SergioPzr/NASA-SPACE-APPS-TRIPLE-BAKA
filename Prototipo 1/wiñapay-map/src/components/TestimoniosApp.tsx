'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { gsap } from 'gsap';
import semilla from '@/data/testimonios_semilla.json';

/*
 * Testimonios: salen de los datos del proyecto (src/data/testimonios_semilla.json), con su fuente
 * verificable. Cada tarjeta se abre en grande (modal accesible: foco atrapado y Esc para cerrar).
 * Las fotos son las del propio proyecto, elegidas según el tema del testimonio.
 */

interface TestimonioDato {
  id: string;
  distrito_nombre: string;
  texto: string;
  periodo_observado: string;
  tema: string;
  fuente: { tipo: string; nombre: string; url: string; fecha_publicacion: string };
  persona: { nombre_o_anonimo: string; rol: string };
}

/* Testimonios retirados de la página (siguen en el archivo de datos, que no se edita desde el diseño) */
const OCULTOS = new Set(['testimonio-ccorca-01']);
const TESTIMONIOS = (semilla.testimonios as TestimonioDato[]).filter((t) => !OCULTOS.has(t.id));

const TEMAS: Record<string, { nombre: string; imagen: string; tono: string }> = {
  incendio: { nombre: 'Incendio', imagen: '/img/satelite/fuego_1.jpg', tono: 'fuego' },
  impacto_ambiental: { nombre: 'Daño al ambiente', imagen: '/img/satelite/fuego_3.jpg', tono: 'fuego' },
  sequia_vegetacion: { nombre: 'Sequía y vegetación', imagen: '/img/satelite/ndvi_1.jpg', tono: 'verde' },
  agua_comunidad: { nombre: 'Agua y comunidad', imagen: '/img/ong/vallesagrado.jpg', tono: 'agua' },
  impacto_economico: { nombre: 'Economía local', imagen: '/img/ong/profonanpe.jpg', tono: 'tierra' },
};
const TEMA_OTRO = { nombre: 'Testimonio', imagen: '/img/satelite/ndvi_2.jpg', tono: 'verde' };

const TIPOS_FUENTE: Record<string, string> = {
  prensa: 'Prensa',
  institucional: 'Institución pública',
  periodismo_ambiental: 'Periodismo ambiental',
};

const fecha = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
};
const resumen = (t: string, max = 120) => (t.length > max ? `${t.slice(0, t.lastIndexOf(' ', max))}…` : t);

export function TestimoniosApp() {
  const [sel, setSel] = useState<TestimonioDato | null>(null);
  const lista = useRef<HTMLUListElement>(null);

  // Entrada escalonada de las tarjetas
  useLayoutEffect(() => {
    const el = lista.current;
    if (!el) return;
    gsap.fromTo(el.children, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' });
  }, []);

  // El modal crece suave al aparecer
  const fijarModal = useCallback((n: HTMLDivElement | null) => {
    if (!n) return;
    gsap.fromTo(n, { opacity: 0, y: 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
    gsap.fromTo(n.querySelectorAll('.tm-anima'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, delay: 0.15, ease: 'power3.out', clearProps: 'transform' });
  }, []);

  const tema = sel ? TEMAS[sel.tema] ?? TEMA_OTRO : null;

  return (
    <main className="pagina testimonios2">
      <h1 className="titulo-centrado">Testimonios</h1>

      <ul ref={lista} className="tm-grilla">
        {TESTIMONIOS.map((t) => {
          const tm = TEMAS[t.tema] ?? TEMA_OTRO;
          return (
            <li key={t.id}>
              <button type="button" className="tm-carta" onClick={() => setSel(t)} aria-haspopup="dialog">
                <span className="tm-foto">
                  <img src={tm.imagen} alt="" loading="lazy" />
                  <span className={`tm-chip ${tm.tono}`}>{tm.nombre}</span>
                </span>
                <span className="tm-cuerpo">
                  <span className="tm-lugar">{t.distrito_nombre} · {t.periodo_observado}</span>
                  <span className="tm-cita">«{resumen(t.texto)}»</span>
                  <span className="tm-quien">{t.persona.nombre_o_anonimo}</span>
                  <span className="tm-leer">Leer testimonio</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog.Root open={sel !== null} onOpenChange={(o) => { if (!o) setSel(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="tm-fondo" />
          {sel && tema && (
            <Dialog.Content ref={fijarModal} className="tm-modal" aria-describedby={undefined}>
              <div className="tm-modal-foto">
                <img src={tema.imagen} alt="" />
                <span className={`tm-chip ${tema.tono}`}>{tema.nombre}</span>
              </div>
              <div className="tm-modal-cuerpo">
                <Dialog.Close className="tm-cerrar" aria-label="Cerrar">×</Dialog.Close>
                <p className="tm-lugar tm-anima">{sel.distrito_nombre} · {sel.periodo_observado}</p>
                <Dialog.Title className="tm-titulo tm-anima">Lo que se vivió en {sel.distrito_nombre}</Dialog.Title>
                <blockquote className="tm-texto tm-anima">«{sel.texto}»</blockquote>
                <p className="tm-persona tm-anima">
                  <b>{sel.persona.nombre_o_anonimo}</b>
                  <span>{sel.persona.rol}</span>
                </p>
                <div className="tm-fuente tm-anima">
                  <span className="tm-fuente-tipo">{TIPOS_FUENTE[sel.fuente.tipo] ?? 'Fuente'}</span>
                  <strong>{sel.fuente.nombre}</strong>
                  <span>Publicado el {fecha(sel.fuente.fecha_publicacion)}</span>
                </div>
                <a className="tm-boton tm-anima" href={sel.fuente.url} target="_blank" rel="noopener noreferrer">
                  Ver la fuente original ↗
                </a>
              </div>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
