'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { movimientoReducido } from './portada/movimiento';

/**
 * Transición entre páginas: una mancha terracota crece desde el punto del clic y cubre la pantalla,
 * se navega y la mancha se disuelve en la página nueva. La navegación nunca depende de la animación:
 * si algo falla, se navega igual a los 900 ms. Con movimiento reducido no se intercepta nada.
 */
export function Transicion() {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const ruta = usePathname();
  const tapada = useRef(false);

  useEffect(() => {
    const capa = ref.current;
    if (!capa) return;
    const alClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target || a.hasAttribute('download')) return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//')) return;
      const url = new URL(href, location.href);
      if (url.pathname === location.pathname || movimientoReducido()) return;
      e.preventDefault();

      let hecho = false;
      const navegar = () => {
        if (hecho) return;
        hecho = true;
        router.push(url.pathname + url.search + url.hash);
      };
      const lado = Math.hypot(innerWidth, innerHeight) * 2.3;
      tapada.current = true;
      gsap.killTweensOf(capa);
      gsap.set(capa, { display: 'block', left: e.clientX - lado / 2, top: e.clientY - lado / 2, width: lado, height: lado, opacity: 1 });
      gsap.fromTo(capa, { scale: 0, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'power3.in', onComplete: navegar });
      window.setTimeout(navegar, 900);
      window.setTimeout(() => { if (tapada.current) destapar(); }, 3000);
    };
    const destapar = () => {
      tapada.current = false;
      gsap.to(capa, { opacity: 0, scale: 1.1, duration: 0.55, ease: 'power2.out', delay: 0.05, onComplete: () => { gsap.set(capa, { display: 'none' }); } });
    };
    document.addEventListener('click', alClic, true);
    return () => document.removeEventListener('click', alClic, true);
  }, [router]);

  useEffect(() => {
    const capa = ref.current;
    if (!capa || !tapada.current) return;
    tapada.current = false;
    gsap.to(capa, { opacity: 0, scale: 1.1, duration: 0.55, ease: 'power2.out', delay: 0.05, onComplete: () => { gsap.set(capa, { display: 'none' }); } });
  }, [ruta]);

  return <div ref={ref} className="transicion" aria-hidden="true" />;
}
