'use client';

import { useRef, useState, useEffect } from 'react';

export interface OngData {
  id: string;
  org: string;
  titulo: string;
  desc: string;
  url: string;
  tipo: 'reforestacion' | 'donacion' | 'voluntariado';
  imagen: string;
}

interface Props {
  ongs: readonly OngData[];
}

export function CarruselOng({ ongs }: Props) {
  const carruselRef = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);

  // Desplazamiento horizontal ultrasuave y pausado con la rueda del ratón ("suaaave, despaaacio")
  useEffect(() => {
    const el = carruselRef.current;
    if (!el) return;

    let targetScroll = el.scrollLeft;
    let animId: number | null = null;
    let animando = false;

    const bucleSuave = () => {
      const actual = el.scrollLeft;
      const diferencia = targetScroll - actual;

      if (Math.abs(diferencia) > 0.4) {
        // Factor de interpolación bajo (0.065) para que el movimiento sea pausado, fluido y cinemático
        el.scrollLeft = actual + diferencia * 0.065;
        animId = requestAnimationFrame(bucleSuave);
      } else {
        el.scrollLeft = targetScroll;
        animando = false;
        animId = null;
      }
    };

    const manejarRueda = (e: WheelEvent) => {
      // Tomamos el delta vertical o lateral
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;

      e.preventDefault();
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      // Multiplicador amortiguado (0.35) para avanzar despacio sin sacudidas
      const avance = delta * 0.35;
      const base = animando ? targetScroll : el.scrollLeft;
      targetScroll = Math.max(0, Math.min(maxScroll, base + avance));
      animando = true;

      if (!animId) {
        animId = requestAnimationFrame(bucleSuave);
      }
    };

    el.addEventListener('wheel', manejarRueda, { passive: false });

    return () => {
      el.removeEventListener('wheel', manejarRueda);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  // Arrastre con el ratón (Drag to scroll) 1:1, suave y natural
  const iniciarArrastre = (e: React.MouseEvent) => {
    const el = carruselRef.current;
    if (!el) return;
    setArrastrando(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollStart(el.scrollLeft);
  };

  const moverArrastre = (e: React.MouseEvent) => {
    if (!arrastrando) return;
    e.preventDefault();
    const el = carruselRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const recorrido = x - startX;
    el.scrollLeft = scrollStart - recorrido;
  };

  const pararArrastre = () => {
    setArrastrando(false);
  };

  return (
    <div className="ong-seccion-carrusel">
      {/* Contenedor desplazable: sin flechas ni textos sobrantes, scroll con ratón suave y pausado */}
      <div
        ref={carruselRef}
        className={`ong-carrusel ${arrastrando ? 'arrastrando' : ''}`}
        aria-label="Organizaciones que trabajan en Cusco"
        onMouseDown={iniciarArrastre}
        onMouseMove={moverArrastre}
        onMouseUp={pararArrastre}
        onMouseLeave={pararArrastre}
      >
        {ongs.map((ong) => (
          <a
            key={ong.id}
            href={ong.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ong-carta"
            draggable={false}
          >
            <div className="ong-foto-wrap">
              <img
                src={ong.imagen}
                alt={ong.titulo}
                className="ong-foto"
                loading="lazy"
                draggable={false}
              />
              <span className="ong-tipo" data-t={ong.tipo}>
                {ong.tipo === 'reforestacion'
                  ? 'Reforestación'
                  : ong.tipo === 'donacion'
                  ? 'Donación'
                  : 'Voluntariado'}
              </span>
            </div>
            <div className="ong-cuerpo">
              <span className="ong-org">{ong.org}</span>
              <h3 className="ong-titulo-card">{ong.titulo}</h3>
              <p className="ong-desc">{ong.desc}</p>
              <span className="ong-link">{ong.url.replace(/^https?:\/\//, '')}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
