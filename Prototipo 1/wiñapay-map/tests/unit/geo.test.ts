import test from 'node:test';
import assert from 'node:assert/strict';
import { distPuntoPoligono, centro, mediana } from '../../src/lib/geo.ts';

const cuadro = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];

test('un punto dentro del polígono está a distancia 0', () => {
  assert.equal(distPuntoPoligono([0.5, 0.5], cuadro), 0);
});

test('un punto fuera tiene distancia positiva y crece al alejarse', () => {
  const cerca = distPuntoPoligono([1.1, 0.5], cuadro);
  const lejos = distPuntoPoligono([2, 0.5], cuadro);
  assert.ok(cerca > 0 && lejos > cerca);
});

test('centro y mediana', () => {
  assert.deepEqual(centro({ coordinates: [cuadro] }), [0.5, 0.5]);
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 2, 3]), 2.5);
});
