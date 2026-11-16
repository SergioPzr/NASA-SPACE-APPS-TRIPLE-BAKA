import { listar, recibir } from '@/lib/envios';

export const GET = listar('testimonios');
export const POST = recibir('testimonios');
