import { curvas } from '@/lib/repo';
import { conFalla, datos } from '@/lib/http';

export const GET = () => conFalla(async () => datos(await curvas()));
