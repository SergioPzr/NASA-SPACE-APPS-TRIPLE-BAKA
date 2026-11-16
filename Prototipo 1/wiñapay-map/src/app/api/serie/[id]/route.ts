import { serie } from '@/lib/repo';
import { conFalla, datos, error } from '@/lib/http';

/** id = código de distrito (INEI), "provincia" o "todos" (toda la tabla de resultados). */
export const GET = (_req: Request, { params }: { params: Promise<{ id: string }> }) =>
  conFalla(async () => {
    const { id } = await params;
    if (!/^(\d{6}|provincia|todos)$/.test(id)) return error(400, 'Identificador no válido.');
    const r = await serie(id);
    return r ? datos(r) : error(404, 'No hay serie para ese distrito.');
  });
