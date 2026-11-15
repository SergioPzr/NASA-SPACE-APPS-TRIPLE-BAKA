import type { Metadata, Viewport } from 'next';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import { NavSitio } from '@/components/NavSitio';
import { RegistroSW } from '@/components/RegistroSW';
import { Transicion } from '@/components/Transicion';
import './globals.css';

const texto = DM_Sans({ subsets: ['latin'], variable: '--f-texto', display: 'swap' });
const titulo = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--f-titulo', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'WIÑAPAY · El territorio cambia. Hagámoslo visible.', template: '%s · WIÑAPAY' },
  description: 'Cómo cambió el verdor (NDVI) de la provincia de Cusco entre 2001 y 2025, con una mirada honesta sobre qué cambios tienen evidencia y cuáles no.',
  applicationName: 'WIÑAPAY',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#173e32',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${texto.variable} ${titulo.variable}`}>
      <body>
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        <NavSitio />
        <div id="contenido">{children}</div>
        <RegistroSW />
        <Transicion />
      </body>
    </html>
  );
}
