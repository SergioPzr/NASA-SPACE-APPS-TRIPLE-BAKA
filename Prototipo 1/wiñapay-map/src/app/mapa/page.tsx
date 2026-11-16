import type { Metadata } from 'next';
import { MapaApp } from '@/components/MapaApp';

export const metadata: Metadata = { title: 'Mapa' };

export default function PaginaMapa() {
  return <MapaApp />;
}
