import { crear, idsDistrito, publicos, type Tabla } from './repo';
import { ipDe, permitir } from './limite';
import { conFalla, error, sinCache } from './http';
import { validarIniciativa, validarTestimonio, type Errores, type Resultado } from './validacion';

const MAX_CUERPO = 8 * 1024;

type Validador = (c: unknown, ids: string[]) => Resultado<object>;
const VALIDADORES: Record<Tabla, Validador> = { testimonios: validarTestimonio, iniciativas: validarIniciativa };

export const listar = (tabla: Tabla) => () => conFalla(async () => sinCache(await publicos(tabla)));

/** POST público: valida, frena abuso y guarda con estado "pendiente" (nada se publica sin moderación). */
export const recibir = (tabla: Tabla) => (req: Request) =>
  conFalla(async () => {
    const crudo = await req.text();
    if (crudo.length > MAX_CUERPO) return error(413, 'El envío es demasiado largo.');
    let cuerpo: Record<string, unknown>;
    try {
      cuerpo = JSON.parse(crudo);
    } catch {
      return error(400, 'Formato no válido.');
    }
    if (typeof cuerpo.web === 'string' && cuerpo.web !== '') return sinCache({ ok: true }, 202);
    const v = VALIDADORES[tabla](cuerpo, idsDistrito());
    if (!v.ok) return error(422, 'Revisa los campos.', { errores: v.errores satisfies Errores });
    if (!permitir(`${tabla}:${ipDe(req)}`)) return error(429, 'Demasiados envíos. Intenta más tarde.');
    try {
      await crear(tabla, v.valor as never);
    } catch {
      return error(503, 'No se pudo guardar por ahora. Tu envío quedará en cola si estás sin conexión.');
    }
    return sinCache({ ok: true, estado: 'pendiente' }, 201);
  });
