'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { movimientoReducido } from './movimiento';

/**
 * FASES DE LA PORTADA
 * ────────────────────────────────────────────────────────────
 * FASE 0 (inicial): Mapa de Cusco VERDE ocupa toda la pantalla.
 *   - Latido suave (scale + brillo pulsante)
 *   - Scroll bloqueado
 *   - Navbar oculta
 *   - Texto oculto
 *
 * FASE 1 (primera interacción: scroll/click/touch):
 *   - El latido se detiene
 *   - La capa de fuego se desliza desde el borde izquierdo (--c 0 → 0.56)
 *   - Navbar desciende desde arriba
 *   - Título aparece con SplitText char por char
 *   - Leyenda y acciones hacen fade-in
 *   - Scroll se desbloquea
 *   - `.scroll-contenido` se hace visible
 *
 * FASE 2 (scroll normal):
 *   - Animaciones de texto en batch (secciones)
 *   - DrawSVG constelación (en HistoriaSatelite)
 *   - Seguidor de cursor en atajos
 */
export function AnimacionesPortada() {
  const seguidor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>('.landing');
    const hero  = raiz?.querySelector<HTMLElement>('.hero');
    if (!raiz || !hero) return;

    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
    const reducido = movimientoReducido();
    const limpiar: (() => void)[] = [];
    let faseActivada = false;

    /* ── Variables de estado del corte (igual que el original) ── */
    const control = raiz.querySelector<HTMLInputElement>('.corte-control input');
    const estado  = { cp: 0, p: 0 };
    let ultimo = -1;

    const pintar = () => {
      const c = estado.cp;
      if (Math.abs(c - ultimo) > 0.0005) {
        hero.style.setProperty('--c', c.toFixed(4));
        ultimo = c;
      }
    };

    gsap.ticker.add(pintar);
    limpiar.push(() => gsap.ticker.remove(pintar));

    /* ── FASE 0: preparación ── */
    // Scroll bloqueado
    document.body.style.overflow = 'hidden';
    // Scroll-contenido invisible
    const scrollContenido = raiz.querySelector<HTMLElement>('.scroll-contenido');
    if (scrollContenido) {
      gsap.set(scrollContenido, { visibility: 'hidden', pointerEvents: 'none' });
    }
    // Hero-pie (texto del hero) invisible
    const heroPie = hero.querySelector<HTMLElement>('.hero-pie');
    if (heroPie) {
      gsap.set(heroPie, { opacity: 0 });
      heroPie.setAttribute('aria-hidden', 'true');
    }

    /* ── Latido del mapa verde — zoom in / out ligero y suave ── */
    let latido: gsap.core.Timeline | null = null;
    if (!reducido) {
      latido = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'power1.inOut' } });
      latido.to('.hero-mapa-vivo', {
        scale: 1.045,
        duration: 2.4,
        transformOrigin: 'center center',
      });
    }

    /* ── Función de activación (Fase 0 → Fase 1) — fluida y sin lag ── */
    const activarQuema = () => {
      if (faseActivada) return;
      faseActivada = true;

      // Eliminar listeners de primer contacto
      document.removeEventListener('wheel',      activarQuema, { capture: true });
      document.removeEventListener('touchstart', activarQuema, { capture: true });
      document.removeEventListener('pointerdown',activarQuema, { capture: true });
      document.removeEventListener('keydown',    activarQuema, { capture: true });

      // Detener latido suavemente y regresar a escala normal
      if (latido) {
        latido.kill();
        gsap.to('.hero-mapa-vivo', { scale: 1, duration: 0.5, ease: 'power2.out' });
      }

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          onComplete: () => {
            // Desbloquear scroll y hacer visible el contenido
            document.body.style.overflow = '';
            if (scrollContenido) {
              gsap.set(scrollContenido, { visibility: 'visible', pointerEvents: 'auto' });
              scrollContenido.removeAttribute('aria-hidden');
            }
            if (heroPie) heroPie.removeAttribute('aria-hidden');
            // Activar animaciones de scroll
            activarScroll();
          },
        });

        // 1. La quema: animar --c de 0 a 0.56 de manera suave
        tl.to(estado, {
          cp: 0.56,
          duration: 1.3,
          ease: 'power2.inOut',
        }, 0);

        // 2. Navbar: disparar evento custom para que NavSitio aparezca
        tl.call(() => {
          window.dispatchEvent(new CustomEvent('winapay:quema'));
        }, [], 0.3);

        // 3. Texto del hero: aparición suave por líneas (sin lag de rendering)
        if (heroPie) {
          tl.to(heroPie, { opacity: 1, duration: 0.4 }, 0.4);
          document.fonts.ready.then(() => {
            const titulo = heroPie.querySelector<HTMLElement>('.hero-titulo');
            if (titulo && !reducido) {
              const split = SplitText.create(titulo, { type: 'lines' });
              gsap.from(split.lines, {
                y: 35,
                opacity: 0,
                duration: 0.9,
                stagger: 0.12,
                ease: 'power3.out',
                delay: 0.1,
              });
            }
            const extras = heroPie.querySelectorAll<HTMLElement>('.hero-leyenda-izq, .entrada, .acciones-hero > *');
            gsap.from(extras, { y: 16, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.35 });
          });
        }
      }, raiz);

      limpiar.push(() => ctx.revert());
    };

    /* ── Registrar listeners de primer contacto ── */
    document.addEventListener('wheel',       activarQuema, { capture: true, passive: true });
    document.addEventListener('touchstart',  activarQuema, { capture: true, passive: true });
    document.addEventListener('pointerdown', activarQuema, { capture: true });
    document.addEventListener('keydown',     activarQuema, { capture: true });

    limpiar.push(() => {
      document.removeEventListener('wheel',      activarQuema, { capture: true });
      document.removeEventListener('touchstart', activarQuema, { capture: true });
      document.removeEventListener('pointerdown',activarQuema, { capture: true });
      document.removeEventListener('keydown',    activarQuema, { capture: true });
    });

    if (reducido) {
      // Con movimiento reducido: activar directamente sin animación
      activarQuema();
    }

    return () => {
      document.body.style.overflow = '';
      latido?.kill();
      limpiar.forEach((f) => f());
    };
  }, []);

  /* ── Animaciones de scroll (Fase 2) ── */
  function activarScroll() {
    const raiz = document.querySelector<HTMLElement>('.landing');
    if (!raiz) return;

    const reducido = movimientoReducido();

    const ctx = gsap.context(() => {
      ScrollTrigger.refresh();

      if (reducido) return;

      /* Corte del hero sigue al cursor después de la quema */
      const hero   = raiz.querySelector<HTMLElement>('.hero');
      const partido= raiz.querySelector<HTMLElement>('.hero-partido');
      const control= raiz.querySelector<HTMLInputElement>('.corte-control input');
      if (hero && partido) {
        const estado2 = { cp: 0.56 };
        const irA = gsap.quickTo(estado2, 'cp', { duration: 0.9, ease: 'power3.out' });

        const updateHero = () => hero.style.setProperty('--c', estado2.cp.toFixed(4));
        gsap.ticker.add(updateHero);

        const mover = (e: PointerEvent) => {
          const r = partido.getBoundingClientRect();
          const v = gsap.utils.clamp(0.1, 0.9, (e.clientX - r.left) / r.width);
          irA(v);
          if (control) control.value = String(Math.round(v * 100));
        };
        partido.addEventListener('pointermove', mover);
        partido.addEventListener('pointerdown', mover);

        /* Scroll barre el corte hacia la derecha (efecto original) */
        ScrollTrigger.create({
          trigger: hero, start: 'top top', end: '+=500', scrub: true,
          onUpdate: (s) => { estado2.cp = 0.56 + s.progress * 0.38; },
        });
      }

      /* Entradas de texto en las secciones de scroll */
      const bloques = gsap.utils.toArray<HTMLElement>(
        '.atajo p, .atajo strong, .cta-ayudar h2, .cta-ayudar p, .cta-ayudar .btn, .pie-datos small'
      );
      gsap.set(bloques, { opacity: 0, y: 24 });
      ScrollTrigger.batch(bloques, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, duration: 0.85, stagger: 0.08, ease: 'power3.out', overwrite: true }),
      });

      /* Títulos de secciones con SplitText */
      document.fonts.ready.then(() => {
        gsap.utils.toArray<HTMLElement>('.atajo h2, .cta-ayudar h2, .historia h2, .historia h3').forEach((h) => {
          const s = SplitText.create(h, { type: 'lines', mask: 'lines' });
          gsap.from(s.lines, {
            yPercent: 105,
            duration: 0.9,
            stagger: 0.1,
            ease: 'power4.out',
            scrollTrigger: { trigger: h, start: 'top 88%', once: true },
          });
        });

        /* Marca del pie */
        const marca = raiz.querySelector<HTMLElement>('.marca-pie');
        if (marca) {
          const s = SplitText.create(marca, { type: 'chars', mask: 'chars' });
          gsap.from(s.chars, {
            yPercent: 100,
            duration: 1.1,
            stagger: 0.05,
            ease: 'power4.out',
            scrollTrigger: { trigger: marca, start: 'top 95%', once: true },
          });
        }
      });

      /* Seguidor de cursor en los atajos */
      const sig = seguidor.current;
      if (sig && matchMedia('(pointer: fine)').matches) {
        const xTo = gsap.quickTo(sig, 'x', { duration: 0.4, ease: 'power3.out' });
        const yTo = gsap.quickTo(sig, 'y', { duration: 0.4, ease: 'power3.out' });
        gsap.set(sig, { scale: 0, xPercent: -50, yPercent: -50 });

        gsap.utils.toArray<HTMLElement>('.atajo').forEach((a) => {
          const entrar = (e: PointerEvent) => {
            sig.querySelector('span')!.textContent = a.dataset.seguidor ?? '';
            xTo(e.clientX); yTo(e.clientY);
            gsap.to(sig, { scale: 1, duration: 0.3, ease: 'back.out(2)', overwrite: 'auto' });
          };
          const moverS = (e: PointerEvent) => { xTo(e.clientX); yTo(e.clientY); };
          const salir  = () => gsap.to(sig, { scale: 0, duration: 0.22, overwrite: 'auto' });

          a.addEventListener('pointerenter', entrar);
          a.addEventListener('pointermove',  moverS);
          a.addEventListener('pointerleave', salir);
        });
      }

      /* Color de fondo cambia con la sección activa */
      const css = getComputedStyle(document.documentElement);
      const color = (t: string) => css.getPropertyValue(`--${t}`).trim();
      gsap.utils.toArray<HTMLElement>('[data-fondo]').forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec, start: 'top bottom', end: 'bottom top',
          onToggle: (s) => {
            if (s.isActive)
              gsap.to(raiz, { backgroundColor: color(sec.dataset.fondo!), duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
          },
        });
      });
    }, raiz);
  }

  return (
    <div ref={seguidor} className="seguidor" aria-hidden="true">
      <span />
    </div>
  );
}
