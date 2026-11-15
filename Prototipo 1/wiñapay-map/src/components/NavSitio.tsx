'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ENLACES = [
  { href: '/mapa', texto: 'Mapa' },
  { href: '/resumen', texto: 'Resumen' },
  { href: '/testimonios', texto: 'Testimonios' },
  { href: '/acerca', texto: 'Acerca' },
];

export function NavSitio() {
  const ruta = usePathname();
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    actualizar();
    addEventListener('online', actualizar);
    addEventListener('offline', actualizar);
    return () => { removeEventListener('online', actualizar); removeEventListener('offline', actualizar); };
  }, []);

  return (
    <nav className="nav-sitio" aria-label="Principal">
      <Link href="/" className="marca-nav" aria-label="WIÑAPAY, inicio">wiñapay<span>.</span></Link>
      <ul>
        {ENLACES.map((e) => (
          <li key={e.href}>
            <Link href={e.href} aria-current={ruta === e.href ? 'page' : undefined}>{e.texto}</Link>
          </li>
        ))}
      </ul>
      {!enLinea && <span className="chip-offline" role="status">Sin conexión · datos guardados</span>}
    </nav>
  );
}
