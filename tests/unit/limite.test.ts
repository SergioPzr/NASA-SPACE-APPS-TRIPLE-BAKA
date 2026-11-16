import test from 'node:test';
import assert from 'node:assert/strict';
import { permitir } from '../../src/lib/limite.ts';

test('permite hasta el máximo y luego bloquea', () => {
  const r = Array.from({ length: 4 }, () => permitir('ip-a', 3, 60_000));
  assert.deepEqual(r, [true, true, true, false]);
});

test('cada clave tiene su propia cuenta', () => {
  permitir('ip-b', 1, 60_000);
  assert.equal(permitir('ip-b', 1, 60_000), false);
  assert.equal(permitir('ip-c', 1, 60_000), true);
});

test('la ventana vence', async () => {
  assert.equal(permitir('ip-d', 1, 20), true);
  assert.equal(permitir('ip-d', 1, 20), false);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(permitir('ip-d', 1, 20), true);
});
