'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { escenasScroll } from './escenasScroll';
import { movimientoReducido } from './movimiento';

/**
 * FASES DE LA PORTADA
 * ────────────────────────────────────────────────────────────
 * FASE 0 (inicial): Mapa de Cusco VERDE ocupa toda la pantalla.
 *   - Latido suave (scale)
 *   - Scroll bloqueado
 *   - Navbar oculta
 *   - Texto oculto
 *
 * FASE 1 (primera interacción: scroll/click/touch/tecla):
 *   - El latido se detiene
 *   - La capa de fuego se desliza desde el borde izquierdo (--c 0 → 0.56)
 *   - Navbar desciende desde arriba
 *   - Título aparece por líneas con SplitText
 *   - Leyenda y acciones hacen fade-in
 *   - Scroll se desbloquea
 *   - `.scroll-contenido` se hace visible
 *
 * FASE 2 (scroll normal): ver `escenasScroll.ts`
 *   - Salida del hero con parallax, tarjetas, textos, cinta, cartas y pie.
 *
 * El texto del hero usa SIEMPRE `fromTo` (estado inicial y final explícitos) y tiene una red
 * de seguridad que fuerza el estado final: con React StrictMode (desarrollo), «Modo ligero» o
 * un efecto que se ejecuta dos veces, el texto nunca puede quedar atascado en opacidad 0.
 */
export function AnimacionesPortada() {
  const seguidor = useRef<HTMLDivElement>(null);
  const progreso = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>('.landing');
    const hero = raiz?.querySelector<HTMLElement>('.hero');
    if (!raiz || !hero) return;

    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
    const reducido = movimientoReducido();
    const limpiar: (() => void)[] = [];
    let faseActivada = false;
    let vivo = true;
    let seguro = 0;
    let split: SplitText | null = null;
    limpiar.push(() => { vivo = false; });

    /* ── Variables de estado del corte (igual que el original) ── */
    const estado = { cp: 0 };
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
    document.body.style.overflow = 'hidden';
    const scrollContenido = raiz.querySelector<HTMLElement>('.scroll-contenido');
    if (scrollContenido) {
      gsap.set(scrollContenido, { visibility: 'hidden', pointerEvents: 'none' });
    }
    const heroPie = hero.querySelector<HTMLElement>('.hero-pie');
    const titulo = heroPie?.querySelector<HTMLElement>('.hero-titulo') ?? null;
    const extras = heroPie
      ? [...heroPie.querySelectorAll<HTMLElement>('.hero-leyenda-izq, .entrada, .acciones-hero > *')]
      : [];
    const textoHero: HTMLElement[] = [...(titulo ? [titulo] : []), ...extras];
    if (heroPie) {
      gsap.set(heroPie, { opacity: 0 });
      heroPie.setAttribute('aria-hidden', 'true');
    }

    /** Estado final garantizado del texto: visible y sin estilos en línea de GSAP. */
    const mostrarTextoHero = () => {
      gsap.killTweensOf([...textoHero, ...(split ? split.lines : [])]);
      split?.revert();
      split = null;
      gsap.set(textoHero, { clearProps: 'opacity,transform' });
    };
    limpiar.push(() => {
      window.clearTimeout(seguro);
      mostrarTextoHero();
    });

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

    /* ── Animaciones de scroll (Fase 2) ── */
    function activarScroll(): () => void {
      if (reducido) {
        ScrollTrigger.refresh();
        return () => {};
      }
      const cierres: (() => void)[] = [];

      const ctx = gsap.context(() => {
        ScrollTrigger.refresh();

        /* Corte del hero sigue al cursor después de la quema */
        const partido = raiz!.querySelector<HTMLElement>('.hero-partido');
        const control = raiz!.querySelector<HTMLInputElement>('.corte-control input');
        if (partido) {
          const estado2 = { cp: 0.56 };
          const irA = gsap.quickTo(estado2, 'cp', { duration: 0.9, ease: 'power3.out' });

          const updateHero = () => hero!.style.setProperty('--c', estado2.cp.toFixed(4));
          gsap.ticker.add(updateHero);

          const mover = (e: PointerEvent) => {
            const r = partido.getBoundingClientRect();
            const v = gsap.utils.clamp(0.1, 0.9, (e.clientX - r.left) / r.width);
            irA(v);
            if (control) control.value = String(Math.round(v * 100));
          };
          partido.addEventListener('pointermove', mover);
          partido.addEventListener('pointerdown', mover);
          cierres.push(() => {
            gsap.ticker.remove(updateHero);
            partido.removeEventListener('pointermove', mover);
            partido.removeEventListener('pointerdown', mover);
          });

          /* Scroll barre el corte hacia la derecha (efecto original) */
          ScrollTrigger.create({
            trigger: hero, start: 'top top', end: '+=500', scrub: true,
            onUpdate: (s) => { estado2.cp = 0.56 + s.progress * 0.38; },
          });
        }

        /* Seguidor de cursor en los atajos (oculto por CSS; se conserva por compatibilidad) */
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
            const salir = () => gsap.to(sig, { scale: 0, duration: 0.22, overwrite: 'auto' });

            a.addEventListener('pointerenter', entrar);
            a.addEventListener('pointermove', moverS);
            a.addEventListener('pointerleave', salir);
            cierres.push(() => {
              a.removeEventListener('pointerenter', entrar);
              a.removeEventListener('pointermove', moverS);
              a.removeEventListener('pointerleave', salir);
            });
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
      }, raiz!);

      /* Escenas de scroll nuevas (barra, parallax, cinta, textos, cartas, pie) */
      cierres.push(escenasScroll(raiz!, progreso.current));

      return () => {
        cierres.forEach((f) => f());
        ctx.revert();
      };
    }

    /* ── Función de activación (Fase 0 → Fase 1) ── */
    const quitarListeners = () => {
      document.removeEventListener('wheel', activarQuema, { capture: true });
      document.removeEventListener('touchstart', activarQuema, { capture: true });
      document.removeEventListener('pointerdown', activarQuema, { capture: true });
      document.removeEventListener('keydown', activarQuema, { capture: true });
    };

    function activarQuema() {
      if (faseActivada) return;
      faseActivada = true;
      quitarListeners();

      // Detener latido suavemente y regresar a escala normal
      if (latido) {
        latido.kill();
        gsap.to('.hero-mapa-vivo', { scale: 1, duration: 0.5, ease: 'power2.out' });
      }

      // Texto preparado (oculto) desde el primer fotograma de la activación
      if (heroPie && !reducido) {
        if (titulo) gsap.set(titulo, { opacity: 0 });
        gsap.set(extras, { opacity: 0, y: 16 });
      }

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          onComplete: () => {
            if (!vivo) return;
            // Desbloquear scroll y hacer visible el contenido
            document.body.style.overflow = '';
            if (scrollContenido) {
              gsap.set(scrollContenido, { visibility: 'visible', pointerEvents: 'auto' });
              scrollContenido.removeAttribute('aria-hidden');
            }
            if (heroPie) heroPie.removeAttribute('aria-hidden');
            limpiar.push(activarScroll());
          },
        });

        // 1. La quema: animar --c de 0 a 0.56 de manera suave
        tl.to(estado, { cp: 0.56, duration: 1.3, ease: 'power2.inOut' }, 0);

        // 2. Navbar: disparar evento custom para que NavSitio aparezca
        tl.call(() => {
          window.dispatchEvent(new CustomEvent('winapay:quema'));
        }, [], 0.3);

        // 3. Texto del hero
        if (heroPie) {
          if (reducido) tl.set(heroPie, { opacity: 1 }, 0.4);
          else tl.fromTo(heroPie, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
        }
      }, raiz!);
      limpiar.push(() => ctx.revert());

      if (heroPie && reducido) {
        // Sin animación: el texto queda visible tal cual
        mostrarTextoHero();
      } else if (heroPie) {
        // Las fuentes fijan los saltos de línea; no se espera más de 1,2 s por ellas
        const fuentes = Promise.race([
          document.fonts.ready,
          new Promise<void>((ok) => window.setTimeout(ok, 1200)),
        ]);
        void fuentes.then(() => {
          if (!vivo) return;
          if (titulo) {
            try {
              split = SplitText.create(titulo, { type: 'lines' });
              gsap.set(titulo, { opacity: 1 });
              gsap.fromTo(
                split.lines,
                { y: 35, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.1 },
              );
            } catch {
              gsap.set(titulo, { opacity: 1 });
            }
          }
          gsap.fromTo(
            extras,
            { y: 16, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.35 },
          );
        });
        // Red de seguridad: pase lo que pase, el texto termina visible
        seguro = window.setTimeout(mostrarTextoHero, 3800);
      }
    }

    /* ── Registrar listeners de primer contacto ── */
    document.addEventListener('wheel', activarQuema, { capture: true, passive: true });
    document.addEventListener('touchstart', activarQuema, { capture: true, passive: true });
    document.addEventListener('pointerdown', activarQuema, { capture: true });
    document.addEventListener('keydown', activarQuema, { capture: true });
    limpiar.push(quitarListeners);

    // Con movimiento reducido: activar directamente sin animación
    if (reducido) activarQuema();

    return () => {
      document.body.style.overflow = '';
      latido?.kill();
      limpiar.forEach((f) => f());
    };
  }, []);

  return (
    <>
      <div ref={progreso} className="progreso-scroll" aria-hidden="true" />
      <div ref={seguidor} className="seguidor" aria-hidden="true">
        <span />
      </div>
    </>
  );
}
