import type { Metadata } from 'next';
import { TestimoniosApp } from '@/components/TestimoniosApp';

export const metadata: Metadata = { title: 'Testimonios e iniciativas' };

export default function Testimonios() {
  return <TestimoniosApp />;
}
