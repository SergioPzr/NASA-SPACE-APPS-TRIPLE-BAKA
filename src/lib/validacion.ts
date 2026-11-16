import type { Envio } from './tipos';

export const LIM = { texto: [20, 800], alias: 60, titulo: [5, 120], descripcion: [30, 1200], organizacion: 120, contacto: 160 } as const;

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const TELEFONO = /(?:\+?\d[\s().-]?){8,}/;
export const contieneDatosPersonales = (s: string) => EMAIL.test(s) || TELEFONO.test(s);

export type Errores = Record<string, string>;
export type Resultado<T> = { ok: true; valor: T } | { ok: false; errores: Errores };

const limpiar = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max * 2) : '');

export function validarTestimonio(c: unknown, distritos: string[]): Resultado<Envio> {
  const b = (c ?? {}) as Record<string, unknown>;
  const e: Errores = {};
  const texto = limpiar(b.texto, LIM.texto[1]);
  const alias = limpiar(b.nombre, LIM.alias);
  const distrito = limpiar(b.distrito, 10);
  if (texto.length < LIM.texto[0] || texto.length > LIM.texto[1]) e.texto = `Escribe entre ${LIM.texto[0]} y ${LIM.texto[1]} caracteres.`;
  else if (contieneDatosPersonales(texto)) e.texto = 'No incluyas teléfonos ni correos: el texto es público.';
  if (alias.length > LIM.alias) e.nombre = `Máximo ${LIM.alias} caracteres.`;
  else if (contieneDatosPersonales(alias)) e.nombre = 'Usa un apodo o deja este campo vacío.';
  if (distrito && !distritos.includes(distrito)) e.distrito = 'Distrito no válido.';
  if (b.consentimiento !== true) e.consentimiento = 'Necesitamos tu consentimiento para publicarlo.';
  if (Object.keys(e).length) return { ok: false, errores: e };
  return { ok: true, valor: { texto, nombre: alias || undefined, distrito: distrito || undefined, consentimiento: true } };
}

export interface EnvioIniciativa {
  titulo: string;
  organizacion?: string;
  distrito?: string;
  descripcion: string;
  contacto_privado?: string;
  consentimiento: true;
}

export function validarIniciativa(c: unknown, distritos: string[]): Resultado<EnvioIniciativa> {
  const b = (c ?? {}) as Record<string, unknown>;
  const e: Errores = {};
  const titulo = limpiar(b.titulo, LIM.titulo[1]);
  const descripcion = limpiar(b.descripcion, LIM.descripcion[1]);
  const organizacion = limpiar(b.organizacion, LIM.organizacion);
  const contacto = limpiar(b.contacto, LIM.contacto);
  const distrito = limpiar(b.distrito, 10);
  if (titulo.length < LIM.titulo[0] || titulo.length > LIM.titulo[1]) e.titulo = `Entre ${LIM.titulo[0]} y ${LIM.titulo[1]} caracteres.`;
  if (descripcion.length < LIM.descripcion[0] || descripcion.length > LIM.descripcion[1]) e.descripcion = `Entre ${LIM.descripcion[0]} y ${LIM.descripcion[1]} caracteres.`;
  else if (contieneDatosPersonales(descripcion) || contieneDatosPersonales(titulo)) e.descripcion = 'No incluyas teléfonos ni correos: el texto es público.';
  if (organizacion.length > LIM.organizacion) e.organizacion = `Máximo ${LIM.organizacion} caracteres.`;
  if (distrito && !distritos.includes(distrito)) e.distrito = 'Distrito no válido.';
  if (b.consentimiento !== true) e.consentimiento = 'Necesitamos tu consentimiento para publicarlo.';
  if (Object.keys(e).length) return { ok: false, errores: e };
  return { ok: true, valor: { titulo, descripcion, organizacion: organizacion || undefined, distrito: distrito || undefined, contacto_privado: contacto || undefined, consentimiento: true } };
}
