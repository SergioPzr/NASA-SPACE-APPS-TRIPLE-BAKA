import { listar, recibir } from '@/lib/envios';

export const GET = listar('iniciativas');
export const POST = recibir('iniciativas');
