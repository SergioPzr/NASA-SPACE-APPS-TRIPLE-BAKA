import test from 'node:test';
import assert from 'node:assert/strict';
import { validarTestimonio, validarIniciativa } from '../../src/lib/validacion.ts';

const ids = ['080101', '080102'];
const texto = 'Hace diez años el cerro estaba más verde que ahora.';

test('testimonio válido se normaliza', () => {
  const r = validarTestimonio({ texto: `  ${texto}  `, nombre: ' Quispe ', distrito: '080101', consentimiento: true }, ids);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.valor, { texto, nombre: 'Quispe', distrito: '080101', consentimiento: true });
});

test('exige consentimiento explícito', () => {
  const r = validarTestimonio({ texto, consentimiento: 'true' }, ids);
  assert.ok(!r.ok && r.errores.consentimiento);
});

test('rechaza correos y teléfonos en texto público', () => {
  assert.ok(!validarTestimonio({ texto: `${texto} escríbeme a ana@correo.pe`, consentimiento: true }, ids).ok);
  assert.ok(!validarTestimonio({ texto: `${texto} llámame al 984 123 456`, consentimiento: true }, ids).ok);
  assert.ok(!validarTestimonio({ texto, nombre: '984123456', consentimiento: true }, ids).ok);
});

test('rechaza texto corto, largo y distrito desconocido', () => {
  assert.ok(!validarTestimonio({ texto: 'corto', consentimiento: true }, ids).ok);
  assert.ok(!validarTestimonio({ texto: 'x'.repeat(900), consentimiento: true }, ids).ok);
  assert.ok(!validarTestimonio({ texto, distrito: '999999', consentimiento: true }, ids).ok);
});

test('iniciativa: el contacto queda privado y no se valida como público', () => {
  const r = validarIniciativa({ titulo: 'Reforestación en Ccorca', descripcion: 'Plantamos queñua cada sábado con la comunidad y viveros locales.', contacto: 'ana@correo.pe', consentimiento: true }, ids);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.valor.contacto_privado, 'ana@correo.pe');
});
