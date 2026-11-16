import type { Metadata } from 'next';
import { ResumenApp } from '@/components/ResumenApp';

export const metadata: Metadata = { title: 'Resumen de la provincia' };

export default function Resumen() {
  return <ResumenApp />;
}
