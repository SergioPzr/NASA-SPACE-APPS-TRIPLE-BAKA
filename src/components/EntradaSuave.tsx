'use client';

import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';

/** Entrada escalonada de los bloques `.ay-entra` de una página (solo al cargarla). */
export function EntradaSuave() {
  useLayoutEffect(() => {
    const el = document.querySelectorAll('.ay-entra');
    if (!el.length) return;
    gsap.fromTo(el, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' });
  }, []);
  return null;
}
