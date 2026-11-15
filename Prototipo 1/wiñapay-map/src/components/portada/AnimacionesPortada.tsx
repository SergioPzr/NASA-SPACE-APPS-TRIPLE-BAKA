'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { movimientoReducido } from './movimiento';

/**
 * Capa de interacción y movimiento de la portada. Todo es mejora progresiva:
 * sin JavaScript, con movimiento reducido o en «Modo ligero», la portada se ve completa y quieta.
 * El corte del hero sigue respondiendo al cursor, al dedo y al teclado (es acción del usuario),
 * pero sin suavizado ni barrido automático.
 */
export function AnimacionesPortada() {
  const seguidor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>('.landing');
    const hero = raiz?.querySelector<HTMLElement>('.hero');
    const partido = raiz?.querySelector<HTMLElement>('.hero-partido');
    if (!raiz || !hero || !partido) return;
    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
    const reducido = movimientoReducido();
    const css = getComputedStyle(document.documentElement);
    const color = (t: string) => css.getPropertyValue(`--${t}`).trim();
    const limpiar: (() => void)[] = [];

    /* ── Corte «Dos Cusco»: lo mueve el cursor, el dedo o el control de teclado; el scroll lo barre ── */
    const control = raiz.querySelector<HTMLInputElement>('.corte-control input');
    const estado = { cp: 0.56, p: 0 };
    let ultimo = -1;
    const pintar = () => {
      const c = estado.cp + (1 - estado.cp) * estado.p;
      if (Math.abs(c - ultimo) > 0.0005) { hero.style.setProperty('--c', c.toFixed(4)); ultimo = c; }
    };
    gsap.ticker.add(pintar);
    limpiar.push(() => gsap.ticker.remove(pintar));
    const irA = reducido ? (v: number) => { estado.cp = v; } : gsap.quickTo(estado, 'cp', { duration: 0.9, ease: 'power3.out' });
    const mover = (e: PointerEvent) => {
      const r = partido.getBoundingClientRect();
      const v = gsap.utils.clamp(0.08, 0.92, (e.clientX - r.left) / r.width);
      irA(v);
      if (control) control.value = String(Math.round(v * 100));
    };
    const alControl = () => irA(Number(control!.value) / 100);
    partido.addEventListener('pointermove', mover);
    partido.addEventListener('pointerdown', mover);
    control?.addEventListener('input', alControl);
    limpiar.push(() => {
      partido.removeEventListener('pointermove', mover);
      partido.removeEventListener('pointerdown', mover);
      control?.removeEventListener('input', alControl);
      hero.style.removeProperty('--c');
    });

    if (reducido) return () => limpiar.forEach((f) => f());

    document.documentElement.classList.add('anima');
    limpiar.push(() => document.documentElement.classList.remove('anima'));
    const brasas: HTMLElement[] = [];

    const ctx = gsap.context(() => {
      /* Entrada del hero: el corte se abre, se dibuja Cusco, aparecen las manchas y el titular */
      estado.cp = 0.02;
      gsap.to(estado, { cp: 0.56, duration: 1.8, ease: 'power3.inOut', delay: 0.15 });
      gsap.from('.hero-mapa .mapa-distrito', { drawSVG: '0%', duration: 1.6, stagger: 0.07, ease: 'power2.inOut' });
      gsap.from('.hero-mapa .mapa-pixeles', { opacity: 0, duration: 1.2, delay: 0.9 });
      gsap.from('.hero-mapa .mapa-mancha', { scale: 0, transformOrigin: '50% 50%', duration: 0.7, stagger: 0.05, delay: 1.2, ease: 'back.out(2.4)' });
      gsap.from('.hero-leyenda, .hero-cifra, .hero-pie > *', { y: 24, opacity: 0, duration: 0.8, stagger: 0.08, delay: 1.1, ease: 'power3.out' });

      ScrollTrigger.create({
        trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: (s) => { estado.p = s.progress * 0.95; },
      });

      document.fonts.ready.then(() => ctx.add(() => {
        const cfg = { yPercent: 110, duration: 1, stagger: 0.022, ease: 'power4.out', delay: 0.35 };
        gsap.utils.toArray<HTMLElement>('.hero-titulo').forEach((t) => {
          const s = SplitText.create(t, { type: 'lines, chars', mask: 'lines' });
          gsap.from(s.chars, cfg);
        });
        gsap.utils.toArray<HTMLElement>('.banda h2, .atajo h2, .usuarios h2, .historia h2, .historia h3').forEach((h) => {
          const s = SplitText.create(h, { type: 'lines', mask: 'lines' });
          gsap.from(s.lines, { yPercent: 105, duration: 0.95, stagger: 0.1, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
        });
        const marca = document.querySelector<HTMLElement>('.marca-pie');
        if (marca) {
          const s = SplitText.create(marca, { type: 'chars', mask: 'chars' });
          gsap.from(s.chars, { yPercent: 100, duration: 1.1, stagger: 0.05, ease: 'power4.out', scrollTrigger: { trigger: marca, start: 'top 95%', once: true } });
        }
      }));

      /* Brasas que suben desde las áreas quemadas (solo mientras el hero está a la vista) */
      const capa = document.querySelector<HTMLElement>('.hero-fuego-interior');
      if (capa) {
        const base = capa.getBoundingClientRect();
        const fuentes = gsap.utils.toArray<SVGPathElement>('.hero-mapa-fuego .mapa-mancha').map((m) => {
          const r = m.getBoundingClientRect();
          return { x: ((r.left + r.width / 2 - base.left) / base.width) * 100, y: ((r.top + r.height / 2 - base.top) / base.height) * 100, w: r.width };
        });
        const total = innerWidth < 640 ? 14 : 30;
        const vidas: gsap.core.Timeline[] = [];
        for (let i = 0; i < total && fuentes.length; i++) {
          const f = fuentes[i % fuentes.length];
          const b = document.createElement('span');
          b.className = 'brasa';
          b.style.left = `${f.x}%`;
          b.style.top = `${f.y}%`;
          capa.appendChild(b);
          brasas.push(b);
          const vida = gsap.timeline({ repeat: -1, delay: gsap.utils.random(0, 3), repeatDelay: gsap.utils.random(0, 1.5) });
          vida.fromTo(b, { x: gsap.utils.random(-f.w / 2, f.w / 2), y: 0, opacity: 0, scale: gsap.utils.random(0.6, 1.4) },
            { y: -gsap.utils.random(70, 170), x: `+=${gsap.utils.random(-30, 30)}`, duration: gsap.utils.random(2.2, 4), ease: 'sine.out' })
            .to(b, { opacity: 1, duration: 0.4 }, 0)
            .to(b, { opacity: 0, duration: 1 }, '>-1');
          vidas.push(vida);
        }
        ScrollTrigger.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: (s) => vidas.forEach((v) => (s.isActive ? v.resume() : v.pause())) });
      }

      /* Cinta infinita de principios: acelera y cambia de sentido con el scroll */
      const pista = document.querySelector<HTMLElement>('.cinta-pista');
      if (pista) {
        const giro = gsap.to(pista, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
        giro.totalTime(giro.duration() * 200);
        ScrollTrigger.create({
          trigger: '.cinta', start: 'top bottom', end: 'bottom top',
          onUpdate: (s) => {
            const dir = s.direction;
            gsap.to(giro, { timeScale: dir * (1 + Math.min(Math.abs(s.getVelocity()) / 350, 6)), duration: 0.2, overwrite: true });
            gsap.to(giro, { timeScale: dir, duration: 1.4, delay: 0.25 });
          },
        });
      }

      /* Entradas de cada sección: primero el bloque, luego sus partes */
      const bloques = gsap.utils.toArray<HTMLElement>('.pasos h2, .pasos li > span, .atajo p, .atajo strong, .banda-bajada, .banda p, .banda .btn, .pilares li, .usuarios-bajada, .usuarios-filas article, .usuarios .btn, .h-paso > p, .h-veredictos li, .h-paso .btn, .pie-datos small');
      gsap.set(bloques, { opacity: 0, y: 32 });
      ScrollTrigger.batch(bloques, {
        start: 'top 90%', once: true,
        onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.85, stagger: 0.08, ease: 'power3.out', overwrite: true }),
      });

      /* El fondo de la página cambia de color al entrar cada sección. Estas secciones están separadas por
         bandas opacas, así que nunca hay dos activas a la vez: el color se fija en cuanto la sección asoma,
         también si se llega saltando (ancla o recarga a media página). */
      gsap.set(raiz, { backgroundColor: color('crema') });
      gsap.utils.toArray<HTMLElement>('[data-fondo]').forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec, start: 'top bottom', end: 'bottom top',
          onToggle: (s) => { if (s.isActive) gsap.to(raiz, { backgroundColor: color(sec.dataset.fondo!), duration: 0.9, ease: 'power2.out', overwrite: 'auto' }); },
        });
      });

      /* Seguidor del cursor en los accesos (solo con ratón) */
      const sig = seguidor.current;
      if (sig && matchMedia('(pointer: fine)').matches) {
        const xTo = gsap.quickTo(sig, 'x', { duration: 0.45, ease: 'power3.out' });
        const yTo = gsap.quickTo(sig, 'y', { duration: 0.45, ease: 'power3.out' });
        gsap.set(sig, { scale: 0, xPercent: -50, yPercent: -50 });
        gsap.utils.toArray<HTMLElement>('.atajo').forEach((a) => {
          const entrar = (e: PointerEvent) => {
            sig.querySelector('span')!.textContent = a.dataset.seguidor ?? '';
            xTo(e.clientX); yTo(e.clientY);
            gsap.to(sig, { scale: 1, duration: 0.35, ease: 'back.out(2)', overwrite: 'auto' });
          };
          const moverS = (e: PointerEvent) => { xTo(e.clientX); yTo(e.clientY); };
          const salir = () => gsap.to(sig, { scale: 0, duration: 0.25, overwrite: 'auto' });
          a.addEventListener('pointerenter', entrar);
          a.addEventListener('pointermove', moverS);
          a.addEventListener('pointerleave', salir);
          limpiar.push(() => { a.removeEventListener('pointerenter', entrar); a.removeEventListener('pointermove', moverS); a.removeEventListener('pointerleave', salir); });
        });
      }
    }, raiz);

    const refrescar = () => ScrollTrigger.refresh();
    document.fonts.ready.then(refrescar);

    return () => {
      ctx.revert();
      brasas.forEach((b) => b.remove());
      limpiar.forEach((f) => f());
    };
  }, []);

  return <div ref={seguidor} className="seguidor" aria-hidden="true"><span /></div>;
}
