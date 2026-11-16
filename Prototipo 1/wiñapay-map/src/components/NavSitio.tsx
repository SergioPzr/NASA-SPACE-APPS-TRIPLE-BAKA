'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ENLACES = [
  { href: '/mapa', texto: 'Mapa' },
  { href: '/resumen', texto: 'Resumen' },
  { href: '/testimonios', texto: 'Testimonios' },
  { href: '/ayudar', texto: '¿Cómo ayudar?' },
  { href: '/acerca', texto: 'Acerca' },
];

export function NavSitio() {
  const ruta = usePathname();
  const [enLinea, setEnLinea] = useState(true);
  // En la portada ('/') la nav comienza oculta y se revela con el evento 'winapay:quema'
  const [visible, setVisible] = useState(ruta !== '/');

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    actualizar();
    addEventListener('online', actualizar);
    addEventListener('offline', actualizar);
    return () => {
      removeEventListener('online', actualizar);
      removeEventListener('offline', actualizar);
    };
  }, []);

  useEffect(() => {
    if (ruta !== '/') {
      setVisible(true);
      return;
    }

    // En la portada: oculta al inicio, se revela cuando AnimacionesPortada
    // dispara el evento custom 'winapay:quema' (Fase 1)
    setVisible(false);

    const revelar = () => setVisible(true);
    window.addEventListener('winapay:quema', revelar, { once: true });
    return () => window.removeEventListener('winapay:quema', revelar);
  }, [ruta]);

  return (
    <nav
      className={`nav-sitio ${!visible ? 'nav-oculta' : ''}`}
      aria-label="Principal"
    >
      <Link href="/" className="marca-nav" aria-label="WIÑAPAY, inicio">
        <img src="/Logo.png" alt="" width={714} height={193} />
      </Link>
      <ul>
        {ENLACES.map((e) => (
          <li key={e.href}>
            <Link href={e.href} aria-current={ruta === e.href ? 'page' : undefined}>
              <span>{e.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!enLinea && <span className="chip-offline" role="status">Sin conexión · datos guardados</span>}
    </nav>
  );
}
