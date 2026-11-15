import test from 'node:test';
import assert from 'node:assert/strict';
import { ajusteBH, evaluar } from '../../src/lib/evidencia.ts';

test('BH conserva el orden y es monótono', () => {
  const q = ajusteBH([0.04, 0.001, 0.2]);
  assert.deepEqual(q.map((v) => +v.toFixed(4)), [0.06, 0.003, 0.2]);
});

test('una sola agregación significativa no basta para evidencia robusta', () => {
  const r = evaluar({
    a: { media_anual: { pendiente_anual: 0.002, p: 0.001 }, maximo_anual: { pendiente_anual: 0.001, p: 0.4 }, estacion_seca: { pendiente_anual: 0.001, p: 0.3 } },
    b: { media_anual: { pendiente_anual: 0, p: 0.9 }, maximo_anual: { pendiente_anual: 0, p: 0.9 }, estacion_seca: { pendiente_anual: 0, p: 0.9 } },
  });
  assert.equal(r.a.veredicto, 'parcial');
  assert.equal(r.b.veredicto, 'ninguna');
});

test('robusta solo si todas coinciden en dirección y significancia', () => {
  const z = { pendiente_anual: -0.002, p: 0.0001 };
  const r = evaluar({ a: { media_anual: z, maximo_anual: z, estacion_seca: z }, b: { media_anual: { pendiente_anual: 0, p: 0.8 } } });
  assert.equal(r.a.veredicto, 'robusta');
  assert.equal(r.a.direccion, 'descenso');
});

test('la corrección por varios distritos evita falsos positivos marginales', () => {
  const p = [0.0336, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const zonas = Object.fromEntries(p.map((v, i) => [`d${i}`, { media_anual: { pendiente_anual: 0.001, p: v } }]));
  assert.equal(evaluar(zonas).d0.veredicto, 'ninguna');
});
