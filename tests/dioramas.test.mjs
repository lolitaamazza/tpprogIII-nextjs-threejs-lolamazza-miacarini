import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTally, tally, fishPosition, fishInNet, nearestFish } from '../components/stage/dioramas/logic.js';

test('tally avanza y completa una sola vez', () => {
  let s = createTally(3, false);
  let r = tally(s, 1); s = r.state;
  assert.deepEqual(s, { count: 1, total: 3, done: false });
  assert.equal(r.justCompleted, false);
  r = tally(s, 5); s = r.state;
  assert.deepEqual(s, { count: 3, total: 3, done: true });
  assert.equal(r.justCompleted, true);
  r = tally(s, 1);
  assert.equal(r.justCompleted, false, 'ya completo no vuelve a disparar');
  assert.equal(r.state, s);
});

test('createTally completado arranca lleno', () => {
  assert.deepEqual(createTally(8, true), { count: 8, total: 8, done: true });
});

test('los peces se mueven dentro del agua', () => {
  for (let i = 0; i < 5; i++) {
    for (const t of [0, 1.3, 7.9]) {
      const p = fishPosition(i, t, { x: 0.15, z: 0.15 });
      assert.ok(Math.hypot(p.x - 0.15, p.z - 0.15) < 0.6, `pez ${i} en t=${t}`);
    }
  }
  assert.notDeepEqual(fishPosition(0, 0), fishPosition(0, 1));
});

test('red atrapa los peces dentro del radio y no los ya atrapados', () => {
  const fish = [
    { index: 0, x: 0, z: 0, caught: false },
    { index: 1, x: 0.2, z: 0, caught: false },
    { index: 2, x: 0.05, z: 0.05, caught: true },
    { index: 3, x: 1, z: 1, caught: false },
  ];
  assert.deepEqual(fishInNet(fish, { x: 0, z: 0 }, 0.3), [0, 1]);
  assert.equal(nearestFish(fish, { x: 0.9, z: 0.9 }), 3);
  assert.equal(nearestFish(fish.map((f) => ({ ...f, caught: true })), { x: 0, z: 0 }), null);
});
