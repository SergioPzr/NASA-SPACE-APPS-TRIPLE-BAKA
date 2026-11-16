import type { Metadata } from 'next';
import { TestimoniosApp } from '@/components/TestimoniosApp';

export const metadata: Metadata = { title: 'Testimonios' };

export default function Testimonios() {
  return <TestimoniosApp />;
}
