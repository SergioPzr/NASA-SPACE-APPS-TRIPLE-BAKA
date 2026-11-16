import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

/**
 * Escenas de scroll de la portada (solo GSAP + ScrollTrigger + SplitText + DrawSVG, ya instalados).
 *
 * Principio: TODO está ligado a la posición del scroll (scrub). El estado de cada elemento es una
 * función de dónde está la página, no de un disparo puntual; por eso no puede quedar a medias ni
 * oculto: al bajar aparece, al subir se deshace.
 *
 *  - «Lo que vio el satélite» es una sección fija (pin): la pantalla está vacía, los datos de cada
 *    escena aparecen mientras se baja, se mantienen y se borran para dejar paso a la siguiente.
 *    En pantallas pequeñas o bajas no se fija: cada escena se revela en el flujo normal.
 *  - El resto de secciones se revelan con scrub al entrar.
 *  - Se llama solo sin movimiento reducido (decide el llamador); el CSS por defecto es «visible».
 *  - No toca la animación inicial del hero (la quema con clic): solo su salida al hacer scroll.
 */

const esMovil = () => window.innerWidth <= 860;
const formato = (n: number, dec: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export function escenasScroll(raiz: HTMLElement, barra: HTMLElement | null): () => void {
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
  let vivo = true;
  const q = <T extends HTMLElement = HTMLElement>(sel: string): T[] => [...raiz.querySelectorAll<T>(sel)];
  const restaurar: (() => void)[] = [];

  /**
   * Línea de tiempo de ENTRADA de una escena de la historia (duración ≈ 0,65 unidades):
   * tarjeta visual, textos escalonados, contadores y trazos SVG.
   */
  const entrada = (fila: HTMLElement): gsap.core.Timeline => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    const tarjeta = fila.querySelector<HTMLElement>('.h-visual-tarjeta');
    if (tarjeta) tl.fromTo(tarjeta, { opacity: 0, y: 70, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.32 }, 0);

    const textos = [
      ...fila.querySelectorAll<HTMLElement>(
        '.h-subtitulo-seccion, .h-paso-texto h2, .h-paso-texto h3, .h-cifra, .h-paso-texto > p, .h-veredictos li, .h-paso-texto .btn',
      ),
    ];
    if (textos.length) tl.fromTo(textos, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.22, stagger: 0.05 }, 0.08);

    // Contadores: cuentan de 0 al valor real (el texto final es siempre el dato)
    fila.querySelectorAll<HTMLElement>('[data-contar]').forEach((b) => {
      const fin = Number(b.dataset.contar);
      const dec = Number(b.dataset.decimales ?? 0);
      const original = b.textContent ?? '';
      restaurar.push(() => { b.textContent = original; });
      const o = { v: 0 };
      b.textContent = formato(0, dec);
      tl.to(o, { v: fin, duration: 0.35, ease: 'power2.out', onUpdate: () => { b.textContent = formato(o.v, dec); } }, 0.14);
    });

    // Trazos: constelación de distritos (escena 1) y línea NDVI + tendencia (escena 3)
    const distritos = [...fila.querySelectorAll<SVGPathElement>('.h-constelacion .h-distrito')];
    if (distritos.length) tl.fromTo(distritos, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.4, stagger: 0.04 }, 0.1);
    const lineas = [...fila.querySelectorAll<SVGPathElement>('.h-linea, .h-tendencia')];
    if (lineas.length) tl.fromTo(lineas, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45, stagger: 0.12 }, 0.12);

    return tl;
  };

  const mm = gsap.matchMedia();

  const ctx = gsap.context(() => {
    /* ───── 1. Barra de progreso de lectura ───── */
    if (barra) {
      gsap.fromTo(barra, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
    }

    /* ───── 2. Salida del hero: el texto sube y se desvanece, el mapa se aleja con parallax ───── */
    const hero = raiz.querySelector<HTMLElement>('.hero');
    if (hero) {
      const pie = hero.querySelector<HTMLElement>('.hero-pie');
      if (pie) {
        gsap.to(pie, {
          yPercent: -14, opacity: 0, ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: '+=70%', scrub: true },
        });
      }
      const mapas = [...hero.querySelectorAll<HTMLElement>('.hero-mapa')];
      if (mapas.length) {
        gsap.to(mapas, {
          y: -70, scale: 1.08, ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: '+=100%', scrub: true },
        });
      }
    }

    /* ───── 3. «Lo que vio el satélite» ───── */
    const historia = raiz.querySelector<HTMLElement>('.historia');
    const filas = q('.h-paso-fila');
    if (historia && filas.length) {
      // Escritorio: sección fija; las escenas aparecen y se borran una tras otra
      mm.add('(min-width: 861px) and (min-height: 640px)', () => {
        historia.classList.add('historia-pin');
        const n = filas.length;
        historia.style.setProperty('--escenas', String(n));
        // La fijación la hace CSS (position: sticky); GSAP solo anima según el scroll de la sección.
        const maestra = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: historia, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
        });
        filas.forEach((fila, i) => {
          maestra.add(entrada(fila), i);
          maestra.set(fila, { pointerEvents: 'auto' }, i + 0.05);
          if (i < n - 1) {
            maestra.to(fila, { opacity: 0, y: -50, duration: 0.18, ease: 'power1.in' }, i + 0.82);
            maestra.set(fila, { pointerEvents: 'none' }, i + 0.82);
          }
        });
        maestra.set({}, {}, n); // la última escena se mantiene hasta soltar la sección
        return () => {
          historia.classList.remove('historia-pin');
          historia.style.removeProperty('--escenas');
        };
      });

      // Pantallas pequeñas o bajas: sin fijar; cada escena se revela con el scroll
      mm.add('(max-width: 860px), (max-height: 639px)', () => {
        filas.forEach((fila) => {
          ScrollTrigger.create({ trigger: fila, start: 'top 80%', end: 'top 20%', scrub: 0.5, animation: entrada(fila) });
        });
      });
    }

    /* ───── 4. Atajos: cortina ligada al scroll, título que deriva, texto escalonado ───── */
    q('.atajo').forEach((a) => {
      gsap.fromTo(
        a,
        { clipPath: 'inset(0 -14px 100% -14px)' },
        {
          clipPath: 'inset(0 -14px 0% -14px)', ease: 'none',
          scrollTrigger: { trigger: a, start: 'top 98%', end: 'top 62%', scrub: 0.4 },
        },
      );
      const h2 = a.querySelector<HTMLElement>('h2');
      if (h2) {
        gsap.fromTo(
          h2,
          { x: () => (esMovil() ? 14 : 90) },
          {
            x: () => (esMovil() ? -8 : -60), ease: 'none',
            scrollTrigger: { trigger: a, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
          },
        );
      }
      const textos = [...a.querySelectorAll<HTMLElement>('p, strong')];
      if (textos.length) {
        gsap.fromTo(
          textos,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.15, ease: 'none', scrollTrigger: { trigger: a, start: 'top 85%', end: 'top 45%', scrub: 0.4 } },
        );
      }
    });

    /* ───── 5. Llamada a ayudar y cartas de organizaciones ───── */
    const ayudar = raiz.querySelector<HTMLElement>('.cta-ayudar');
    if (ayudar) {
      const bloques = [...ayudar.querySelectorAll<HTMLElement>('.cta-ayudar-bajada, .cta-ayudar h2, .cta-ayudar-acciones .btn')];
      if (bloques.length) {
        gsap.fromTo(
          bloques,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: ayudar, start: 'top 82%', end: 'top 35%', scrub: 0.4 } },
        );
      }
    }
    const cartas = q('.ong-carta');
    const carrusel = raiz.querySelector<HTMLElement>('.ong-carrusel');
    if (cartas.length && carrusel) {
      gsap.fromTo(
        cartas,
        { y: 70, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: carrusel, start: 'top 98%', end: 'top 62%', scrub: 0.4 } },
      );
    }

    /* ───── 6. Marca del pie: termina justo al llegar al final de la página ───── */
    const pie = raiz.querySelector<HTMLElement>('.pie');
    const marca = raiz.querySelector<HTMLElement>('.marca-pie');
    if (pie && marca) {
      gsap.fromTo(
        marca,
        { yPercent: 40, opacity: 0 },
        { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: pie, start: 'top 100%', end: 'bottom bottom', scrub: 0.4 } },
      );
    }
  }, raiz);

  /* Los disparadores se recalculan cuando cambia el tamaño del contenido (fuentes, imágenes). */
  let temporizador = 0;
  const contenido = raiz.querySelector<HTMLElement>('.scroll-contenido');
  let altoPrevio = contenido?.offsetHeight ?? 0;
  const refrescar = () => {
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => {
      if (!vivo) return;
      const alto = contenido?.offsetHeight ?? 0;
      if (Math.abs(alto - altoPrevio) < 3) return; // sin cambio real de altura: no hace falta recalcular
      altoPrevio = alto;
      ScrollTrigger.refresh();
    }, 150);
  };
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refrescar);
  if (contenido) ro?.observe(contenido);
  window.addEventListener('load', refrescar);
  const imgs = q<HTMLImageElement>('img').filter((i) => !i.complete);
  imgs.forEach((i) => i.addEventListener('load', refrescar, { once: true }));

  /* Palabras que se «encienden» con el scroll (SplitText necesita las fuentes; máx. 1,5 s de espera) */
  const fuentes = Promise.race([document.fonts.ready, new Promise<void>((ok) => window.setTimeout(ok, 1500))]);
  void fuentes.then(() => {
    if (!vivo) return;
    ctx.add(() => {
      const parrafo = raiz.querySelector<HTMLElement>('.cta-ayudar-interior > p');
      if (parrafo) {
        const s = SplitText.create(parrafo, { type: 'words' });
        gsap.fromTo(
          s.words,
          { opacity: 0.15 },
          { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: parrafo, start: 'top 88%', end: 'bottom 60%', scrub: true } },
        );
      }
      const pie = raiz.querySelector<HTMLElement>('.pie');
      const eslogan = raiz.querySelector<HTMLElement>('.pie-eslogan');
      if (pie && eslogan) {
        const s = SplitText.create(eslogan, { type: 'words' });
        gsap.fromTo(
          s.words,
          { opacity: 0.15 },
          { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: pie, start: 'top 92%', end: 'bottom bottom', scrub: 0.5 } },
        );
      }
    });
    ScrollTrigger.refresh();
  });

  return () => {
    vivo = false;
    window.clearTimeout(temporizador);
    ro?.disconnect();
    window.removeEventListener('load', refrescar);
    imgs.forEach((i) => i.removeEventListener('load', refrescar));
    mm.revert();
    ctx.revert();
    restaurar.forEach((f) => f());
  };
}
