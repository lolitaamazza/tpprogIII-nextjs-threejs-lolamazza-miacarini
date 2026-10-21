import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INTERCEPT_LINES, interceptAt } from '../lib/games/intercept.js';

test('la intercepción escribe sus líneas en orden y termina con el acceso concedido', () => {
  const times = INTERCEPT_LINES.map((line) => line.at);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.equal(interceptAt(0).lines.length, 0);
  const denied = INTERCEPT_LINES.findIndex((line) => line.tone === 'denied');
  const granted = INTERCEPT_LINES.findIndex((line) => line.tone === 'granted');
  assert.ok(denied >= 0 && granted > denied, 'primero lo niega, después entra');
  assert.equal(interceptAt(INTERCEPT_LINES[denied].at + 0.01).phase, 'denied');
  assert.equal(interceptAt(INTERCEPT_LINES[granted].at + 0.01).phase, 'granted');
  const end = interceptAt(10);
  assert.equal(end.phase, 'done');
  assert.equal(end.lines.length, INTERCEPT_LINES.length);
});

test('es corta: no pasa de tres segundos, y con movimiento reducido se muestra entera y dura menos', () => {
  let t = 0;
  while (interceptAt(t).phase !== 'done') t += 0.05;
  assert.ok(t <= 3, `${t.toFixed(2)} s`);
  const calm = interceptAt(0, { reducedMotion: true });
  assert.equal(calm.lines.length, INTERCEPT_LINES.length);
  assert.equal(calm.phase, 'granted');
  assert.equal(interceptAt(1.3, { reducedMotion: true }).phase, 'done');
});
