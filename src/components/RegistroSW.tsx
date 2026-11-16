'use client';

import { useEffect } from 'react';
import { vaciarCola } from '@/lib/envio-cliente';

const RUTAS = ['/', '/mapa', '/resumen', '/testimonios', '/acerca'];

function recursosCargados(): string[] {
  const propios = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin));
  return [...new Set([...RUTAS, '/api/distritos', '/api/manchas', '/api/curvas', '/api/serie/todos', '/icon.svg', ...propios])];
}

/** Registra el service worker (solo en producción) y reenvía la cola de testimonios al volver la red. */
export function RegistroSW() {
  useEffect(() => {
    const sincronizar = () => { void vaciarCola(); };
    addEventListener('online', sincronizar);
    if (navigator.onLine) sincronizar();

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          const enviar = () => reg.active?.postMessage({ tipo: 'precargar', urls: recursosCargados() });
          if (document.readyState === 'complete') enviar(); else addEventListener('load', enviar, { once: true });
        })
        .catch(() => undefined);
    }
    return () => removeEventListener('online', sincronizar);
  }, []);
  return null;
}
