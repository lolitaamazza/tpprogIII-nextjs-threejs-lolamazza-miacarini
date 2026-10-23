import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICT12 } from '../lib/locations/district12.js';
import { pathBetween, walkDuration, poseAlong, lookTarget, clampLook, spotForKey, streetPoint } from '../lib/guidedCamera.js';

const spot = (id) => DISTRICT12.spots.find((s) => s.id === id);
const near = (a, b, eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);

test('el camino sale de donde está la cámara, va por la calle y llega al lugar, sin repetir puntos', () => {
  const from = spot('vias').position;
  const path = pathBetween(from, spot('casa'));
  assert.ok(near(path[0], from));
  assert.ok(near(path.at(-1), spot('casa').position));
  assert.ok(path.some((p) => p[0] === 0), 'pasa por la calle');
  for (let i = 1; i < path.length; i++) assert.ok(!near(path[i], path[i - 1]), 'sin puntos repetidos');
  assert.deepEqual(streetPoint([5, 1.6, -3]), [0, 1.6, -3]);
});

test('cambiar de destino a mitad de camino sale desde donde está (sin saltar)', () => {
  const first = pathBetween(spot('vias').position, spot('tunel'));
  const middle = poseAlong(first, spot('vias').look, spot('tunel').look, 0.4).position;
  const second = pathBetween(middle, spot('galpon'));
  assert.ok(near(second[0], middle));
});

test('la caminata dura entre 1,5 y 3 segundos; con movimiento reducido no hay caminata', () => {
  const short = pathBetween(spot('vias').position, spot('galpon'));
  const long = pathBetween(spot('vias').position, spot('tunel'));
  for (const path of [short, long]) {
    const s = walkDuration(path);
    assert.ok(s >= 1.5 && s <= 3, String(s));
  }
  assert.ok(walkDuration(long) >= walkDuration(short));
  assert.equal(walkDuration(long, { reducedMotion: true }), 0);
});

test('la pose empieza en el origen, termina en el lugar mirando lo suyo, y el balanceo se apaga en las puntas', () => {
  const path = pathBetween(spot('vias').position, spot('entrada'));
  const start = poseAlong(path, spot('vias').look, spot('entrada').look, 0);
  const end = poseAlong(path, spot('vias').look, spot('entrada').look, 1);
  assert.ok(near(start.position, path[0]));
  assert.ok(near(end.position, spot('entrada').position));
  assert.ok(near(end.target, spot('entrada').look));
  assert.ok(near(start.target, spot('vias').look));
});

test('mirar alrededor tiene límite: 35° a los lados y 15° arriba o abajo', () => {
  const { yaw, pitch } = clampLook(1, -1);
  assert.ok(Math.abs(yaw - (35 * Math.PI) / 180) < 1e-9);
  assert.ok(Math.abs(pitch + (15 * Math.PI) / 180) < 1e-9);
  const s = spot('casa');
  assert.ok(near(lookTarget(s, 0, 0), s.look, 1e-6));
  const turned = lookTarget(s, 0.3, 0);
  assert.ok(!near(turned, s.look, 1e-3));
});

test('las teclas 1 a 5 eligen un lugar', () => {
  assert.equal(spotForKey('3', DISTRICT12.spots), 'casa');
  assert.equal(spotForKey('1', DISTRICT12.spots), 'vias');
  assert.equal(spotForKey('9', DISTRICT12.spots), null);
  assert.equal(spotForKey('a', DISTRICT12.spots), null);
});
