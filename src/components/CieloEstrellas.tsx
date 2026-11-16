'use client';

import { useEffect, useRef } from 'react';
import type { Controlador } from '@/lib/mapa';

interface Props {
  ctrl: Controlador | null;
  /** Con movimiento reducido: estrellas quietas (sin parpadeo); igual acompañan al zoom. */
  quieto: boolean;
}

interface Estrella { x: number; y: number; z: number; r: number; fase: number; vel: number; color: string }

/* Dos puntos fijos de Cusco: la distancia entre ellos en pantalla dice cuánto zoom hay. */
const A: [number, number] = [-71.98, -13.53];
const B: [number, number] = [-71.88, -13.53];

/**
 * Fondo de estrellas detrás del mapa. Reacciona a la cámara: al acercarse a un distrito las
 * estrellas se abren hacia los bordes (como avanzar entre ellas) y se desplazan con el mapa,
 * más las cercanas que las lejanas. Decorativo: oculto para lectores de pantalla.
 */
export function CieloEstrellas({ ctrl, quieto }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;

    let W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ajustar = () => {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`; cv.style.height = `${H}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajustar();

    const total = Math.round(Math.min(420, (W * H) / 4800));
    const estrellas: Estrella[] = Array.from({ length: total }, () => {
      const especial = Math.random() < 0.08;
      return {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: 0.2 + Math.random() * 0.8,
        r: especial ? 1.4 + Math.random() * 0.8 : 0.5 + Math.random() * 0.8,
        fase: Math.random() * Math.PI * 2,
        vel: 0.6 + Math.random() * 1.8,
        color: Math.random() < 0.18 ? '255, 214, 150' : '244, 240, 232',
      };
    });

    // Estado de la cámara: zoom relativo (k) y desplazamiento (px, py) desde la vista inicial
    let k = 1, kVis = 1, px = 0, py = 0, pxVis = 0, pyVis = 0;
    let s0 = 0, ax0 = 0, ay0 = 0;
    const medir = () => {
      if (!ctrl) return;
      const a = ctrl.proyectar(A[0], A[1]);
      const b = ctrl.proyectar(B[0], B[1]);
      if (!a || !b) return;
      const s = Math.hypot(b.x - a.x, b.y - a.y);
      if (!s) return;
      if (!s0) { s0 = s; ax0 = a.x; ay0 = a.y; }
      k = s / s0; px = a.x - ax0; py = a.y - ay0;
    };

    const dibujar = (t: number) => {
      // Suavizado para que el cielo acompañe a la cámara sin saltos
      kVis += (k - kVis) * 0.12; pxVis += (px - pxVis) * 0.12; pyVis += (py - pyVis) * 0.12;
      g.clearRect(0, 0, W, H);
      for (const e of estrellas) {
        const kk = Math.pow(kVis, 0.6 * e.z);
        let x = W / 2 + e.x * (W / 2) * kk + pxVis * e.z * 0.3;
        let y = H / 2 + e.y * (H / 2) * kk + pyVis * e.z * 0.3;
        x = ((x % W) + W) % W;
        y = ((y % H) + H) % H;
        const brillo = quieto ? 0.85 : 0.55 + 0.45 * Math.sin(t * 0.001 * e.vel + e.fase);
        const r = e.r * Math.min(2.4, 0.75 + 0.45 * kk * e.z);
        g.fillStyle = `rgba(${e.color}, ${((0.25 + 0.65 * e.z) * brillo).toFixed(3)})`;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    };

    let raf = 0;
    const bucle = (t: number) => { medir(); dibujar(t); raf = requestAnimationFrame(bucle); };
    raf = requestAnimationFrame(bucle);
    window.addEventListener('resize', ajustar);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', ajustar);
    };
  }, [ctrl, quieto]);

  return <canvas ref={ref} className="cielo-estrellas" aria-hidden="true" />;
}
